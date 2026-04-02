"use client";

import { Bookmark } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import {
  useSavedResearchStore,
  type SavedResearchItem,
} from "@/stores/saved-research-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SaveResearchButtonProps {
  item: Omit<SavedResearchItem, "savedAt">;
  size?: "sm" | "lg";
  className?: string;
}

export function SaveResearchButton({
  item,
  size = "lg",
  className,
}: SaveResearchButtonProps) {
  const toggle = useSavedResearchStore((s) => s.toggle);
  const saved = useSavedResearchStore((s) => s.isSaved(item.id));

  function handleClick() {
    toggle(item);
    if (!saved) {
      toast.success("Saved to your reading list");
    } else {
      toast("Removed from your reading list");
    }
  }

  return (
    <Button
      type="button"
      variant={saved ? "default" : "outline"}
      size={size}
      onClick={handleClick}
      className={cn(
        "gap-1.5 transition-all",
        saved && "bg-primary text-primary-foreground hover:bg-primary/90",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={saved ? "saved" : "unsaved"}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Bookmark
            className={cn("size-4", saved && "fill-current")}
          />
        </motion.span>
      </AnimatePresence>
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
