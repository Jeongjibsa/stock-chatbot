import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownReportProps = {
  content: string;
};

export function MarkdownReport({ content }: MarkdownReportProps) {
  return (
    <div className="prose prose-stone max-w-none dark:prose-invert prose-headings:font-semibold prose-p:leading-7 prose-li:leading-7">
      <ReactMarkdown
        components={{
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-[color:var(--line)] pl-4 text-[color:var(--muted)]">
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
