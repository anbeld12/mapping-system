import React, { useEffect, useState } from 'react';
import { useToast } from '../hooks/use-toast';
import { 
  ChevronUp, 
  ChevronDown, 
  Pause, 
  Play, 
  Undo, 
  MapPin, 
  RotateCcw, 
  CheckCircle2, 
  Ruler,
  AlertCircle,
  Activity
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const GpsWalker = ({ 
  walk, 
  sensors,
  onFinish, 
  onCloseHere, 
  manualMode, 
  setManualMode,
  stepLength,
  onCalibrate,
  isExpanded,
  setIsExpanded
}) => {
  const { toast } = useToast();
  const { 
    currentPosition, 
    path, 
    isPaused, 
    isWatching,
    togglePause, 
    undoLastPoint, 
    reset,
    totalDistance,
    error,
    startWatch,
  } = walk;

  const { stepCount } = sensors;
  const isDrActive = currentPosition?.accuracy > 30;

  const [nearStart, setNearStart] = useState(false);
  const [showCalib, setShowCalib] = useState(false);
  const [calibSteps, setCalibSteps] = useState(0);

  const calculateDistance = (p1, p2) => {
    const R = 6371e3;
    const φ1 = (p1[0] * Math.PI) / 180;
    const φ2 = (p2[0] * Math.PI) / 180;
    const Δφ = ((p2[0] - p1[0]) * Math.PI) / 180;
    const Δλ = ((p2[1] - p1[1]) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  useEffect(() => {
    if (path.length > 2 && currentPosition) {
      const start = path[0];
      const dist = calculateDistance(start, [currentPosition.lat, currentPosition.lng]);
      setNearStart(dist < 15);
    } else {
      setNearStart(false);
    }
  }, [path, currentPosition]);

  const startCalibration = () => {
    setCalibSteps(stepCount);
    setShowCalib(true);
  };

  const finishCalibration = () => {
    const delta = stepCount - calibSteps;
    if (delta > 0) {
      onCalibrate(10, delta);
      toast({ title: "Calibración finalizada", description: `${delta} pasos en 10m. Longitud: ${(10 / delta).toFixed(2)}m` });
    }
    setShowCalib(false);
  };

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <div className="flex flex-col w-full text-slate-800">
      {/* Header / Toggle */}
      <div 
        className="flex items-center justify-between px-4 py-2 border-b border-blue-50 cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-2">
          <Badge variant={error ? "destructive" : (isPaused ? "secondary" : "default")} className="h-5 px-1.5 animate-pulse">
            {isPaused ? "PAUSADO" : "ACTIVO"}
          </Badge>
          {!isExpanded && (
            <div className="flex items-center gap-3 text-sm font-medium">
              <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5 text-blue-500" /> {totalDistance.toFixed(1)}m</span>
              <span className="flex items-center gap-1 text-slate-500"><MapPin className="w-3.5 h-3.5" /> {path.length} pts</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!isExpanded && (
            <Button 
              size="icon" 
              variant="ghost" 
              className={`h-8 w-8 rounded-full ${isPaused ? 'text-emerald-600' : 'text-amber-600'}`}
              onClick={(e) => { e.stopPropagation(); togglePause(); }}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400">
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[60vh] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-4 space-y-4 overflow-y-auto no-scrollbar">
          {!isWatching && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Esperando activar GPS o permisos. Presiona "Reintentar GPS".</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center">
              <span className="text-xl font-bold text-blue-600">{path.length}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Puntos</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center">
              <span className="text-xl font-bold text-blue-600">{totalDistance.toFixed(1)}m</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Distancia</span>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 flex flex-col items-center">
              <span className="text-xl font-bold text-emerald-600">{stepCount}</span>
              <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Pasos</span>
            </div>
          </div>

          {isDrActive && (
            <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-lg flex items-center gap-2 text-xs text-blue-700">
              <Activity className="w-4 h-4" />
              <span className="font-medium">Modo: Estimación por Pasos (GPS Débil)</span>
            </div>
          )}

          {currentPosition?.accuracy > 20 && !isDrActive && (
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex items-center gap-2 text-xs text-slate-600">
              <AlertCircle className="w-4 h-4" />
              <span>Precisión baja: {currentPosition.accuracy.toFixed(1)}m</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 p-2.5 rounded-lg flex items-center gap-2 text-xs text-red-600 font-medium font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse shrink-0" />
              Error: {error}
            </div>
          )}

          {nearStart && (
            <Button variant="outline" className="w-full border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 gap-2 h-11" onClick={onCloseHere}>
              <MapPin className="w-4 h-4" /> Cerrar cuadra aquí
            </Button>
          )}

          <div className="grid grid-cols-2 gap-2 pb-2">
            {!showCalib ? (
              <Button variant="outline" className="col-span-2 gap-2 h-10 text-xs" onClick={startCalibration}>
                <Ruler className="w-4 h-4" /> Calibrar Paso (10m)
              </Button>
            ) : (
              <Button variant="outline" className="col-span-2 gap-2 h-11 bg-emerald-50 border-emerald-200 text-emerald-700 animate-pulse font-bold" onClick={finishCalibration}>
                <CheckCircle2 className="w-4 h-4" /> Finalizar 10m ({stepCount - calibSteps} pasos)
              </Button>
            )}

            <Button 
              variant={isPaused ? "secondary" : "outline"} 
              className={`gap-2 h-12 font-medium ${isPaused ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`} 
              onClick={togglePause}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? 'Reanudar' : 'Pausar'}
            </Button>

            <Button variant="outline" className="gap-2 h-12 text-slate-600" onClick={undoLastPoint} disabled={path.length === 0}>
              <Undo className="w-4 h-4" /> Deshacer
            </Button>

            <Button 
              variant={manualMode ? "default" : "outline"} 
              className="gap-2 h-12" 
              onClick={() => setManualMode(!manualMode)}
            >
              <MapPin className="w-4 h-4" /> {manualMode ? 'Clic activo' : 'Punto manual'}
            </Button>

            <Button variant="ghost" className="gap-2 h-12 text-red-600 hover:bg-red-50 hover:text-red-700 font-medium" onClick={reset}>
               <RotateCcw className="w-4 h-4" /> Reiniciar
            </Button>

            <Button 
              className="col-span-2 h-12 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 text-base shadow-lg shadow-blue-200/50" 
              onClick={onFinish} 
              disabled={path.length < 3}
            >
              <CheckCircle2 className="w-5 h-5" /> Finalizar y procesar
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Handle if expanded */}
      {isExpanded && (
        <div className="h-1.5 w-12 bg-slate-200 rounded-full mx-auto my-2 shrink-0 md:hidden" onClick={toggleExpand} />
      )}
    </div>
  );
};

export default GpsWalker;
