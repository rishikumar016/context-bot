import { DialogHost } from "@/components/dialog-host";
import { Header } from "@/components/header";
import { SourcesPanel } from "@/components/sources-panel";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DialogProvider } from "@/context/dialog-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <DialogProvider>
        <SidebarProvider>
          <SourcesPanel />
          <SidebarInset className="min-h-screen">
            <Header fixed />
            <div className="flex flex-1 flex-col">{children}</div>
          </SidebarInset>
        </SidebarProvider>
        <DialogHost />
      </DialogProvider>
    </TooltipProvider>
  );
}
