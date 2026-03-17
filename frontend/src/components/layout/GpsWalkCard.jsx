import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import GpsWalker from "../GpsWalker";
import { useUIState } from "../../context/UIStateContext";

const GpsWalkCard = ({ walk, sensors, isExpanded, setIsExpanded, ...props }) => {
  const { mode } = useUIState();
  const { isWatching } = walk;

  // Renderizar si estamos en modo GPS o si hay una sesión activa incluso si cambiamos de modo temporalmente
  if (mode !== "gps" && mode !== "preview" && mode !== "subdivision" && !isWatching) return null;

  return (
    <div className={`pointer-events-auto fixed left-1/2 -translate-x-1/2 w-full max-w-md z-[9999] transition-all duration-500 ${isExpanded ? 'bottom-0' : 'bottom-0'} md:absolute md:top-6 md:right-6 md:left-auto md:bottom-auto md:transform-none md:w-80 shadow-2xl pb-[env(safe-area-inset-bottom)]`}>
      <div className="bg-white/95 backdrop-blur-md rounded-t-3xl md:rounded-3xl border border-blue-100 overflow-hidden shadow-2xl">
        <GpsWalker walk={walk} sensors={sensors} isExpanded={isExpanded} setIsExpanded={setIsExpanded} {...props} />
      </div>
    </div>
  );
};

export default GpsWalkCard;