/**
 * Read { latitude, longitude } from a location value returned by the API:
 * GeoJSON, WKT "POINT(lng lat)", hex EWKB or "(lng,lat)". Returns null if unknown.
 */
export function parsePoint(value) {
  if (!value) return null;
  if (typeof value === 'object' && Array.isArray(value.coordinates)) {
    return valid(value.coordinates[0], value.coordinates[1]);
  }
  if (typeof value !== 'string') return null;

  const wkt = value.match(/POINT\s*\(\s*(-?[\d.eE+-]+)\s+(-?[\d.eE+-]+)\s*\)/i);
  if (wkt) return valid(wkt[1], wkt[2]);
  const native = value.match(/^\(\s*(-?[\d.eE+-]+)\s*,\s*(-?[\d.eE+-]+)\s*\)$/);
  if (native) return valid(native[1], native[2]);

  if (/^[0-9a-fA-F]{42,}$/.test(value)) {
    const bytes = new Uint8Array(value.match(/../g).map((h) => parseInt(h, 16)));
    const view = new DataView(bytes.buffer);
    const little = view.getUint8(0) === 1;
    const type = view.getUint32(1, little);
    if ((type & 0xff) !== 1) return null;
    const offset = type & 0x20000000 ? 9 : 5;
    if (bytes.length < offset + 16) return null;
    return valid(view.getFloat64(offset, little), view.getFloat64(offset + 8, little));
  }
  return null;
}

function valid(lng, lat) {
  const longitude = Number(lng);
  const latitude = Number(lat);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}
