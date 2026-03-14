import { GeoJSON } from "react-leaflet";
import { stringToColor } from "../../utils/colorUtils";

const NeighborhoodLayer = ({ neighborhoods, selectedNeighborhoodId, onFeatureClick }) => {
  return (
    <>
      {neighborhoods.map((nb) => {
        const bgColor = stringToColor(nb.name || nb.id);
        return (
          <GeoJSON
            key={nb.id}
            data={nb.geometry || nb.geom}
            pathOptions={{
              color: selectedNeighborhoodId === nb.id ? "#9b59b6" : bgColor,
              fillColor: bgColor,
              fillOpacity: 0.1,
              weight: selectedNeighborhoodId === nb.id ? 4 : 2,
              dashArray: "5, 10",
            }}
            eventHandlers={{ click: (e) => onFeatureClick(e, nb, "neighborhood") }}
          />
        );
      })}
    </>
  );
};

export default NeighborhoodLayer;
