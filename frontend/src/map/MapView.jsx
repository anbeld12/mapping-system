import { MapContainer, TileLayer, ZoomControl, LayersControl, useMapEvents, useMap } from "react-leaflet";
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
  const { path, currentPosition, startWatch, stopWatch, addManualPoint, addDrPoint, isWatching } = walk;

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
    const { segments, anchors, housesInWalk } = walk;
    
    // Consolidar todos los puntos de los segmentos
    let allPoints = [];
    
    if (segments.length > 0) {
      segments.forEach((seg, i) => {
        // Evitrar duplicar el punto final de un segmento con el inicial del siguiente
        const points = i === 0 ? seg.points : seg.points.slice(1);
        allPoints.push(...points);
      });
    }

    // Si hay anclajes sin segmento cerrado aún (último punto)
    if (anchors.length > 0) {
      const lastAnchor = anchors[anchors.length - 1];
      const lastPointInAll = allPoints.length > 0 ? allPoints[allPoints.length - 1] : null;
      if (!lastPointInAll || (lastPointInAll[0] !== lastAnchor[0] || lastPointInAll[1] !== lastAnchor[1])) {
        allPoints.push(lastAnchor);
      }
    }

    if (allPoints.length < 3) {
      toast({ title: "Captura incompleta", description: "Se necesitan al menos 3 anclajes o puntos de curva." });
      return;
    }

    // Leaflet [lat, lng] -> GeoJSON [lng, lat]
    let coords = allPoints.map((p) => [p[1], p[0]]);
    
    // Cerrar el polígono
    if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
      coords.push(coords[0]);
    }

    try {
      const line = turf.lineString(coords);
      const simplified = turf.simplify(line, { tolerance: 0.00001, highQuality: true });
      const polygon = turf.polygon([simplified.geometry.coordinates]);

      setCurrentBlock({
        geometry: polygon.geometry,
        predios: housesInWalk
      });
      setMode("preview");
      stopWatch();
      setManualMode(false);
    } catch (err) {
      toast({ title: "Error en Geometría", description: "No se pudo generar el polígono.", variant: "destructive" });
    }
  };

  const handleSaveBlock = async () => {
    if (!currentBlock) return;
    const localId = crypto.randomUUID();
    const blockData = {
      id: localId,
      name: `Cuadra ${new Date().toLocaleTimeString()}`,
      geometry: currentBlock.geometry,
      division_points: divisionPoints,
      predios: currentBlock.predios,
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
          predios: blockData.predios,
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
    <div className="flex flex-1 items-center justify-end gap-2 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 shrink-0">
        {mode === "view" && (
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-3 md:h-9 md:px-4 text-xs md:text-sm"
            onClick={async () => {
              await sensors.requestPermissions();
              setMode("gps");
              startWatch();
              closeSidebar();
            }}
          >
            🚶 <span className="hidden xs:inline ml-1">Caminata GPS</span>
            <span className="xs:hidden ml-1">GPS</span>
          </Button>
        )}

        {mode === "preview" && (
          <div className="flex items-center gap-1">
            <Button size="sm" onClick={() => setMode("subdivision")} variant="default" className="h-10 md:h-9 text-xs">
              👍 <span className="hidden xs:inline ml-1">Aceptar</span>
            </Button>
            <Button size="sm" onClick={() => setMode("gps")} variant="outline" className="h-10 md:h-9 text-xs">
              🔄 <span className="hidden xs:inline ml-1">Reanudar</span>
            </Button>
          </div>
        )}

        {(mode === "subdivision" || mode === "preview") && (
          <div className="flex items-center gap-1 border-l pl-2 md:pl-4 md:ml-2">
            <span className="text-[10px] md:text-xs text-muted-foreground font-medium hidden sm:inline">Barrio:</span>
            <Select 
              value={selectedNeighborhoodId || undefined} 
              onValueChange={(v) => setSelectedNeighborhoodId(v || null)}
            >
              <SelectTrigger className="w-24 md:w-40 h-10 md:h-9 text-xs">
                <SelectValue placeholder="Barrio" />
              </SelectTrigger>
              <SelectContent>
                {neighborhoods
                  .filter(n => n && (n.id || n.value))
                  .map((n, idx) => {
                    const safeValue = String(n.id || n.value || `nb-${idx}`);
                    return (
                      <SelectItem key={safeValue} value={safeValue}>
                        {n.name || "Sin nombre"}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>
        )}

        {mode === "subdivision" && (
          <div className="flex items-center gap-1">
            <Button size="sm" onClick={handleSaveBlock} className="bg-green-600 hover:bg-green-700 text-white h-10 md:h-9 text-xs">
              💾 <span className="hidden xs:inline ml-1">Guardar</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setMode("view");
                setCurrentBlock(null);
                setDivisionPoints([]);
              }}
              variant="ghost"
              className="h-10 md:h-9 text-xs px-2"
            >
              ❌
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const [isGpsExpanded, setIsGpsExpanded] = useState(false);

  const MapController = ({ center, isWatching, isExpanded }) => {
    const map = useMap();
    const hasCenteredRef = useRef(false);

    useEffect(() => {
      if (isWatching && center && !hasCenteredRef.current) {
        const targetLat = isExpanded ? center.lat - 0.0005 : center.lat;
        map.setView([targetLat, center.lng], 18, {
          animate: true,
          pan: {
            duration: 0.3
          }
        });
        hasCenteredRef.current = true;
      }
    }, [isWatching, isExpanded, center]);

    return null;
  };

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
      {/* Contenedor relativo principal para overlays y mapa */}
      <div className="relative w-full h-full flex-1 overflow-hidden">
        {/* Rail superior: indicador de modo y offline */}
        <div className="pointer-events-none absolute top-3 left-0 right-0 z-30 flex flex-col items-center gap-2 px-3">
          <div className="flex gap-2 items-center justify-center">
            <div className="pointer-events-auto">
              <OfflineIndicator />
            </div>
            <div className="pointer-events-auto">
              <Badge variant="outline" className="px-3 py-1 bg-background/80 backdrop-blur-sm border-primary/50 shadow-md whitespace-nowrap">
                Modo: <span className="ml-1 font-bold text-primary">{mode.toUpperCase()}</span>
              </Badge>
            </div>
          </div>
          {mode === "gps" && (
            <div className="pointer-events-auto flex items-center gap-2 px-3 py-1 bg-blue-50/90 backdrop-blur-sm border border-blue-200 rounded-full text-xs font-bold text-blue-600 animate-pulse shadow-sm whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              GRABANDO RECORRIDO
            </div>
          )}
        </div>

        {/* Rail inferior reservado para overlays flotantes (GpsWalkCard) */}
        <div className="pointer-events-none absolute inset-0">
          <GpsWalkCard
            walk={walk}
            sensors={{ stepCount }}
            onFinish={() => handleFinishWalk(false)}
            onCloseHere={() => handleFinishWalk(true)}
            manualMode={manualMode}
            setManualMode={setManualMode}
            stepLength={stepLength}
            onCalibrate={calibrateStepLength}
            isExpanded={isGpsExpanded}
            setIsExpanded={setIsGpsExpanded}
          />
        </div>

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

        {/* Contenedor del mapa */}
        <div className="w-full h-full relative flex-1">
          <MapContainer
            center={[4.6097, -74.0817]}
            zoom={17}
            className="w-full h-full z-0"
            zoomControl={false}
          >
            {/* Controles Leaflet con z-index controlado y separación para flotantes */}
            <ZoomControl position="bottomright" />
            <MapController center={currentPosition} isWatching={isWatching} isExpanded={isGpsExpanded} />
            <LayersControl position="bottomright">
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
              walk={walk}
              mode={mode}
            />
          </MapContainer>
        </div>
      </div>
    </AppLayout>
  );
}