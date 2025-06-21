import { useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different types
const icons = {
  disaster: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  resource: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })
};

const MapView = ({ disasters, resources, center = [40.7128, -74.0060], zoom = 12 }) => {
  useEffect(() => {
    // Trigger resize event after map is loaded to fix rendering issues
    const resizeEvent = window.document.createEvent('UIEvents');
    resizeEvent.initUIEvent('resize', true, false, window, 0);
    window.dispatchEvent(resizeEvent);
  }, []);

  return (
    <Box 
      height="500px" 
      width="100%" 
      borderRadius="lg" 
      overflow="hidden"
      borderWidth="1px"
      borderColor="gray.700"
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {disasters && disasters.map(disaster => {
          if (!disaster.location?.coordinates) return null;
          const [longitude, latitude] = disaster.location.coordinates;
          
          return (
            <div key={disaster.id}>
              <Marker
                position={[latitude, longitude]}
                icon={icons.disaster}
              >
                <Popup>
                  <div>
                    <h3>{disaster.title}</h3>
                    <p>{disaster.description}</p>
                    <p>Priority: {disaster.priority}</p>
                  </div>
                </Popup>
              </Marker>
              <Circle
                center={[latitude, longitude]}
                radius={5000}
                pathOptions={{
                  color: 'red',
                  fillColor: 'red',
                  fillOpacity: 0.1
                }}
              />
            </div>
          );
        })}

        {resources && resources.map(resource => {
          if (!resource.location?.coordinates) return null;
          const [longitude, latitude] = resource.location.coordinates;
          
          return (
            <Marker
              key={resource.id}
              position={[latitude, longitude]}
              icon={icons.resource}
            >
              <Popup>
                <div>
                  <h3>{resource.name}</h3>
                  <p>Type: {resource.type}</p>
                  <p>Location: {resource.location_name}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </Box>
  );
};

export default MapView; 