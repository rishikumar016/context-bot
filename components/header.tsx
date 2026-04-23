import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "./ui/sidebar";

interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  fixed?: boolean;
}

export function Header({ className, fixed = true, ...props }: HeaderProps) {
  return (
    <header
      className={cn(
        "border-b bg-background/95 supports-backdrop-filter:bg-background/80",
        fixed && "sticky top-0 z-40 backdrop-blur",
        className,
      )}
      {...props}
    >
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Resume Analyzer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
}
