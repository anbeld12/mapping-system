import { createContext, useContext, useMemo, useState, useCallback } from "react";

const UIStateContext = createContext(null);

export const UIStateProvider = ({ children }) => {
  const [mode, setMode] = useState("view"); // view | gps | edit | subdivision | preview
  const [selectedElement, setSelectedElement] = useState(null); // { id, type, data, layer }
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState(null);

  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  const value = useMemo(() => ({
    mode,
    setMode,
    selectedElement,
    setSelectedElement,
    isSidebarOpen,
    openSidebar,
    closeSidebar,
    setIsSidebarOpen,
    selectedNeighborhoodId,
    setSelectedNeighborhoodId,
  }), [mode, selectedElement, isSidebarOpen, openSidebar, closeSidebar, selectedNeighborhoodId]);

  return (
    <UIStateContext.Provider value={value}>
      {children}
    </UIStateContext.Provider>
  );
};

export const useUIState = () => {
  const ctx = useContext(UIStateContext);
  if (!ctx) throw new Error("useUIState must be used within UIStateProvider");
  return ctx;
};
