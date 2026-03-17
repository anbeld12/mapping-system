import { GeoJSON, Marker } from "react-leaflet";
import { stringToColor } from "../../utils/colorUtils";

const BlocksLayer = ({ 
  blocks, 
  houses, 
  selectedId, 
  onFeatureClick, 
  currentBlock, 
  mode, 
  divisionPoints, 
  setDivisionPoints 
}) => {
  return (
    <>
      {blocks.map((block) => (
        <GeoJSON
          key={block.id}
          data={block.geometry || block.geom}
          pathOptions={{
            color: selectedId === block.id ? "#e67e22" : block.neighborhood_id ? stringToColor(block.neighborhood_id) : "#3388ff",
            fillOpacity: 0.1,
            weight: selectedId === block.id ? 4 : 2,
          }}
          eventHandlers={{ click: (e) => onFeatureClick(e, block, "block") }}
        />
      ))}

      {houses.map((house) => (
        <GeoJSON
          key={house.id}
          data={house.geometry || house.geom}
          pathOptions={{
            color: selectedId === house.id ? "#e67e22" : "#28a745",
            fillOpacity: 0.4,
            weight: selectedId === house.id ? 3 : 1,
          }}
          eventHandlers={{ click: (e) => onFeatureClick(e, house, "house") }}
        />
      ))}

      {(mode === "subdivision" || mode === "preview") && currentBlock && (
        <>
          <GeoJSON
            data={currentBlock.geometry || currentBlock}
            pathOptions={{ color: "orange", fillOpacity: 0.2 }}
            eventHandlers={{
              add: (e) => {
                if (mode === "subdivision") e.target.pm.enable();
              },
            }}
          />
          {currentBlock.predios?.map((predio, idx) => (
             <GeoJSON
                key={`preview-predio-${idx}`}
                data={predio.geom}
                pathOptions={{
                  color: predio.tipo === 'FRONTAL' ? '#2ecc71' : '#e67e22',
                  weight: 4
                }}
             />
          ))}
        </>
      )}

      {divisionPoints?.map((pt, idx) => (
        <Marker
          key={idx}
          position={[pt[1], pt[0]]}
          draggable={mode === "subdivision"}
          eventHandlers={{
            dragend: (e) => {
              const newPos = e.target.getLatLng();
              setDivisionPoints((prev) => {
                const updated = [...prev];
                updated[idx] = [newPos.lng, newPos.lat];
                return updated;
              });
            },
          }}
        />
      ))}
    </>
  );
};

export default BlocksLayer;
