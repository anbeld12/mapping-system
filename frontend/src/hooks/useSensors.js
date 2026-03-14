import { useState, useEffect, useCallback, useRef } from 'react';

export const useSensors = () => {
    const [motion, setMotion] = useState({ x: 0, y: 0, z: 0 });
    const [orientation, setOrientation] = useState({ alpha: null, beta: null, gamma: null });
    const [error, setError] = useState(null);
    const [permissionGranted, setPermissionGranted] = useState(false);

    const requestPermissions = async () => {
        // iOS 13+ requires explicit permission
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            try {
                const response = await DeviceMotionEvent.requestPermission();
                if (response === 'granted') {
                    setPermissionGranted(true);
                } else {
                    setError("Permission denied for motion sensors");
                }
            } catch (err) {
                setError("Failed to request motion sensor permission");
            }
        } else {
            // Android/Older iOS/Other
            setPermissionGranted(true);
        }
    };

    useEffect(() => {
        if (!permissionGranted) return;

        const handleMotion = (event) => {
            const acc = event.acceleration || event.accelerationIncludingGravity;
            if (acc) {
                setMotion({
                    x: acc.x || 0,
                    y: acc.y || 0,
                    z: acc.z || 0
                });
            }
        };

        const handleOrientation = (event) => {
            setOrientation({
                alpha: event.alpha, // Heading (around Z axis)
                beta: event.beta,
                gamma: event.gamma
            });
        };

        window.addEventListener('devicemotion', handleMotion);
        window.addEventListener('deviceorientation', handleOrientation);

        return () => {
            window.removeEventListener('devicemotion', handleMotion);
            window.removeEventListener('deviceorientation', handleOrientation);
        };
    }, [permissionGranted]);

    return {
        motion,
        orientation,
        error,
        permissionGranted,
        requestPermissions
    };
};
