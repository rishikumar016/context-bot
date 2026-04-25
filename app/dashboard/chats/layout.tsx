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
      <SidebarInset className="h-dvh overflow-hidden">
        <Header fixed showSidebarTrigger title="Dashboard" href="/dashboard" />
        <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
