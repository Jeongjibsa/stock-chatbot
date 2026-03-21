import type { ReactNode } from "react";
import Link from "next/link";

import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Stock Briefing Bot",
  description: "공개 시장 브리핑 아카이브"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
          <header className="surface-panel sticky top-4 z-20 mb-8 flex items-center justify-between rounded-full px-5 py-3 shadow-[0_16px_48px_rgba(15,23,42,0.08)]">
            <Link className="flex items-center gap-3" href="/">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--accent)] text-sm font-bold text-white">
                SB
              </span>
              <div>
                <p className="text-sm font-semibold tracking-tight">Stock Briefing Bot</p>
                <p className="text-xs text-[color:var(--muted)]">
                  Public market archive
                </p>
              </div>
            </Link>
            <nav className="flex items-center gap-2">
              <Link
                className="rounded-full px-3 py-2 text-sm font-medium text-[color:var(--muted)] transition hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--foreground)]"
                href="/"
              >
                Feed
              </Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
