import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { Button } from "../ui/button";
import { Menu } from "lucide-react";
import { useUIState } from "../../context/UIStateContext";

const AppLayout = ({ children, sidebar, onExport, statusToolbar }) => {
  const { isSidebarOpen, openSidebar, closeSidebar } = useUIState();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header/Navbar */}
      <header className="h-16 bg-background border-b border-border flex items-center px-4 z-50">
        <h1 className="text-xl font-semibold">Sistema de Mapeo Geoespacial - Acueducto de Bogotá</h1>
        <div className="ml-auto flex gap-2">
          {onExport && (
            <Button variant="secondary" onClick={onExport}>
              📤 Exportar / Reportes
            </Button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-background border-r border-border overflow-y-auto">
          {sidebar}
        </aside>

        {/* Main content area */}
        <main className="flex-1 relative overflow-hidden flex flex-col">
          {statusToolbar && (
            <div className="z-20 h-14 bg-card border-b border-border flex items-center px-4 gap-4 shadow-sm">
              {statusToolbar}
            </div>
          )}
          <div className="flex-1 relative overflow-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;