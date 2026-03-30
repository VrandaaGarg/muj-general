"use client";

import { useRef, useState } from "react";
import { Bold, Heading3, Italic, List, ListOrdered } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Textarea } from "@/components/ui/textarea";

interface MarkdownToolbarTextareaProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

function updateSelection(
  value: string,
  start: number,
  end: number,
  nextText: string,
) {
  const nextValue = `${value.slice(0, start)}${nextText}${value.slice(end)}`;
  const nextStart = start;
  const nextEnd = start + nextText.length;
  return { nextValue, nextStart, nextEnd };
}

export function MarkdownToolbarTextarea({
  label,
  name,
  value,
  onChange,
  placeholder,
  rows = 8,
  disabled,
}: MarkdownToolbarTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  function withSelection(handler: (start: number, end: number) => void) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    handler(textarea.selectionStart, textarea.selectionEnd);
    textarea.focus();
  }

  function applyWrapped(prefix: string, suffix = prefix, fallbackText = "text") {
    withSelection((start, end) => {
      const selected = value.slice(start, end);
      const text = selected.length > 0 ? selected : fallbackText;
      const wrapped = `${prefix}${text}${suffix}`;
      const { nextValue, nextStart, nextEnd } = updateSelection(
        value,
        start,
        end,
        wrapped,
      );
      onChange(nextValue);
      requestAnimationFrame(() => {
        textareaRef.current?.setSelectionRange(nextStart, nextEnd);
      });
    });
  }

  function applyLinePrefix(prefix: string, numbered = false) {
    withSelection((start, end) => {
      const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
      const lineEndIndex = value.indexOf("\n", end);
      const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
      const selectedBlock = value.slice(lineStart, lineEnd);
      const lines = selectedBlock.split("\n");
      const transformed = lines.map((line, index) => {
        if (!line.trim()) return line;
        if (numbered) return `${index + 1}. ${line.replace(/^\d+\.\s+/, "")}`;
        return `${prefix}${line.replace(/^[-*+]\s+/, "")}`;
      });
      const blockText = transformed.join("\n");
      const { nextValue, nextStart, nextEnd } = updateSelection(
        value,
        lineStart,
        lineEnd,
        blockText,
      );
      onChange(nextValue);
      requestAnimationFrame(() => {
        textareaRef.current?.setSelectionRange(nextStart, nextEnd);
      });
    });
  }

  function applyHeading() {
    withSelection((start, end) => {
      const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
      const lineEndIndex = value.indexOf("\n", end);
      const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
      const selectedBlock = value.slice(lineStart, lineEnd);
      const lines = selectedBlock
        .split("\n")
        .map((line) => (line.trim() ? `### ${line.replace(/^#{1,6}\s+/, "")}` : line));
      const blockText = lines.join("\n");
      const { nextValue, nextStart, nextEnd } = updateSelection(
        value,
        lineStart,
        lineEnd,
        blockText,
      );
      onChange(nextValue);
      requestAnimationFrame(() => {
        textareaRef.current?.setSelectionRange(nextStart, nextEnd);
      });
    });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm">
        {label}
      </Label>
      <div
        ref={containerRef}
        className="  border overflow-hidden border-border/60 bg-background"
      >
        <div className="flex flex-wrap items-center gap-1 bg-white border-b border-border/60 px-2 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyWrapped("**")}
            title="Bold"
            aria-label="Bold"
          >
            <Bold className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyWrapped("*")}
            title="Italic"
            aria-label="Italic"
          >
            <Italic className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={applyHeading}
            title="Heading"
            aria-label="Heading"
          >
            <Heading3 className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyLinePrefix("- ")}
            title="Bullet list"
            aria-label="Bullet list"
          >
            <List className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyLinePrefix("", true)}
            title="Numbered list"
            aria-label="Numbered list"
          >
            <ListOrdered className="size-3.5" />
          </Button>
          {/* <span className="ml-1 text-[11px] text-muted-foreground">
            Markdown supported: bold, italic, headings, bullet and numbered lists.
          </span> */}
        </div>
        <Textarea
          ref={textareaRef}
          id={name}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsEditing(true)}
          onBlur={(event) => {
            const next = event.relatedTarget;
            if (
              next instanceof Node &&
              containerRef.current?.contains(next)
            ) {
              return;
            }
            setIsEditing(false);
          }}
          disabled={disabled}
          rows={rows}
          placeholder={placeholder}
          className={`min-h-36 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 ${
            isEditing ? "block" : "hidden"
          } max-h-72 overflow-y-auto`}
        />
        {!isEditing && (
          <button
            type="button"
            onClick={() => {
              setIsEditing(true);
              requestAnimationFrame(() => textareaRef.current?.focus());
            }}
            disabled={disabled}
            className="block min-h-36 max-h-72 w-full overflow-y-auto px-3 py-2 text-left"
          >
            {value.trim().length > 0 ? (
              <MarkdownContent content={value} className="text-sm" />
            ) : (
              <span className="text-sm text-muted-foreground">
                {placeholder ?? "Write content..."}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
