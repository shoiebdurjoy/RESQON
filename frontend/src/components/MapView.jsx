import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const DEFAULT_CENTER  = { lat: 23.8103, lng: 90.4125 }; // Dhaka, Bangladesh

const containerStyle = {
  height: '420px',
  width:  '100%',
  borderRadius: '10px',
  border: '1px solid #E5E3DC',
};

export default function MapView({ requesterLocation, helpers = [], onLocationChange }) {
  const center = requesterLocation
    ? { lat: requesterLocation.lat, lng: requesterLocation.lng }
    : DEFAULT_CENTER;

  function handleMapClick(e) {
    if (onLocationChange) {
      onLocationChange(e.latLng.lat(), e.latLng.lng());
    }
  }

  function handleMarkerDrag(e) {
    if (onLocationChange) {
      onLocationChange(e.latLng.lat(), e.latLng.lng());
    }
  }

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_KEY}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={13}
        onClick={onLocationChange ? handleMapClick : undefined}
        options={{ disableDefaultUI: false, zoomControl: true }}
      >
        {requesterLocation && (
          <Marker
            position={{ lat: requesterLocation.lat, lng: requesterLocation.lng }}
            draggable={!!onLocationChange}
            onDragEnd={onLocationChange ? handleMarkerDrag : undefined}
            title="Your location"
          />
        )}

        {helpers.map((helper) => {
          const lat = Number(helper.latitude);
          const lng = Number(helper.longitude);
          if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
          return (
            <Marker
              key={helper.id}
              position={{ lat, lng }}
              title={helper.name}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
              }}
            />
          );
        })}
      </GoogleMap>
    </LoadScript>
  );
}