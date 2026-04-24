import { DialogHost } from "@/components/dialog-host";
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
        {children}
        <DialogHost />
      </DialogProvider>
    </TooltipProvider>
  );
}
