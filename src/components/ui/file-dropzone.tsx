"use client";

import { type DragEvent, type ReactNode, useCallback, useRef, useState } from "react";
import { FileUp, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ExistingFile {
  originalName: string;
  sizeBytes: number;
}

interface FileDropzoneProps {
  id: string;
  name?: string;
  accept: string;
  maxSizeBytes?: number;
  file: File | null;
  existingFile?: ExistingFile | null;
  fileIcon?: ReactNode;
  label: string;
  sublabel?: string;
  headerLabel?: ReactNode;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  onFileChange: (file: File | null) => void;
  onRemove: () => void;
}

function formatFileSize(sizeBytes: number) {
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

const MIME_EXTENSION_FALLBACKS: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

function acceptMatchesFile(accept: string, file: File): boolean {
  const allowed = accept.split(",").map((s) => s.trim().toLowerCase());
  const lowerMime = file.type.toLowerCase();
  const lowerName = file.name.toLowerCase();

  return allowed.some((pattern) => {
    if (pattern.startsWith(".")) {
      return lowerName.endsWith(pattern);
    }

    if (lowerMime && pattern === lowerMime) return true;

    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -1);
      return lowerMime.startsWith(prefix);
    }

    const fallbackExtensions = MIME_EXTENSION_FALLBACKS[pattern];
    return fallbackExtensions?.some((extension) => lowerName.endsWith(extension)) ?? false;
  });
}

export function FileDropzone({
  id,
  name,
  accept,
  maxSizeBytes,
  file,
  existingFile,
  fileIcon,
  label,
  sublabel,
  headerLabel,
  description,
  required,
  disabled,
  onFileChange,
  onRemove,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const dragCounterRef = useRef(0);

  const handleFile = useCallback(
    (incoming: File) => {
      if (!acceptMatchesFile(accept, incoming)) {
        toast.error("This file type is not accepted.");
        return false;
      }

      if (maxSizeBytes && incoming.size > maxSizeBytes) {
        toast.error(`File exceeds the ${formatFileSize(maxSizeBytes)} limit.`);
        return false;
      }

      if (inputRef.current) {
        try {
          const dt = new DataTransfer();
          dt.items.add(incoming);
          inputRef.current.files = dt.files;
        } catch {
          toast.error("Drag and drop is not supported here. Please use the file picker.");
          return false;
        }
      }

      onFileChange(incoming);
      return true;
    },
    [accept, maxSizeBytes, onFileChange],
  );

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      dragCounterRef.current += 1;
      if (dragCounterRef.current === 1) {
        setIsDragActive(true);
      }
    },
    [disabled],
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      e.dataTransfer.dropEffect = "copy";
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragActive(false);
      if (disabled) return;

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFile(droppedFile);
      }
    },
    [disabled, handleFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextFile = e.target.files?.[0] ?? null;

      if (!nextFile) {
        onFileChange(null);
        return;
      }

      const accepted = handleFile(nextFile);
      if (!accepted) {
        e.target.value = "";
        onFileChange(null);
      }
    },
    [handleFile, onFileChange],
  );

  const handleRemove = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onRemove();
  }, [onRemove]);

  const SelectedIcon = fileIcon ?? <FileUp className="size-4 text-primary" />;

  return (
    <div className="space-y-2    border border-border/60 p-4">
      {(headerLabel || description) && (
        <div>
          {headerLabel && (
            typeof headerLabel === "string" ? (
              <Label className="text-sm">{headerLabel}</Label>
            ) : (
              headerLabel
            )
          )}
          {description && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}

      {existingFile && !file && (
        <div className="flex items-center gap-3   border border-border/60 bg-muted/20 px-3 py-2">
          <div className="flex size-7 shrink-0 items-center justify-center     bg-muted">
            {fileIcon ?? <FileUp className="size-3.5 text-muted-foreground" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">
              Current:{" "}
              <span className="font-medium text-foreground">
                {existingFile.originalName}
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              {formatFileSize(existingFile.sizeBytes)}
            </p>
          </div>
        </div>
      )}

      {file ? (
        <div
          className={cn(
            "flex items-center gap-3   border px-3 py-2.5",
            existingFile
              ? "border-primary/20 bg-primary/5"
              : "border-border/60 bg-muted/30",
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center     bg-primary/10">
            {SelectedIcon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{file.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {formatFileSize(file.size)}
              {existingFile ? " · will replace current file" : ""}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="size-3" />
          </Button>
        </div>
      ) : (
        <div
          role="presentation"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <label
            htmlFor={id}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2   border border-dashed py-6 text-center transition-all",
              isDragActive
                ? "border-primary bg-primary/8 ring-2 ring-primary/25"
                : "border-border/80 bg-muted/20 hover:border-primary/40 hover:bg-primary/5",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            <div
              className={cn(
                "flex size-10 items-center justify-center    transition-colors",
                isDragActive ? "bg-primary/15" : "bg-muted",
              )}
            >
              <Upload
                className={cn(
                  "size-4 transition-colors",
                  isDragActive
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              />
            </div>
            <div>
              <p className="text-xs font-medium">
                {isDragActive ? "Drop file here" : label}
              </p>
              {sublabel && !isDragActive && (
                <p className="text-[10px] text-muted-foreground">
                  {sublabel}
                </p>
              )}
              {isDragActive && (
                <p className="text-[10px] text-primary/70">
                  Release to upload
                </p>
              )}
            </div>
          </label>
        </div>
      )}

      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required && !file && !existingFile}
        className="sr-only"
        onChange={handleInputChange}
        disabled={disabled}
      />
    </div>
  );
}
