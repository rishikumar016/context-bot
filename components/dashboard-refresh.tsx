"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function DashboardRefresh() {
  const router = useRouter();

  useEffect(() => {
    // Whenever this component mounts (e.g. from backward navigation or a Link)
    // we want to tell Next.js to fetch the freshest data from the server.
    router.refresh();
  }, [router]);

  return null;
}