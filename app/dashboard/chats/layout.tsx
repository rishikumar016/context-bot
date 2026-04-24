import { Header } from "@/components/header";
import { SourcesPanel } from "@/components/sources-panel";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function ChatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <SourcesPanel />
      <SidebarInset className="min-h-screen">
        <Header fixed showSidebarTrigger />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
