import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import NeighborhoodManager from "../NeighborhoodManager";
import { useUIState } from "../../context/UIStateContext";
import { useEffect, useState } from "react";

const SyncStatus = () => {
  const [pending] = useState(0);

  // Placeholder: real sync status should be fed from syncManager
  useEffect(() => {
    // TODO: integrate with syncManager events
  }, []);
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Cambios pendientes</div>
        <Badge variant={pending > 0 ? "secondary" : "outline"}>{pending}</Badge>
      </div>
      <Button variant="outline" size="sm">Sincronizar ahora</Button>
    </div>
  );
};

const SidebarPanel = ({ neighborhoods, onSelect, onCreateMode, onEdit, onEditName }) => {
  const { selectedNeighborhoodId, setSelectedNeighborhoodId, closeSidebar } = useUIState();

  return (
    <div className="h-full bg-card text-card-foreground flex flex-col">
      <Tabs defaultValue="neighborhoods" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="neighborhoods" className="flex-1">Barrios</TabsTrigger>
          <TabsTrigger value="sync" className="flex-1">Sincronización</TabsTrigger>
        </TabsList>

        <TabsContent value="neighborhoods" className="p-4">
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
        </TabsContent>

        <TabsContent value="sync">
          <SyncStatus />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SidebarPanel;