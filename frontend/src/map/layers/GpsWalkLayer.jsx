import { Polyline, Circle, Marker } from "react-leaflet";
import L from "leaflet";

const GpsWalkLayer = ({ path, currentPosition, mode }) => {
  if (mode !== "gps") return null;

  return (
    <>
      {path.length > 0 && (
        <>
          <Polyline positions={path} color="#007bff" weight={3} />
          {currentPosition && (
            <Polyline
              positions={[path[path.length - 1], [currentPosition.lat, currentPosition.lng]]}
              color="#007bff"
              weight={2}
              dashArray="5, 5"
            />
          )}
        </>
      )}

      {currentPosition && (
        <>
          <Circle
            center={[currentPosition.lat, currentPosition.lng]}
            radius={currentPosition.accuracy}
            pathOptions={{ fillColor: "#007bff", fillOpacity: 0.1, color: "#007bff", weight: 1 }}
          />
          <Marker
            position={[currentPosition.lat, currentPosition.lng]}
            icon={L.divIcon({
              className: "user-pos-marker",
              html: `
                <div class="user-pos-icon" style="width: 16px; height: 16px;">
                  ${currentPosition.heading ? `<div class="heading-cone" style="transform: rotate(${currentPosition.heading}deg)"></div>` : ""}
                </div>
              `,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          />
        </>
      )}
    </>
  );
};

export default GpsWalkLayer;
