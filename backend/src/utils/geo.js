/**
 * Parse a point stored by Supabase/PostGIS into { latitude, longitude }.
 * Supports GeoJSON objects, WKT/EWKT strings ("SRID=4326;POINT(lng lat)"),
 * hex-encoded (E)WKB as returned by PostgREST for geography columns, and the
 * native Postgres point format "(lng,lat)". Returns null when unparseable.
 */
export function parsePoint(value) {
  if (!value) return null;

  if (typeof value === 'object') {
    const coords = value.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) return toLatLng(coords[0], coords[1]);
    if ('x' in value && 'y' in value) return toLatLng(value.x, value.y);
    return null;
  }

  if (typeof value !== 'string') return null;
  const str = value.trim();

  const wkt = str.match(/POINT\s*\(\s*(-?[\d.eE+-]+)\s+(-?[\d.eE+-]+)\s*\)/i);
  if (wkt) return toLatLng(Number(wkt[1]), Number(wkt[2]));

  const native = str.match(/^\(\s*(-?[\d.eE+-]+)\s*,\s*(-?[\d.eE+-]+)\s*\)$/);
  if (native) return toLatLng(Number(native[1]), Number(native[2]));

  if (/^[0-9a-fA-F]+$/.test(str) && str.length >= 42) return parseWkbHex(str);

  return null;
}

function parseWkbHex(hex) {
  const buf = Buffer.from(hex, 'hex');
  const little = buf.readUInt8(0) === 1;
  const readU32 = (o) => (little ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  const readF64 = (o) => (little ? buf.readDoubleLE(o) : buf.readDoubleBE(o));
  const type = readU32(1);
  const hasSrid = (type & 0x20000000) !== 0;
  if ((type & 0xff) !== 1) return null; // not a point
  const offset = hasSrid ? 9 : 5;
  if (buf.length < offset + 16) return null;
  return toLatLng(readF64(offset), readF64(offset + 8));
}

function toLatLng(lng, lat) {
  const longitude = Number(lng);
  const latitude = Number(lat);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

/** WKT point for inserts into a PostGIS geography column. */
export const toWktPoint = (latitude, longitude) => `POINT(${Number(longitude)} ${Number(latitude)})`;

/** Great-circle distance in metres. */
export function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
