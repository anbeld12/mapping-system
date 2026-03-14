import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

const EditContextToolbar = ({ selectedId, entityType, onSave, onCancel, onDelete }) => {
  if (!selectedId) return null;

  return (
    <div className="fixed top-4 right-4 z-[1100] bg-card border shadow-sm rounded-lg px-4 py-3 flex items-center gap-3">
      <div className="flex flex-col text-sm">
        <span className="font-medium">Editando {entityType || 'elemento'}</span>
        <span className="text-xs text-muted-foreground">{selectedId.slice(0, 8)}...</span>
      </div>
      <Separator orientation="vertical" className="h-8" />
      <div className="flex items-center gap-2">
        <Button size="sm" variant="default" onClick={onSave}>Guardar</Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancelar</Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive">Eliminar</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar el elemento?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará el elemento seleccionado. Si hay cambios pendientes, se encolarán para sincronización.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default EditContextToolbar;