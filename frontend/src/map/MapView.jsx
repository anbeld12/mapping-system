import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  GeoJSON,
  Circle,
  useMapEvents,
} from "react-leaflet";
import { useState, useEffect, useCallback, useRef } from "react";
import L from "leaflet";
import * as turf from "@turf/turf";
import { stringToColor } from "../utils/colorUtils";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Card, CardContent } from "../components/ui/card";
import { useToast } from "../hooks/use-toast";
import ExportModal from "../components/ExportModal";
import { geometryEditService } from "../services/geometryEdit";

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

const BASEMAPS = {
  OSM: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  SATELLITE: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};

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
  const [basemap, setBasemap] = useState("OSM");
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

  const handleAcceptPreview = () => setMode("subdivision");

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
      alert(err.message);
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
      return alert("Geometría inválida. Corrige auto-intersecciones.");
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
      alert(err.message);
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
        alert(err.message);
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
      alert(err.message);
    }
  };

  const selectedId = selectedElement?.id;

  return (
    <AppLayout
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
          onCreateMode={() => handleCreateNeighborhood(prompt("Nombre del barrio:"))}
          onEdit={() => toast({ title: "Edición", description: "Seleccione el polígono en el mapa para editarlo." })}
          onEditName={(nb) => handleUpdateNeighborhoodName(nb, prompt("Nuevo nombre:", nb.name || ""))}
        />
      }
    >
      <OfflineIndicator />

      <div className="absolute top-4 left-16 z-[1050] flex gap-2">
        <Button variant="secondary" onClick={() => setShowExportModal(true)}>
          📤 Exportar / Reportes
        </Button>
      </div>

      <div className="absolute top-4 right-20 z-[1050] flex flex-wrap gap-2 items-center">
        {mode === "view" && (
          <Button
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
            <Button onClick={handleAcceptPreview} variant="default">
              👍 Aceptar y Editar
            </Button>
            <Button onClick={() => setMode("gps")} variant="outline">
              🔄 Reanudar captura
            </Button>
          </>
        )}

        {(mode === "subdivision" || mode === "preview") && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Barrio:</span>
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
            <Button onClick={handleSaveBlock} variant="default">
              💾 Guardar y Subdividir
            </Button>
            <Button
              onClick={() => {
                setMode("view");
                setCurrentBlock(null);
                setDivisionPoints([]);
              }}
              variant="outline"
            >
              ❌ Cancelar
            </Button>
          </>
        )}
      </div>

      <div className="absolute left-4 bottom-4 z-[1050]">
        <Card className="shadow border">
          <CardContent className="p-2">
            <Select value={basemap} onValueChange={setBasemap}>
              <SelectTrigger className="w-40 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OSM">🗺️ Mapa Base</SelectItem>
                <SelectItem value="SATELLITE">🛰️ Satélite</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
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
            alert(e.message);
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

      <MapContainer center={[4.6097, -74.0817]} zoom={17} style={{ height: "100vh", width: "100%" }}>
        <TileLayer url={BASEMAPS[basemap]} />
        <MapEvents />

        {neighborhoods.map((nb) => (
          <GeoJSON
            key={nb.id}
            data={nb.geometry || nb.geom}
            pathOptions={{
              color: selectedNeighborhoodId === nb.id ? "#9b59b6" : "#8e44ad",
              fillOpacity: 0.05,
              weight: selectedNeighborhoodId === nb.id ? 4 : 2,
              dashArray: "5, 10",
            }}
            eventHandlers={{ click: (e) => onFeatureClick(e, nb, "neighborhood") }}
          />
        ))}

        {blocks.map((block) => (
          <GeoJSON
            key={block.id}
            data={block.geometry || block.geom}
            pathOptions={{
              color: selectedId === block.id ? "#e67e22" : block.neighborhood_id ? stringToColor(block.neighborhood_id) : "#3388ff",
              fillOpacity: 0.1,
              weight: selectedId === block.id ? 4 : 2,
            }}
            eventHandlers={{ click: (e) => onFeatureClick(e, block, "block") }}
          />
        ))}

        {houses.map((house) => (
          <GeoJSON
            key={house.id}
            data={house.geometry || house.geom}
            pathOptions={{
              color: selectedId === house.id ? "#e67e22" : "#28a745",
              fillOpacity: 0.4,
              weight: selectedId === house.id ? 3 : 1,
            }}
            eventHandlers={{ click: (e) => onFeatureClick(e, house, "house") }}
          />
        ))}

        {mode === "gps" && path.length > 0 && (
          <>
            <Polyline positions={path} color="#007bff" weight={3} />
            {currentPosition && (
              <Polyline
                positions={[path[path.length - 1], [currentPosition.lat, currentPosition.lng]]}
                color="#007bff"
                weight={2}
                dashArray="5, 5"
              />
            )}
          </>
        )}

        {currentPosition && mode === "gps" && (
          <>
            <Circle
              center={[currentPosition.lat, currentPosition.lng]}
              radius={currentPosition.accuracy}
              pathOptions={{ fillColor: "#007bff", fillOpacity: 0.1, color: "#007bff", weight: 1 }}
            />
            <Marker
              position={[currentPosition.lat, currentPosition.lng]}
              icon={L.divIcon({
                className: "user-pos-marker",
                html: `
                  <div class="user-pos-icon" style="width: 16px; height: 16px;">
                    ${currentPosition.heading ? `<div class="heading-cone" style="transform: rotate(${currentPosition.heading}deg)"></div>` : ""}
                  </div>
                `,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              })}
            />
          </>
        )}

        {(mode === "subdivision" || mode === "preview") && currentBlock && (
          <GeoJSON
            data={currentBlock}
            pathOptions={{ color: "orange", fillOpacity: 0.2 }}
            eventHandlers={{
              add: (e) => {
                if (mode === "subdivision") e.target.pm.enable();
              },
            }}
          />
        )}

        {divisionPoints.map((pt, idx) => (
          <Marker
            key={idx}
            position={[pt[1], pt[0]]}
            draggable={mode === "subdivision"}
            eventHandlers={{
              dragend: (e) => {
                const newPos = e.target.getLatLng();
                setDivisionPoints((prev) => {
                  const updated = [...prev];
                  updated[idx] = [newPos.lng, newPos.lat];
                  return updated;
                });
              },
            }}
          />
        ))}
      </MapContainer>
    </AppLayout>
  );
}