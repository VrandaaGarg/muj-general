"use client";

import { useCallback, useEffect, useRef } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) onCancel();
    },
    [onCancel],
  );

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => confirmRef.current?.focus());
    }
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange} modal>
      <AnimatePresence>
        {open && (
          <Dialog.Portal keepMounted={false}>
            <Dialog.Backdrop
              render={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-0 z-50 bg-black/40"
                />
              }
            />
            <Dialog.Popup
              render={
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 6 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2",
                    "   border border-border/60 bg-card p-5 shadow-lg ring-1 ring-foreground/5",
                  )}
                />
              }
            >
              <Dialog.Title className="text-sm font-semibold tracking-tight text-foreground">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {description}
              </Dialog.Description>

              <div className="mt-5 flex items-center justify-end gap-2">
                <Dialog.Close
                  render={
                    <Button variant="outline" size="sm">
                      {cancelLabel}
                    </Button>
                  }
                />
                <Button
                  ref={confirmRef}
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={onConfirm}
                >
                  {confirmLabel}
                </Button>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
