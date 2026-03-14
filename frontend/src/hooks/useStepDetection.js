import { useState, useEffect, useRef } from 'react';

export const useStepDetection = (motion) => {
    const [stepCount, setStepCount] = useState(0);
    const lastMagnitude = useRef(0);
    const lastStepTime = useRef(0);
    const accHistory = useRef([]);
    const HISTORY_SIZE = 10;
    const MIN_PEAK = 1.2; // Gs or threshold
    const STEP_TIMEOUT = 300; // ms between steps

    useEffect(() => {
        if (!motion) return;

        // Calculate magnitude sqrt(x^2 + y^2 + z^2)
        const magnitude = Math.sqrt(motion.x ** 2 + motion.y ** 2 + motion.z ** 2);

        // Simple low-pass filter (moving average)
        accHistory.current.push(magnitude);
        if (accHistory.current.length > HISTORY_SIZE) {
            accHistory.current.shift();
        }
        const avg = accHistory.current.reduce((a, b) => a + b, 0) / accHistory.current.length;

        // Peak detection algorithm
        const now = Date.now();
        if (avg > MIN_PEAK && avg > lastMagnitude.current && now - lastStepTime.current > STEP_TIMEOUT) {
            // Check if it's a local maximum (simplification: just rising above threshold)
            // We use the falling edge logic or a simple threshold for robustness in web environment
            setStepCount(prev => prev + 1);
            lastStepTime.current = now;
        }

        lastMagnitude.current = avg;
    }, [motion]);

    const resetSteps = () => setStepCount(0);

    return { stepCount, resetSteps };
};
