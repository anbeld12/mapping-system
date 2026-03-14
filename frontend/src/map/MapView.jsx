import { MapContainer, TileLayer, ZoomControl, LayersControl, useMapEvents } from "react-leaflet";
import { useState, useEffect, useCallback, useRef } from "react";
import L from "leaflet";
import * as turf from "@turf/turf";
import "@geoman-io/leaflet-geoman-free";
import "leaflet/dist/leaflet.css";
import "../styles/editor.css";

import { useGpsWalk } from "../hooks/useGpsWalk";
import { useSensors } from "../hooks/useSensors";
import { useStepDetection } from "../hooks/useStepDetection";
import { useDeadReckoning } from "../hooks/useDeadReckoning";
import { mapService } from "../services/api";
import { offlineStorage } from "../services/offlineStorage";
import { syncManager } from "../services/syncManager";
import { OfflineIndicator } from "../components/OfflineIndicator";
import AppLayout from "../components/layout/AppLayout";
import SidebarPanel from "../components/layout/SidebarPanel";
import GpsWalkCard from "../components/layout/GpsWalkCard";
import EditContextToolbar from "../components/EditContextToolbar";
import { useUIState } from "../context/UIStateContext";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useToast } from "../hooks/use-toast";
import ExportModal from "../components/ExportModal";
import { geometryEditService } from "../services/geometryEdit";

// Modular Layers
import NeighborhoodLayer from "./layers/NeighborhoodLayer";
import BlocksLayer from "./layers/BlocksLayer";
import GpsWalkLayer from "./layers/GpsWalkLayer";

// Fix Leaflet default icon
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapView() {
  const {
    mode,
    setMode,
    selectedElement,
    setSelectedElement,
    selectedNeighborhoodId,
    setSelectedNeighborhoodId,
    closeSidebar,
  } = useUIState();
  const { toast } = useToast();

  const [blocks, setBlocks] = useState([]);
  const [houses, setHouses] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [divisionPoints, setDivisionPoints] = useState([]);
  const [bbox, setBbox] = useState(null);
  const [currentBlock, setCurrentBlock] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const mapRef = useRef(null);

  const walk = useGpsWalk();
  const { path, currentPosition, startWatch, stopWatch, addManualPoint, addDrPoint } = walk;

  // Sensors
  const sensors = useSensors();
  const { stepCount } = useStepDetection(sensors.motion);
  const gpsBearing = (() => {
    if (path.length < 2) return null;
    const prev = path[path.length - 2];
    const last = path[path.length - 1];
    const from = turf.point([prev[1], prev[0]]);
    const to = turf.point([last[1], last[0]]);
    return turf.bearing(from, to);
  })();
  const { drPoint, stepLength, calibrateStepLength } = useDeadReckoning(
    currentPosition,
    stepCount,
    sensors.orientation,
    gpsBearing
  );

  useEffect(() => {
    if (mode === "gps" && drPoint) {
      addDrPoint(drPoint.point[0], drPoint.point[1]);
    }
  }, [drPoint, mode, addDrPoint]);

  useEffect(() => {
    syncManager.init();
    syncManager.sync();
  }, []);

  const loadData = useCallback(async (currentBbox) => {
    let serverBlocks = [];
    let serverHouses = [];
    let serverNB = [];
    try {
      const data = await mapService.fetchMapData(currentBbox);
      serverBlocks = data.blocks || [];
      serverHouses = data.houses || [];
      serverNB = data.neighborhoods || [];
    } catch {
      console.warn("Servidor no disponible, usando solo datos locales.");
    }

    const localBlocks = await offlineStorage.getBlocks();
    const localPendingBlocks = localBlocks.filter((b) => b.synced === 0);
    const mergedBlocks = [...serverBlocks];
    localPendingBlocks.forEach((lb) => {
      const index = mergedBlocks.findIndex((sb) => sb.id === lb.id);
      if (index === -1) mergedBlocks.push(lb);
      else mergedBlocks[index] = lb;
    });

    const localNB = await offlineStorage.getNeighborhoods();
    const localPendingNB = localNB.filter((n) => n.synced === 0);
    const mergedNB = [...serverNB];
    localPendingNB.forEach((ln) => {
      const index = mergedNB.findIndex((sn) => sn.id === ln.id);
      if (index === -1) mergedNB.push(ln);
      else mergedNB[index] = ln;
    });

    setBlocks(mergedBlocks);
    setHouses(serverHouses);
    setNeighborhoods(mergedNB);
  }, []);

  function MapEvents() {
    const map = useMapEvents({
      moveend() {
        const bounds = map.getBounds();
        const box = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
        setBbox(box);
        loadData(box);
      },
      click(e) {
        if (mode === "subdivision") {
          setDivisionPoints((prev) => [...prev, [e.latlng.lng, e.latlng.lat]]);
        }
        if (mode === "gps" && manualMode) {
          addManualPoint(e.latlng.lat, e.latlng.lng);
        }
      },
    });

    useEffect(() => {
      if (!map) return;
      mapRef.current = map;
      map.pm.setLang("es");
    }, [map]);

    return null;
  }

  const handleFinishWalk = (closeAutomatically = false) => {
    if (path.length < 3) {
      toast({ title: "Captura incompleta", description: "Se necesitan al menos 3 puntos." });
      return;
    }
    let coords = path.map((p) => [p[1], p[0]]);
    if (closeAutomatically) {
      coords.push(coords[0]);
    } else if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
      coords.push(coords[0]);
    }

    const line = turf.lineString(coords);
    const simplified = turf.simplify(line, { tolerance: 0.00001, highQuality: true });
    const polygon = turf.polygon([simplified.geometry.coordinates]);

    setCurrentBlock(polygon.geometry);
    setMode("preview");
    stopWatch();
    setManualMode(false);
  };

  const handleSaveBlock = async () => {
    if (!currentBlock) return;
    const localId = crypto.randomUUID();
    const blockData = {
      id: localId,
      name: `Cuadra ${new Date().toLocaleTimeString()}`,
      geometry: currentBlock,
      division_points: divisionPoints,
      capture_method: "gps",
      neighborhood_id: selectedNeighborhoodId,
      synced: 0,
    };
    try {
      await offlineStorage.saveBlock(blockData);
      await offlineStorage.addPendingChange({
        entity_type: "block",
        entity_id: localId,
        operation: "INSERT",
        data: {
          name: blockData.name,
          geom: blockData.geometry,
          division_points: blockData.division_points,
          capture_method: blockData.capture_method,
          neighborhood_id: blockData.neighborhood_id,
        },
      });
      if (navigator.onLine) await syncManager.sync();
      toast({ title: "Guardado local", description: "La cuadra se guardó en cola de sincronización." });
      setCurrentBlock(null);
      setDivisionPoints([]);
      setMode("view");
      if (bbox) loadData(bbox);
    } catch (err) {
      toast({ title: "Error al guardar", description: err.message, variant: "destructive" });
    }
  };

  const onFeatureClick = (e, feature, type) => {
    if (mode !== "view") return;
    L.DomEvent.stopPropagation(e);
    if (selectedElement) selectedElement.layer.pm.disable();
    const layer = e.target;
    layer.pm.enable({ allowSelfIntersection: false });
    setSelectedElement({ id: feature.id || feature.properties?.id, entityType: type, layer, originalData: feature });
    setMode("edit");
  };

  const handleUpdate = async () => {
    if (!selectedElement) return;
    const { layer, id, entityType, originalData } = selectedElement;
    const newGeom = layer.toGeoJSON().geometry;
    if (!geometryEditService.isValid(newGeom)) {
      return toast({ title: "Geometría inválida", description: "Corrige auto-intersecciones.", variant: "destructive" });
    }
    try {
      if (entityType === "block") {
        const updatedBlock = { ...originalData, geometry: newGeom, synced: 0 };
        await offlineStorage.saveBlock(updatedBlock);
        await offlineStorage.addPendingChange({
          entity_type: "block",
          entity_id: id,
          operation: "UPDATE",
          data: { name: updatedBlock.name, geom: newGeom, division_points: updatedBlock.division_points },
        });
      } else if (entityType === "neighborhood") {
        const updatedNB = { ...originalData, geometry: newGeom, synced: 0 };
        await offlineStorage.saveNeighborhood(updatedNB);
        await offlineStorage.addPendingChange({
          entity_type: "neighborhood",
          entity_id: id,
          operation: "UPDATE",
          data: { name: updatedNB.name, geom: newGeom },
        });
      } else if (entityType === "house") {
        const updatedHouse = {
          ...originalData,
          id,
          geometry: newGeom,
          synced: 0,
          updated_at: new Date().toISOString(),
        };
        await offlineStorage.saveHouses([updatedHouse]);
        await offlineStorage.addPendingChange({
          entity_type: "house",
          entity_id: id,
          operation: "UPDATE",
          data: { geom: newGeom, block_id: originalData.block_id },
        });
      }
      toast({ title: "Cambios guardados", description: "En cola de sincronización." });
      layer.pm.disable();
      setSelectedElement(null);
      setMode("view");
      if (bbox) loadData(bbox);
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleCreateNeighborhood = async (name) => {
    if (!name) return;
    mapRef.current.pm.enableDraw("Polygon", { snappable: true, continueDrawing: false });
    mapRef.current.once("pm:create", async (e) => {
      const geom = e.layer.toGeoJSON().geometry;
      const localId = crypto.randomUUID();
      const nbData = { id: localId, name, geometry: geom, synced: 0 };
      try {
        await offlineStorage.saveNeighborhood(nbData);
        await offlineStorage.addPendingChange({
          entity_type: "neighborhood",
          entity_id: localId,
          operation: "INSERT",
          data: { name, geom },
        });
        e.layer.remove();
        if (navigator.onLine) await syncManager.sync();
        toast({ title: "Barrio creado", description: name });
        if (bbox) loadData(bbox);
      } catch (err) {
        toast({ title: "Error al crear barrio", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleUpdateNeighborhoodName = async (nb, newName) => {
    if (!newName || !newName.trim()) return;
    const updatedNB = { ...nb, name: newName.trim(), synced: 0 };
    try {
      await offlineStorage.saveNeighborhood(updatedNB);
      await offlineStorage.addPendingChange({
        entity_type: "neighborhood",
        entity_id: nb.id,
        operation: "UPDATE",
        data: { name: updatedNB.name, geom: nb.geometry || nb.geom },
      });
      setNeighborhoods((prev) => prev.map((n) => (n.id === nb.id ? updatedNB : n)));
      if (navigator.onLine) await syncManager.sync();
    } catch (err) {
      toast({ title: "Error al renombrar", description: err.message, variant: "destructive" });
    }
  };

  const selectedId = selectedElement?.id;

  const statusToolbar = (
    <div className="flex flex-1 items-center justify-between">
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="px-3 py-1 bg-muted/30">
          Modo: <span className="ml-1 font-bold text-primary">{mode.toUpperCase()}</span>
        </Badge>
        {mode === "gps" && (
          <div className="flex items-center gap-2 text-xs font-medium text-blue-600 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            GRABANDO RECORRIDO
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {mode === "view" && (
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={async () => {
              await sensors.requestPermissions();
              setMode("gps");
              startWatch();
              closeSidebar();
            }}
          >
            🚶 Iniciar Caminata GPS
          </Button>
        )}

        {mode === "preview" && (
          <>
            <Button size="sm" onClick={() => setMode("subdivision")} variant="default">
              👍 Aceptar y Editar
            </Button>
            <Button size="sm" onClick={() => setMode("gps")} variant="outline">
              🔄 Reanudar captura
            </Button>
          </>
        )}

        {(mode === "subdivision" || mode === "preview") && (
          <div className="flex items-center gap-2 border-l pl-4 ml-2">
            <span className="text-xs text-muted-foreground font-medium">Asignar Barrio:</span>
            <Select value={selectedNeighborhoodId || ""} onValueChange={(v) => setSelectedNeighborhoodId(v || null)}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="No asignado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No asignado</SelectItem>
                {neighborhoods.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.name || "Sin nombre"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {mode === "subdivision" && (
          <>
            <Button size="sm" onClick={handleSaveBlock} className="bg-green-600 hover:bg-green-700 text-white">
              💾 Guardar y Subdividir
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setMode("view");
                setCurrentBlock(null);
                setDivisionPoints([]);
              }}
              variant="ghost"
            >
              ❌ Cancelar
            </Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <AppLayout
      statusToolbar={statusToolbar}
      sidebar={
        <SidebarPanel
          neighborhoods={neighborhoods}
          onSelect={(nb) => {
            if (!nb) return;
            setSelectedNeighborhoodId(nb.id);
            if (nb.geometry && mapRef.current) {
              const bounds = L.geoJSON(nb.geometry).getBounds();
              mapRef.current.fitBounds(bounds);
            }
          }}
          onCreateMode={handleCreateNeighborhood}
          onEdit={() => toast({ title: "Edición", description: "Seleccione el polígono en el mapa para editarlo." })}
          onEditName={handleUpdateNeighborhoodName}
        />
      }
      onExport={() => setShowExportModal(true)}
    >
      <OfflineIndicator />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        neighborhoods={neighborhoods}
        currentBbox={bbox}
      />

      <EditContextToolbar
        selectedId={selectedElement?.id}
        entityType={selectedElement?.entityType}
        onSave={handleUpdate}
        onCancel={() => {
          if (selectedElement) selectedElement.layer.pm.disable();
          setSelectedElement(null);
          setMode("view");
        }}
        onDelete={async () => {
          if (!selectedElement) return;
          try {
            const { id, entityType } = selectedElement;
            if (entityType === "block") {
              await offlineStorage.deleteBlock(id);
              await offlineStorage.addPendingChange({ entity_type: "block", entity_id: id, operation: "DELETE" });
            } else if (entityType === "neighborhood") {
              await offlineStorage.deleteNeighborhood(id);
              await offlineStorage.addPendingChange({ entity_type: "neighborhood", entity_id: id, operation: "DELETE" });
            }
            setSelectedElement(null);
            setMode("view");
            if (bbox) loadData(bbox);
          } catch (e) {
            toast({ title: "Error al eliminar", description: e.message, variant: "destructive" });
          }
        }}
      />

      <GpsWalkCard
        walk={walk}
        sensors={{ stepCount }}
        onFinish={() => handleFinishWalk(false)}
        onCloseHere={() => handleFinishWalk(true)}
        manualMode={manualMode}
        setManualMode={setManualMode}
        stepLength={stepLength}
        onCalibrate={calibrateStepLength}
      />

      <MapContainer center={[4.6097, -74.0817]} zoom={17} className="h-full w-full" zoomControl={false}>
        <ZoomControl position="bottomright" />
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Mapa Callejero">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Mapa Satelital">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          </LayersControl.BaseLayer>
        </LayersControl>
        
        <MapEvents />

        <NeighborhoodLayer 
          neighborhoods={neighborhoods} 
          selectedNeighborhoodId={selectedNeighborhoodId} 
          onFeatureClick={onFeatureClick} 
        />

        <BlocksLayer 
          blocks={blocks} 
          houses={houses} 
          selectedId={selectedId} 
          onFeatureClick={onFeatureClick} 
          currentBlock={currentBlock} 
          mode={mode} 
          divisionPoints={divisionPoints} 
          setDivisionPoints={setDivisionPoints} 
        />

        <GpsWalkLayer 
          path={path} 
          currentPosition={currentPosition} 
          mode={mode} 
        />

      </MapContainer>
    </AppLayout>
  );
}