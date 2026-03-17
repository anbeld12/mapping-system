import { useState, useEffect, useCallback, useRef } from 'react';
import * as turf from '@turf/turf';

export const useGpsWalk = () => {
  const [currentPosition, setCurrentPosition] = useState(null); // { lat, lng, accuracy, heading }
  const [path, setPath] = useState([]); // Array of [lat, lng] (temporal para segmento actual)
  const [anchors, setAnchors] = useState([]); // Array of [lat, lng] (puntos confirmados)
  const [segments, setSegments] = useState([]); // Array of { type: 'RECTA' | 'CURVA', points: [[lat, lng], ...] }
  const [walkMode, setWalkMode] = useState('RECTA'); // 'RECTA' or 'CURVA'
  const [isWatching, setIsWatching] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMappingHouse, setIsMappingHouse] = useState(false);
  const [currentHouse, setCurrentHouse] = useState(null); // { startPathIdx, type, houseNumber }
  const [housesInWalk, setHousesInWalk] = useState([]); // Array of { tipo, geom, numero_casa }
  const [error, setError] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0);
  
  const watchId = useRef(null);
  const lastPointRef = useRef(null);
  // Ref para que el callback de watchPosition siempre lea el valor actual de isPaused,
  // evitando el problema de closure obsoleto sobre el estado de React.
  const isPausedRef = useRef(false);

  const calculateDistance = (p1, p2) => {
    if (!p1 || !p2) return 0;
    const from = turf.point([p1[1], p1[0]]);
    const to = turf.point([p2[1], p2[0]]);
    return turf.distance(from, to, { units: 'meters' });
  };

  const lastFilteredPosRef = useRef(null);

  const filterSignal = useCallback((newPos) => {
    if (!lastFilteredPosRef.current) {
      lastFilteredPosRef.current = newPos;
      return newPos;
    }

    const last = lastFilteredPosRef.current;
    
    // 1. Inercia / Glitch Protection
    const dist = calculateDistance([last.lat, last.lng], [newPos.lat, newPos.lng]);
    
    if (dist > 100 && newPos.accuracy > 10) {
        return last;
    }

    // 2. Confianza por Precisión (Weighted EMA)
    let weight = 0.3;
    
    if (newPos.accuracy > 25) {
        weight = 0.1;
    } else if (newPos.accuracy > 50) {
        weight = 0.05;
    }

    const filteredLat = last.lat * (1 - weight) + newPos.lat * weight;
    const filteredLng = last.lng * (1 - weight) + newPos.lng * weight;

    const filtered = { ...newPos, lat: filteredLat, lng: filteredLng };
    lastFilteredPosRef.current = filtered;
    return filtered;
  }, []);


  const startWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsWatching(true);
    setIsPaused(false);
    isPausedRef.current = false;
    setPath([]);
    setTotalDistance(0);
    lastPointRef.current = null;
    lastFilteredPosRef.current = null;

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading } = pos.coords;
        const rawPos = { lat: latitude, lng: longitude, accuracy, heading };
        
        // Aplicar filtrado antes de procesar
        const filteredPos = filterSignal(rawPos);
        
        setCurrentPosition(filteredPos);
        setError(null);

        if (isPausedRef.current) return;

        // Filtering: don't add points if distance from last point < 2m
        if (lastPointRef.current) {
          const dist = calculateDistance([lastPointRef.current.lat, lastPointRef.current.lng], [filteredPos.lat, filteredPos.lng]);
          if (dist < 2) return;
          setTotalDistance(prev => prev + dist);
        }

        const point = [filteredPos.lat, filteredPos.lng];
        setPath((prev) => [...prev, point]);
        lastPointRef.current = filteredPos;
      },
      (err) => {
        setError(err.message);
        setIsPaused(true);
        isPausedRef.current = true;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [filterSignal]);

  const stopWatch = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsWatching(false);
    setIsPaused(false);
    isPausedRef.current = false;
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused(prev => {
      const newVal = !prev;
      isPausedRef.current = newVal;
      return newVal;
    });
  }, []);

  const handleAnchorPoint = useCallback(() => {
    if (!currentPosition) return;

    // Feedback Háptico
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    const newAnchor = [currentPosition.lat, currentPosition.lng];
    
    setAnchors(prev => [...prev, newAnchor]);

    if (anchors.length > 0) {
      const lastAnchor = anchors[anchors.length - 1];
      let segmentPoints = [];

      if (walkMode === 'CURVA') {
        // En modo CURVA, usamos el rastro real (path) acumulado
        // Aseguramos que empiece en el último anclaje y termine en el nuevo
        segmentPoints = [lastAnchor, ...path, newAnchor];
      } else {
        // En modo RECTA, ignoramos intermedios y tiramos línea pura
        segmentPoints = [lastAnchor, newAnchor];
      }

      setSegments(prev => [...prev, { type: walkMode, points: segmentPoints }]);
    }

    // Limpiar path temporal para el siguiente segmento
    setPath([]);
    lastPointRef.current = currentPosition;
  }, [currentPosition, path, anchors, walkMode]);

  const undoLastPoint = useCallback(() => {
    // Feedback Háptico distintivo para Deshacer
    if (navigator.vibrate) {
      navigator.vibrate([30, 30, 30]);
    }

    // 1. Si hay rastro temporal (path), lo limpiamos primero
    if (path.length > 0) {
      setPath([]);
      // Reposicionar al último anclaje si existe
      if (anchors.length > 0) {
        const lastA = anchors[anchors.length - 1];
        lastPointRef.current = { lat: lastA[0], lng: lastA[1] };
      } else {
        lastPointRef.current = null;
      }
      return;
    }

    // 2. Si no hay path, deshacer el último segmento y el último anclaje
    if (anchors.length > 0) {
      setSegments(prev => prev.slice(0, -1));
      setAnchors(prev => {
        const newAnchors = prev.slice(0, -1);
        const lastA = newAnchors.length > 0 ? newAnchors[newAnchors.length - 1] : null;
        if (lastA) {
          lastPointRef.current = { lat: lastA[0], lng: lastA[1] };
        } else {
          lastPointRef.current = null;
        }
        return newAnchors;
      });
    }
  }, [path, anchors]);

  const addManualPoint = useCallback((lat, lng) => {
    const point = [lat, lng];
    if (lastPointRef.current) {
        const dist = calculateDistance([lastPointRef.current.lat, lastPointRef.current.lng], [lat, lng]);
        setTotalDistance(prev => prev + dist);
    }
    setPath(prev => [...prev, point]);
    lastPointRef.current = { lat, lng };
  }, []);

  const addDrPoint = useCallback((lat, lng) => {
    const point = [lat, lng];
    // For DR, we don't strictly filter by distance like GPS because 
    // it's already triggered by step accumulation
    if (lastPointRef.current) {
        const dist = calculateDistance([lastPointRef.current.lat, lastPointRef.current.lng], [lat, lng]);
        setTotalDistance(prev => prev + dist);
    }
    setPath(prev => [...prev, point]);
    lastPointRef.current = { lat, lng };
  }, []);

  const startMappingHouse = useCallback((type = 'FRONTAL', houseNumber = '') => {
    if (!isWatching || isPaused) return;
    
    // Feedback Háptico: 1 pulso largo (100ms)
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    setIsMappingHouse(true);
    setCurrentHouse({
      startPathIdx: path.length,
      type,
      houseNumber
    });
  }, [isWatching, isPaused, path.length]);

  const toggleHouseType = useCallback(() => {
    setCurrentHouse(prev => {
      if (!prev) return null;
      return { ...prev, type: prev.type === 'FRONTAL' ? 'ANCHO' : 'FRONTAL' };
    });
  }, []);

  const finishMappingHouse = useCallback(() => {
    if (!isMappingHouse || !currentHouse) return;

    // Feedback Háptico: 2 pulsos cortos
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50, 50]);
    }

    // Extraer puntos del rastro actual (path) para el lindero
    // Empezamos desde startPathIdx hasta el punto actual
    const housePoints = path.slice(currentHouse.startPathIdx);
    
    // Si no hay suficientes puntos en el path (ej: se detuvo justo al empezar), 
    // al menos usamos la posición actual si existe
    if (housePoints.length < 2 && currentPosition) {
        // Podríamos manejar esto mejor, pero por ahora aseguramos integridad
    }

    if (housePoints.length >= 2) {
      const houseGeom = {
        type: 'LineString',
        coordinates: housePoints.map(p => [p[1], p[0]]) // [lng, lat]
      };

      setHousesInWalk(prev => [...prev, {
        tipo: currentHouse.type,
        geom: houseGeom,
        numero_casa: currentHouse.houseNumber
      }]);
    }

    setIsMappingHouse(false);
    setCurrentHouse(null);
  }, [isMappingHouse, currentHouse, path, currentPosition]);

  const reset = useCallback(() => {
    setPath([]);
    setAnchors([]);
    setSegments([]);
    setHousesInWalk([]);
    setIsMappingHouse(false);
    setCurrentHouse(null);
    setTotalDistance(0);
    setIsPaused(false);
    isPausedRef.current = false;
    lastPointRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  return {
    currentPosition,
    path,
    anchors,
    segments,
    walkMode,
    setWalkMode,
    isWatching,
    isPaused,
    isMappingHouse,
    currentHouse,
    housesInWalk,
    error,
    totalDistance,
    startWatch,
    stopWatch,
    togglePause,
    undoLastPoint,
    handleAnchorPoint,
    startMappingHouse,
    finishMappingHouse,
    toggleHouseType,
    addManualPoint,
    addDrPoint,
    reset
  };
};
