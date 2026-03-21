import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownReportProps = {
  content: string;
};

export function MarkdownReport({ content }: MarkdownReportProps) {
  return (
    <div className="report-prose prose prose-slate max-w-none dark:prose-invert prose-headings:scroll-m-20 prose-p:leading-7 prose-li:leading-7 prose-strong:font-semibold prose-code:font-medium">
      <ReactMarkdown
        components={{
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 pl-4 text-[color:var(--muted)]">
              {children}
            </blockquote>
          )
        }}
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
