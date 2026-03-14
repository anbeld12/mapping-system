import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import NeighborhoodManager from "../NeighborhoodManager";
import { useUIState } from "../../context/UIStateContext";
import { useEffect, useState } from "react";
import { offlineStorage } from "../../services/offlineStorage";
import { syncManager } from "../../services/syncManager";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { AlertCircle, CheckCircle2, Cloud, CloudOff, RefreshCw } from "lucide-react";

const SyncStatus = () => {
  const [pending, setPending] = useState(0);
  const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateStatus = async () => {
      const changes = await offlineStorage.getPendingChanges();
      setPending(changes.length);
      setIsOnline(navigator.onLine);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    window.addEventListener("online", () => setIsOnline(true));
    window.addEventListener("offline", () => setIsOnline(false));

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", () => setIsOnline(true));
      window.removeEventListener("offline", () => setIsOnline(false));
    };
  }, []);

  const handleSync = async () => {
    await syncManager.sync();
    setLastSync(new Date().toLocaleTimeString());
    const changes = await offlineStorage.getPendingChanges();
    setPending(changes.length);
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            Conectividad
            {isOnline ? (
              <Badge className="bg-green-500 hover:bg-green-600"><Cloud className="w-3 h-3 mr-1" /> Online</Badge>
            ) : (
              <Badge variant="destructive"><CloudOff className="w-3 h-3 mr-1" /> Offline</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${pending > 0 ? 'animate-spin' : ''}`} />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Cambios pendientes</span>
                <span className="text-xs text-muted-foreground">Última sinc: {lastSync}</span>
              </div>
            </div>
            <Badge variant={pending > 0 ? "secondary" : "outline"} className="text-sm">
              {pending}
            </Badge>
          </div>
          
          <Button 
            className="w-full" 
            variant={pending > 0 ? "default" : "outline"}
            disabled={!isOnline || pending === 0}
            onClick={handleSync}
          >
            {pending > 0 ? "Sincronizar ahora" : "Todo al día"}
          </Button>
        </CardContent>
      </Card>

      {pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-xs">
            Tienes {pending} cambios guardados localmente. Sincroniza pronto.
          </p>
        </div>
      )}
    </div>
  );
};

const SidebarPanel = ({ neighborhoods, onSelect, onCreateMode, onEdit, onEditName }) => {
  const { selectedNeighborhoodId, setSelectedNeighborhoodId, closeSidebar } = useUIState();

  return (
    <div className="h-full bg-card text-card-foreground flex flex-col">
      <Tabs defaultValue="neighborhoods" className="w-full flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-14 md:h-12 px-2 overflow-x-auto">
          <TabsTrigger value="neighborhoods" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none h-14 md:h-12 text-sm md:text-base px-4">
            Barrios
          </TabsTrigger>
          <TabsTrigger value="sync" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none h-14 md:h-12 text-sm md:text-base px-4">
            Sincronización
          </TabsTrigger>
        </TabsList>

        <TabsContent value="neighborhoods" className="flex-1 overflow-y-auto m-0 p-0">
          <div className="p-4">
            <NeighborhoodManager
              neighborhoods={neighborhoods}
              onPanelClose={closeSidebar}
              selectedId={selectedNeighborhoodId}
              onSelect={(nb) => {
                setSelectedNeighborhoodId(nb?.id || null);
                onSelect?.(nb);
              }}
              onCreateMode={onCreateMode}
              onEdit={onEdit}
              onEditName={onEditName}
            />
          </div>
        </TabsContent>

        <TabsContent value="sync" className="flex-1 overflow-y-auto m-0">
          <SyncStatus />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SidebarPanel;