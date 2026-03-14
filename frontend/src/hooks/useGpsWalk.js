import { useState, useEffect, useCallback, useRef } from 'react';
import * as turf from '@turf/turf';

export const useGpsWalk = () => {
  const [currentPosition, setCurrentPosition] = useState(null); // { lat, lng, accuracy, heading }
  const [path, setPath] = useState([]); // Array of [lat, lng]
  const [isWatching, setIsWatching] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
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

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading } = pos.coords;
        const newPos = { lat: latitude, lng: longitude, accuracy, heading };
        setCurrentPosition(newPos);
        setError(null);

        // Usar la ref en lugar del estado para evitar el closure obsoleto
        if (isPausedRef.current) return;

        // Filtering: don't add points if distance from last point < 2m
        if (lastPointRef.current) {
          const dist = calculateDistance([lastPointRef.current.lat, lastPointRef.current.lng], [latitude, longitude]);
          if (dist < 2) return;
          setTotalDistance(prev => prev + dist);
        }

        const point = [latitude, longitude];
        setPath((prev) => [...prev, point]);
        lastPointRef.current = newPos;
      },
      (err) => {
        setError(err.message);
        // Auto-pause on signal loss or error
        setIsPaused(true);
        isPausedRef.current = true;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  // startWatch ya no depende de isPaused gracias a la ref
  }, []);

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

  const undoLastPoint = useCallback(() => {
    setPath(prev => {
      if (prev.length <= 1) {
        setTotalDistance(0);
        lastPointRef.current = null;
        return [];
      }
      const newPath = prev.slice(0, -1);
      const lastPoint = newPath[newPath.length - 1];
      lastPointRef.current = { lat: lastPoint[0], lng: lastPoint[1] };
      
      // Recalculate total distance (simplification for undo)
      let d = 0;
      for (let i = 0; i < newPath.length - 1; i++) {
        d += calculateDistance(newPath[i], newPath[i+1]);
      }
      setTotalDistance(d);
      
      return newPath;
    });
  }, []);

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

  const reset = useCallback(() => {
    setPath([]);
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
    isWatching,
    isPaused,
    error,
    totalDistance,
    startWatch,
    stopWatch,
    togglePause,
    undoLastPoint,
    addManualPoint,
    addDrPoint,
    reset
  };
};
