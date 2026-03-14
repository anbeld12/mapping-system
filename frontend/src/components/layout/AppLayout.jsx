import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { Button } from "../ui/button";
import { Menu } from "lucide-react";
import { useUIState } from "../../context/UIStateContext";

const AppLayout = ({ children, sidebar, onExport, statusToolbar }) => {
  const { isSidebarOpen, openSidebar, closeSidebar } = useUIState();

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-background text-foreground antialiased">
      {/* Navbar fijo */}
      <header className="relative h-16 shrink-0 bg-background border-b border-border flex items-center px-4 z-50">
        <div className="flex items-center gap-3 min-w-0">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Menú Mapeo</SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100%-60px)] overflow-y-auto">
                {sidebar}
              </div>
            </SheetContent>
          </Sheet>
          
          <h1 className="text-xl font-semibold truncate hidden md:block">
            Sistema de Mapeo Geoespacial - Acueducto de Bogotá
          </h1>
          <h1 className="text-xl font-semibold truncate md:hidden">
            Mapeo Acueducto
          </h1>
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {onExport && (
            <Button variant="secondary" size="sm" onClick={onExport} className="h-9">
              <span className="hidden sm:inline">Exportar / Reportes</span>
              <span className="sm:hidden">📤</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main shell: genera stacking context y contenedor relativo */}
      <main className="relative flex flex-1 overflow-hidden">
        {/* Sidebar (Desktop) */}
        <aside className="hidden md:flex flex-col w-80 h-full border-r bg-background shrink-0 z-10">
          <div className="flex-1 overflow-y-auto">
            {sidebar}
          </div>
        </aside>

        {/* Área del Mapa (Principal) */}
        <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden">
          {statusToolbar && (
            <div className="z-20 h-14 bg-card border-b border-border flex items-center px-4 gap-4 shadow-sm shrink-0">
              {statusToolbar}
            </div>
          )}
          {/* Overlay rails viven dentro de este contenedor relativo (stacking context) */}
          <div className="relative flex-1 overflow-hidden bg-muted/20">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;