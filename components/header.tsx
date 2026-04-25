import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "./ui/sidebar";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft } from "lucide-react";

interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  fixed?: boolean;
  showSidebarTrigger?: boolean;
  title?: string;
  href?: string;
}

export async function Header({ className, fixed = true, showSidebarTrigger = false, title = "Context chatBot", href, ...props }: HeaderProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const homeUrl = href || (user ? "/dashboard" : "/");


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
          {showSidebarTrigger && <SidebarTrigger />}
          <div className="min-w-0 flex items-center">
            <Link href={homeUrl} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors">
              {title === "Dashboard" && <ChevronLeft className="h-3.5 w-3.5" />}
              {title}
            </Link>
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
