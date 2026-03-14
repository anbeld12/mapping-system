import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const NeighborhoodManager = ({ 
  neighborhoods = [], 
  onSelect, 
  onCreateMode, 
  onEdit,
  onEditName,
  selectedId,
  onPanelClose
}) => {
  const [openNameDialog, setOpenNameDialog] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [targetNb, setTargetNb] = useState(null);

  const handleOpenRename = (nb) => {
    setTargetNb(nb);
    setNameDraft(nb?.name || "");
    setOpenNameDialog(true);
  };

  const handleConfirmRename = () => {
    if (onEditName && targetNb && nameDraft.trim()) {
      onEditName({ ...targetNb, name: nameDraft.trim() });
    }
    setOpenNameDialog(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button size="sm" onClick={onCreateMode}>+ Nuevo Barrio</Button>
        <Button size="sm" variant="ghost" onClick={onPanelClose}>Cerrar</Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Barrios</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-[320px] pr-2">
            {neighborhoods.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay barrios en esta zona.</p>
            )}
            <div className="space-y-2">
              {neighborhoods.map(nb => (
                <div
                  key={nb.id}
                  onClick={() => onSelect(nb)}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer hover:bg-muted ${selectedId === nb.id ? 'border-primary bg-muted' : 'border-border'}`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{nb.name || 'Sin nombre'}</span>
                    <Badge variant="secondary" className="w-fit mt-1">{nb.id?.slice(0,8)}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleOpenRename(nb); }} title="Editar nombre">
                      🔤
                    </Button>
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onEdit(nb); }} title="Editar geometría">
                      ✏️
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={openNameDialog} onOpenChange={setOpenNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar barrio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="Nuevo nombre" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenNameDialog(false)}>Cancelar</Button>
              <Button onClick={handleConfirmRename}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NeighborhoodManager;
