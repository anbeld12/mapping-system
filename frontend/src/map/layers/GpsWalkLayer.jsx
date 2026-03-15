import { Polyline, Circle, Marker } from "react-leaflet";
import L from "leaflet";

const GpsWalkLayer = ({ walk, mode }) => {
  const { path, currentPosition, anchors, segments, walkMode } = walk;
  if (mode !== "gps") return null;

  return (
    <>
      {/* 1. Capa Estática: Segmentos ya consolidados */}
      {segments.map((segment, idx) => (
        <Polyline 
            key={`segment-${idx}`}
            positions={segment.points} 
            color="#0066FF" 
            weight={4}
            opacity={0.8}
        />
      ))}

      {/* 2. Capa Elástica (Preview en tiempo real) */}
      {anchors.length > 0 && currentPosition && (
        <Polyline
            positions={
                walkMode === 'RECTA' 
                    ? [anchors[anchors.length - 1], [currentPosition.lat, currentPosition.lng]]
                    : [anchors[anchors.length - 1], ...path, [currentPosition.lat, currentPosition.lng]]
            }
            color="#0066FF"
            weight={3}
            dashArray="10, 10"
            opacity={0.6}
        />
      )}

      {/* Si es el primer punto y no hay anclajes aún, mostrar rastro temporal */}
      {anchors.length === 0 && path.length > 0 && currentPosition && (
        <Polyline 
            positions={[...path, [currentPosition.lat, currentPosition.lng]]} 
            color="#0066FF" 
            weight={3} 
            dashArray="10, 10"
            opacity={0.6}
        />
      )}

      {/* Marcadores de Anclaje */}
      {anchors.map((anchor, idx) => (
        <Circle
            key={`anchor-${idx}`}
            center={anchor}
            radius={1}
            pathOptions={{ fillColor: "#0066FF", fillOpacity: 1, color: "white", weight: 2 }}
        />
      ))}

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
                <div class="user-pos-icon" style="width: 16px; height: 16px; background: #0066FF; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,102,255,0.5);">
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
