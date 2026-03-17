import React, { useEffect, useState } from 'react';
import { useToast } from '../hooks/use-toast';
import { ChevronUp } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import { Pause } from 'lucide-react';
import { Play } from 'lucide-react';
import { Undo } from 'lucide-react';
import { MapPin } from 'lucide-react';
import { RotateCcw } from 'lucide-react';
import { CheckCircle2 } from 'lucide-react';
import { Ruler } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { Activity } from 'lucide-react';
import { Maximize2 } from 'lucide-react';
import { Minimize2 } from 'lucide-react';
import { Spline } from 'lucide-react';
import { LineChart } from 'lucide-react';
import { Home } from 'lucide-react';
import { Layout } from 'lucide-react';
import { RectangleHorizontal } from 'lucide-react';
import { ArrowRightLeft } from 'lucide-react';
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
    walkMode,
    setWalkMode,
    handleAnchorPoint,
    anchors,
    segments,
    isMappingHouse,
    currentHouse,
    housesInWalk,
    startMappingHouse,
    finishMappingHouse,
    toggleHouseType
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
    <div className={`relative w-full bg-white transition-all duration-500 ease-in-out ${isExpanded ? 'h-[75dvh]' : 'h-28'}`}>
      {/* Mobile Handle / Expand Area */}
      <div 
        className="flex flex-col items-center pt-2 pb-1 cursor-pointer"
        onClick={toggleExpand}
      >
        <div className="h-1.5 w-12 bg-slate-200 rounded-full mb-2" />
      </div>

      {/* Header Info (Always Visible) */}
      <div className="flex items-center justify-between px-6 pb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalDistance.toFixed(1)}m</span>
            <Badge variant={error ? "destructive" : (isPaused ? "secondary" : "default")} className="h-5 px-1.5 animate-pulse text-[10px]">
              {isPaused ? "PAUSADO" : "EN VIVO"}
            </Badge>
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{anchors.length} ANCLAJES · {segments.length} TRAMOS</span>
        </div>

        <div className="flex gap-2">
          {!isExpanded && (
            <Button 
                className="h-12 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 flex gap-2"
                onClick={(e) => { e.stopPropagation(); handleAnchorPoint(); }}
            >
              <MapPin className="w-5 h-5" />
              ANCLAR
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-10 w-10 text-slate-400 rounded-full" onClick={toggleExpand}>
            {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      <div className={`px-6 pb-8 space-y-6 overflow-y-auto no-scrollbar transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        
        {/* Walk Mode Selector */}
        <div className="space-y-3 pt-4">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Modo de Trayectoria</label>
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-2xl">
            <button 
              onClick={() => setWalkMode('RECTA')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-sm ${walkMode === 'RECTA' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
              <Ruler className="w-4 h-4" /> RECTA
            </button>
            <button 
              onClick={() => setWalkMode('CURVA')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-sm ${walkMode === 'CURVA' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
              <Spline className="w-4 h-4" /> CURVA
            </button>
          </div>
        </div>

        {/* Action Button (Large) */}
        <Button 
          className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-xl shadow-blue-200 flex gap-3 transition-transform active:scale-95"
          onClick={handleAnchorPoint}
        >
          <MapPin className="w-6 h-6" /> ANCLAR PUNTO / ESQUINA
        </Button>

        {/* Property Mapping Section */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mapeo de Predios</label>
            {isMappingHouse && (
              <Badge className="bg-emerald-500 animate-pulse">GRABANDO</Badge>
            )}
          </div>
          
          {!isMappingHouse ? (
            <Button 
              className="w-full h-14 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-100 flex gap-3"
              onClick={() => startMappingHouse('FRONTAL', '')}
              disabled={isPaused}
            >
              <Home className="w-5 h-5" /> 🏠 INICIAR PREDIO
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline"
                  className={`h-12 rounded-xl font-bold flex gap-2 ${currentHouse?.type === 'FRONTAL' ? 'bg-white border-blue-500 text-blue-600' : 'bg-slate-100 text-slate-500'}`}
                  onClick={toggleHouseType}
                >
                  <RectangleHorizontal className="w-4 h-4" /> FACHADA
                </Button>
                <Button 
                  variant="outline"
                  className={`h-12 rounded-xl font-bold flex gap-2 ${currentHouse?.type === 'ANCHO' ? 'bg-white border-orange-500 text-orange-600' : 'bg-slate-100 text-slate-500'}`}
                  onClick={toggleHouseType}
                >
                  <ArrowRightLeft className="w-4 h-4" /> LATERAL
                </Button>
              </div>
              <Button 
                className="w-full h-14 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-100 flex gap-3"
                onClick={finishMappingHouse}
              >
                <Home className="w-5 h-5" /> FINALIZAR PREDIO
              </Button>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="text-slate-400 text-[10px] font-bold uppercase mb-1">Pasos Detectados</div>
            <div className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              {stepCount}
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="text-slate-400 text-[10px] font-bold uppercase mb-1">Metros / Paso</div>
            <div className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Ruler className="w-5 h-5 text-blue-500" />
              {stepLength.toFixed(2)}m
            </div>
          </div>
        </div>

        {/* Secondary Controls */}
        <div className="grid grid-cols-2 gap-3 pt-2">
            <Button 
              variant={isPaused ? "secondary" : "outline"} 
              className={`h-12 rounded-xl font-bold flex gap-2 ${isPaused ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`} 
              onClick={togglePause}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? 'REANUDAR' : 'PAUSAR'}
            </Button>

            <Button 
                variant="outline" 
                className="h-12 rounded-xl font-bold flex gap-2 text-slate-600 border-slate-200 bg-slate-50" 
                onClick={undoLastPoint}
                disabled={anchors.length === 0 && path.length === 0}
            >
              <Undo className="w-4 h-4" /> ↩️ DESHACER TRAMO
            </Button>

            <Button 
              variant={manualMode ? "default" : "outline"} 
              className="h-12 rounded-xl font-bold flex gap-2" 
              onClick={() => setManualMode(!manualMode)}
            >
              <MapPin className="w-4 h-4 text-slate-400" /> {manualMode ? 'TOUCH ACTIVO' : 'CLIC MANUAL'}
            </Button>

            <Button variant="ghost" className="h-12 rounded-xl font-bold flex gap-2 text-red-500 hover:bg-red-50" onClick={reset}>
               <RotateCcw className="w-4 h-4" /> REINICIAR
            </Button>
        </div>

        {/* Finalize Button */}
        <Button 
          className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black flex gap-3 shadow-lg shadow-emerald-100" 
          onClick={onFinish} 
          disabled={(anchors.length < 2 && path.length < 3) || isMappingHouse}
        >
          <CheckCircle2 className="w-5 h-5" /> FINALIZAR Y CERRAR
        </Button>

        {/* Calibration Link */}
        <button 
          className="w-full py-2 text-xs font-bold text-slate-400 hover:text-blue-500 transition-colors"
          onClick={() => setShowCalib(!showCalib)}
        >
          {showCalib ? 'OCULTAR CALIBRACIÓN' : 'CONFIGURAR CALIBRACIÓN DE PASO'}
        </button>

        {showCalib && (
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-blue-700 uppercase">Calibración Manual</span>
              <Badge variant="outline" className="bg-blue-100 border-blue-200 text-blue-700">10 METROS</Badge>
            </div>
            <Button 
              className="w-full h-12 rounded-xl bg-blue-600 font-bold"
              onClick={calibSteps === 0 ? startCalibration : finishCalibration}
            >
              {calibSteps === 0 ? 'INICIAR PRUEBA DE 10M' : `FINALIZAR (${stepCount - calibSteps} PASOS)`}
            </Button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GpsWalker;
