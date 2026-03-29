import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

export function MarkdownContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-neutral max-w-none text-base leading-relaxed",
        "prose-p:my-2 prose-headings:mt-5 prose-headings:mb-2 prose-li:my-1",
        "prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-6 prose-ol:pl-6",
        "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
        "prose-strong:text-foreground prose-em:text-foreground/90",
        "prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-pre:rounded-md prose-pre:bg-muted",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1 pl-6">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-6">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
