"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { dialogRegistry } from "@/config/dialog";
import { useDialog } from "@/context/dialog-context";

export function DialogHost() {
  const { state, closeDialog } = useDialog();

  if (!state.type) return null;

  const entry = dialogRegistry[state.type];
  if (!entry) return null;

  const Component = entry.component;
  const options = { ...entry.defaultOptions, ...state.options };

  return (
    <Dialog
      open={state.isOpen}
      onOpenChange={(open) => {
        if (!open) closeDialog();
      }}
    >
      <DialogContent
        showCloseButton={options.showCloseButton ?? true}
        style={options.maxWidth ? { maxWidth: options.maxWidth } : undefined}
        className={options.dialogClassName}
      >
        <Component {...(state.props ?? {})} onClose={closeDialog} />
      </DialogContent>
    </Dialog>
  );
}
