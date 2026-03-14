import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { MapPin, Pencil, Trash2, Type, Plus, ChevronRight, Target } from "lucide-react";
import { stringToColor } from "../utils/colorUtils";

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
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [createName, setCreateName] = useState("");
  const [targetNb, setTargetNb] = useState(null);

  const handleOpenRename = (nb) => {
    setTargetNb(nb);
    setNameDraft(nb?.name || "");
    setOpenNameDialog(true);
  };

  const handleConfirmRename = () => {
    if (onEditName && targetNb && nameDraft.trim()) {
      onEditName(targetNb, nameDraft.trim());
    }
    setOpenNameDialog(false);
  };

  const handleConfirmCreate = () => {
    if (onCreateMode && createName.trim()) {
      onCreateMode(createName.trim());
      setCreateName("");
      setOpenCreateDialog(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Gestión de Barrios</h2>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onPanelClose}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Button onClick={() => setOpenCreateDialog(true)} className="w-full justify-start gap-2 shadow-sm">
        <Plus className="h-4 w-4" /> Nuevo Barrio
      </Button>

      <ScrollArea className="flex-1 pr-4 -mr-4">
        <div className="space-y-3 pb-4">
          {neighborhoods.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/30">
              <MapPin className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
              <p className="text-sm text-muted-foreground px-4">No hay barrios mapeados en esta extensión del mapa.</p>
            </div>
          ) : (
            neighborhoods.map(nb => {
              const color = stringToColor(nb.name || nb.id);
              const isSelected = selectedId === nb.id;
              
              return (
                <div
                  key={nb.id}
                  onClick={() => onSelect(nb)}
                  className={`group relative flex flex-col rounded-xl border p-3 transition-all cursor-pointer hover:shadow-md ${
                    isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm" 
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm font-semibold leading-none truncate max-w-[140px]">
                        {nb.name || 'Sin nombre'}
                      </span>
                    </div>
                    <Badge variant={nb.synced === 0 ? "secondary" : "outline"} className="text-[10px] h-5 px-1.5 uppercase tracking-wider">
                      {nb.synced === 0 ? "Pendiente" : "Sinc"}
                    </Badge>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 hover:bg-background shadow-none"
                      onClick={(e) => { e.stopPropagation(); onSelect(nb); }}
                      title="Centrar en mapa"
                    >
                      <Target className="h-4 w-4 text-primary" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 hover:bg-background shadow-none"
                      onClick={(e) => { e.stopPropagation(); handleOpenRename(nb); }}
                      title="Editar nombre"
                    >
                      <Type className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 hover:bg-background shadow-none text-blue-600 hover:text-blue-700" 
                      onClick={(e) => { e.stopPropagation(); onEdit(nb); }}
                      title="Editar límites"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>

                  {isSelected && (
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Rename Dialog */}
      <Dialog open={openNameDialog} onOpenChange={setOpenNameDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Renombrar barrio</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Nuevo nombre del sector
              </label>
              <Input 
                id="name"
                value={nameDraft} 
                onChange={(e) => setNameDraft(e.target.value)} 
                placeholder="Ej. Bosque Popular"
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmRename()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNameDialog(false)}>Cancelar</Button>
            <Button onClick={handleConfirmRename}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nuevo Barrio</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="create-name" className="text-sm font-medium leading-none">
                Nombre del nuevo sector
              </label>
              <Input 
                id="create-name"
                value={createName} 
                onChange={(e) => setCreateName(e.target.value)} 
                placeholder="Nombre del barrio..."
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmCreate()}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Después de asignar el nombre, podrás dibujar el polígono en el mapa.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleConfirmCreate}>Comenzar a dibujar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NeighborhoodManager;
