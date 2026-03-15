import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import GpsWalker from "../GpsWalker";
import { useUIState } from "../../context/UIStateContext";

const GpsWalkCard = ({ walk, sensors, isExpanded, setIsExpanded, ...props }) => {
  const { mode } = useUIState();
  if (mode !== "gps") return null;

  return (
    <div className={`pointer-events-auto fixed left-1/2 -translate-x-1/2 w-[95vw] max-w-sm z-[45] transition-all duration-300 ${isExpanded ? 'bottom-0' : 'bottom-6'} md:absolute md:top-6 md:right-6 md:left-auto md:bottom-auto md:transform-none md:w-80 shadow-lg pb-[env(safe-area-inset-bottom)]`}>
      <Card className="shadow-lg border border-blue-100 bg-white/95 backdrop-blur-md p-0 overflow-hidden">
        <CardContent className="p-0">
          <GpsWalker walk={walk} sensors={sensors} isExpanded={isExpanded} setIsExpanded={setIsExpanded} {...props} />
        </CardContent>
      </Card>
    </div>
  );
};

export default GpsWalkCard;