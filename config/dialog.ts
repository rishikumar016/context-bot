import type React from "react";

import { LogoutDialog } from "@/dialog/logout-dialog";
import type { DialogOptions } from "@/types/dialog";

type RegisteredDialog = {
  component: React.ComponentType<any>;
  defaultOptions?: DialogOptions;
};

export const dialogRegistry: Record<string, RegisteredDialog> = {
  logoutDialog: {
    component: LogoutDialog,
    defaultOptions: {
      maxWidth: "420px",
      showCloseButton: true,
    },
  },
};
