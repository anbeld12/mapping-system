import { useState, useEffect, useCallback, useRef } from 'react';
import * as turf from '@turf/turf';

export const useDeadReckoning = (currentPosition, steps, orientation, gpsBearing = null) => {
    const [drPoint, setDrPoint] = useState(null);
    const [isDrActive, setIsDrActive] = useState(false);
    const lastGpsPoint = useRef(null);
    const lastHeadingRef = useRef(0);
    const lastProcessedStep = useRef(0);
    const currentHeading = useRef(0);
    const [stepLength, setStepLength] = useState(0.75); // Meters

    // Update heading from orientation sensor, GPS bearing fallback, or last known heading
    useEffect(() => {
        if (orientation?.alpha !== null && orientation?.alpha !== undefined) {
            // alpha is heading in most mobile browsers (0 is North)
            currentHeading.current = orientation.alpha;
            lastHeadingRef.current = orientation.alpha;
        } else if (gpsBearing !== null && gpsBearing !== undefined) {
            // Fallback: use bearing computed from last two GPS points
            currentHeading.current = gpsBearing;
            lastHeadingRef.current = gpsBearing;
        } else {
            // No new heading info: keep using the last known heading
            currentHeading.current = lastHeadingRef.current;
        }
    }, [orientation, gpsBearing]);

    // Monitor GPS health
    useEffect(() => {
        if (!currentPosition) return;
        
        if (currentPosition.accuracy > 30) {
            setIsDrActive(true);
        } else {
            setIsDrActive(false);
            lastGpsPoint.current = [currentPosition.lng, currentPosition.lat];
            lastProcessedStep.current = steps;
        }
    }, [currentPosition, steps]);

    // Estimation logic
    useEffect(() => {
        if (!isDrActive || !lastGpsPoint.current) return;

        const newSteps = steps - lastProcessedStep.current;
        if (newSteps >= 5) { // Estimate point every 5 steps to reduce noise
            const distance = newSteps * stepLength;
            const from = turf.point(lastGpsPoint.current);
            
            // Calculate new position using turf.destination
            const destination = turf.destination(from, distance / 1000, currentHeading.current, { units: 'kilometers' });
            
            const newPoint = [destination.geometry.coordinates[1], destination.geometry.coordinates[0]]; // [lat, lng]
            setDrPoint({
                point: newPoint,
                source: 'dead-reckoning',
                steps: newSteps
            });

            lastGpsPoint.current = destination.geometry.coordinates;
            lastProcessedStep.current = steps;
        }
    }, [isDrActive, steps, stepLength]);

    const calibrateStepLength = (distance, measuredSteps) => {
        if (measuredSteps > 0) {
            setStepLength(distance / measuredSteps);
        }
    };

    return {
        drPoint,
        isDrActive,
        stepLength,
        calibrateStepLength,
        setStepLength
    };
};
