import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import GpsWalker from "../GpsWalker";
import { useUIState } from "../../context/UIStateContext";

const GpsWalkCard = ({ walk, sensors, ...props }) => {
  const { mode } = useUIState();
  if (mode !== "gps") return null;

  return (
    <div className="pointer-events-auto fixed bottom-6 left-1/2 -translate-x-1/2 w-[90vw] max-w-sm z-[45] md:absolute md:top-6 md:right-6 md:left-auto md:bottom-auto md:transform-none md:w-80 shadow-lg pb-[env(safe-area-inset-bottom)]">
      <Card className="shadow-lg border border-white/60 bg-white/90 backdrop-blur-md p-4 pb-6 sm:p-0">
        <CardHeader className="pb-2 px-0 sm:px-6">
          <CardTitle className="text-base flex justify-between items-center">
            Captura GPS
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-0 sm:px-6">
          <GpsWalker walk={walk} sensors={sensors} {...props} />
        </CardContent>
      </Card>
    </div>
  );
};

export default GpsWalkCard;