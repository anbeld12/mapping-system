import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { Button } from "../ui/button";
import { Menu } from "lucide-react";
import { useUIState } from "../../context/UIStateContext";

const AppLayout = ({ children, sidebar }) => {
  const { isSidebarOpen, openSidebar, closeSidebar } = useUIState();

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Sheet open={isSidebarOpen} onOpenChange={(open) => open ? openSidebar() : closeSidebar()}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="fixed left-4 top-4 z-[1100] bg-background/80 backdrop-blur border"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-full sm:w-[380px] p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle>Panel</SheetTitle>
          </SheetHeader>
          {sidebar}
        </SheetContent>
      </Sheet>

      <div className="w-full h-screen overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default AppLayout;