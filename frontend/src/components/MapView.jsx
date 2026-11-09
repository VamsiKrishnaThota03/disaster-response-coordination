import { Fragment, useEffect } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { parsePoint } from '../lib/geo';

// Self-contained markers (no external icon images).
const pin = (kind) =>
  L.divIcon({
    className: '',
    html: `<div class="map-pin ${kind}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
const icons = { disaster: pin('disaster'), resource: pin('resource') };

// Leaflet measures its container once; inside an accordion/modal that size is
// 0 until the panel opens, so re-measure after mount and on container resize.
function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(el);
    const timer = setTimeout(() => map.invalidateSize(), 250);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [map]);
  return null;
}

const MapView = ({ disasters = [], resources = [], center, zoom = 11 }) => {
  const disasterPoints = disasters
    .filter(Boolean)
    .map((d) => ({ item: d, point: parsePoint(d.location) }))
    .filter((d) => d.point);
  const resourcePoints = resources
    .map((r) => ({ item: r, point: r.latitude != null ? { latitude: r.latitude, longitude: r.longitude } : parsePoint(r.location) }))
    .filter((r) => r.point);

  const fallback = disasterPoints[0]?.point || resourcePoints[0]?.point;
  const mapCenter = center || (fallback ? [fallback.latitude, fallback.longitude] : null);

  if (!mapCenter) {
    return (
      <Box py={8} textAlign="center" borderWidth="1px" borderStyle="dashed" borderColor="gray.600" borderRadius="lg">
        <Text color="gray.400" fontSize="sm">
          No coordinates yet: the location could not be geocoded.
        </Text>
      </Box>
    );
  }

  return (
    <Box height={{ base: '320px', md: '420px' }} width="100%" borderRadius="lg" overflow="hidden" borderWidth="1px" borderColor="gray.700">
      <MapContainer center={mapCenter} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <AutoResize />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {disasterPoints.map(({ item, point }) => (
          <Fragment key={item.id}>
            <Marker position={[point.latitude, point.longitude]} icon={icons.disaster}>
              <Popup>
                <strong>{item.title}</strong>
                <br />
                Priority: {item.priority}
              </Popup>
            </Marker>
            <Circle
              center={[point.latitude, point.longitude]}
              radius={5000}
              pathOptions={{ color: '#e53e3e', fillColor: '#e53e3e', fillOpacity: 0.08 }}
            />
          </Fragment>
        ))}

        {resourcePoints.map(({ item, point }) => (
          <Marker key={item.id} position={[point.latitude, point.longitude]} icon={icons.resource}>
            <Popup>
              <strong>{item.name}</strong>
              <br />
              {item.type} · {item.location_name}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Box>
  );
};

export default MapView;
