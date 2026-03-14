import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import GpsWalker from "../GpsWalker";
import { useUIState } from "../../context/UIStateContext";

const GpsWalkCard = ({ walk, sensors, ...props }) => {
  const { mode } = useUIState();
  if (mode !== "gps") return null;

  return (
    <div className="absolute top-20 right-4 z-[1000] max-w-sm w-[340px]">
      <Card className="shadow-lg border border-border/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Captura GPS</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <GpsWalker walk={walk} sensors={sensors} {...props} />
        </CardContent>
      </Card>
    </div>
  );
};

export default GpsWalkCard;