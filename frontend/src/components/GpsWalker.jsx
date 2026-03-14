import React, { useEffect, useState } from 'react';
import { useToast } from '../hooks/use-toast';
import '../styles/gpsWalker.css';

// Clase utilitaria para avisos dentro de Card
const Pill = ({ children, tone = 'info' }) => {
  const tones = {
    info: 'bg-blue-50 text-blue-800 border-blue-100',
    warn: 'bg-amber-50 text-amber-800 border-amber-100',
    danger: 'bg-red-50 text-red-800 border-red-100',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-100'
  };
  return (
    <div className={`text-xs border rounded-md px-2 py-1 ${tones[tone] || tones.info}`}>
      {children}
    </div>
  );
};

const GpsWalker = ({ 
  walk, 
  sensors,
  onFinish, 
  onCloseHere, 
  manualMode, 
  setManualMode,
  stepLength,
  onCalibrate
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
    // Basic Spherical Law of Cosines (for quick proximity check)
    const R = 6371e3; // meters
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
      onCalibrate(10, delta); // 10 meters constant
      toast({ title: "Calibración finalizada", description: `${delta} pasos en 10m. Longitud: ${(10 / delta).toFixed(2)}m` });
    }
    setShowCalib(false);
  };

  return (
    <div className="gps-walker-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>Captura GPS</h3>
        <span className={`gps-indicator ${error ? 'gps-indicator-error' : (isPaused ? 'gps-indicator-paused' : 'gps-indicator-active')}`} />
      </div>

      {!isWatching && (
        <div className="accuracy-warning">
          📡 Esperando activar GPS o permisos. Presiona "Reintentar GPS".
        </div>
      )}

      <div className="gps-stats">
        <div className="stat-item">
          <span className="stat-value">{path.length}</span>
          <span className="stat-label">Puntos</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{totalDistance.toFixed(1)}m</span>
          <span className="stat-label">Distancia</span>
        </div>
        <div className="stat-item" style={{ gridColumn: 'span 2', marginTop: '4px', background: 'rgba(46, 213, 115, 0.05)' }}>
          <span className="stat-value" style={{ color: '#2ed573' }}>{stepCount}</span>
          <span className="stat-label">Pasos Detectados</span>
        </div>
      </div>

      {isDrActive && (
        <div className="accuracy-warning">
          🔄 Modo: Estimación por Pasos (GPS Débil)
        </div>
      )}

      {currentPosition?.accuracy > 20 && !isDrActive && (
        <div className="accuracy-warning">
          ⚠️ Precisión baja: {currentPosition.accuracy.toFixed(1)}m
        </div>
      )}

      {error && <div className="accuracy-warning error">❌ Error: {error}</div>}

      {!isWatching && (
        <button
          className="gps-btn gps-btn-primary"
          onClick={startWatch}
          style={{ gridColumn: 'span 2', marginBottom: '8px' }}
        >
          🔁 Reintentar GPS
        </button>
      )}

      {nearStart && (
        <button className="gps-btn gps-btn-success closure-suggestion" onClick={onCloseHere}>
          📍 Cerrar cuadra aquí
        </button>
      )}

      <div className="gps-controls">
        {!showCalib ? (
            <button className="gps-btn gps-btn-secondary" onClick={startCalibration} style={{ gridColumn: 'span 2' }}>
                📏 Calibrar Paso (Caminar 10m)
            </button>Finalizar
        ) : (
            <button className="gps-btn gps-btn-success pulse" onClick={finishCalibration} style={{ gridColumn: 'span 2' }}>
                🏁 Finalizar 10m ({stepCount - calibSteps} pasos)
            </button>
        )}

        <button 
          className={`gps-btn ${isPaused ? 'gps-btn-success' : 'gps-btn-warning'}`} 
          onClick={togglePause}
        >
          {isPaused ? '▶️ Reanudar' : '⏸️ Pausar'}
        </button>
        
        <button className="gps-btn gps-btn-secondary" onClick={undoLastPoint} disabled={path.length === 0}>
          ↩️ Deshacer
        </button>

        <button 
          className={`gps-btn ${manualMode ? 'gps-btn-primary' : 'gps-btn-secondary'}`} 
          onClick={() => setManualMode(!manualMode)}
        >
          {manualMode ? '🖱️ Clic activo' : '📍 Punto manual'}
        </button>

        <button className="gps-btn gps-btn-danger" onClick={reset}>
           🗑️ Reiniciar
        </button>

        <button 
          className="gps-btn gps-btn-primary" 
          onClick={onFinish} 
          disabled={path.length < 3}
          style={{ gridColumn: 'span 2', marginTop: '4px' }}
        >
          ✅ Finalizar y procesar
        </button>
      </div>
    </div>
  );
};

export default GpsWalker;
