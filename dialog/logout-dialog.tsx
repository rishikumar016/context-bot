"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { useDialog } from "@/context/dialog-context";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function LogoutDialog() {
  const { closeDialog } = useDialog();
  const [isPending, setIsPending] = useState(false);

  const handleLogout = async () => {
    setIsPending(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Logged out successfully");
      closeDialog();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);

      toast.error("Logout failed");

      setIsPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader className="text-left">
        <DialogTitle>Confirm sign out</DialogTitle>
        <DialogDescription>
          Are you sure you want to log out? You will need to sign in again to
          access your account.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter className="-mx-6 -mb-6 border-t bg-muted/40 px-6 py-4">
        <DialogClose asChild>
          <Button variant="outline" disabled={isPending}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="button" onClick={handleLogout} disabled={isPending}>
          <LogOut data-icon="inline-start" />
          {isPending ? "Signing out..." : "Sign out"}
        </Button>
      </DialogFooter>
    </div>
  );
}
