import React, { useState, useEffect } from "react";

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="pointer-events-auto px-4 py-2 bg-amber-400 text-black text-sm font-semibold text-center shadow-md rounded-md border border-amber-500">
      ⚠️ Modo Offline activo. Los cambios se guardarán localmente y se sincronizarán al reconectar.
    </div>
  );
};
