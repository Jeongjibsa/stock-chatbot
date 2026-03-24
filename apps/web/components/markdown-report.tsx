import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownReportProps = {
  content: string;
};

export function MarkdownReport({ content }: MarkdownReportProps) {
  return (
    <div className="report-prose max-w-none">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1>{children}</h1>,
          h2: ({ children }) => <h2>{children}</h2>,
          h3: ({ children }) => <h3>{children}</h3>,
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => <ul>{children}</ul>,
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote>
              {children}
            </blockquote>
          ),
          hr: () => <hr />,
          code: ({ children }) => <code>{children}</code>,
          pre: ({ children }) => <pre>{children}</pre>,
          strong: ({ children }) => <strong>{children}</strong>,
          a: ({ children, href }) => (
            <a
              className="font-semibold text-[color:var(--accent-strong)] underline decoration-[color:var(--line-strong)] underline-offset-4"
              href={href}
              rel="noreferrer"
              target="_blank"
            >
              {children}
            </a>
          )
        }}
        remarkPlugins={[remarkGfm]}
      >
        {normalizeBriefingMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}

export function normalizeBriefingMarkdown(content: string): string {
  return content
    .replace(/^\d+\.\s+#\s+/gm, "# ")
    .replace(/^\d+\.\s+❗\s+/gm, "> ❗ ")
    .replace(/^\d+\.\s+(?!#)(?!>)(.+)$/gm, "## $1");
}
