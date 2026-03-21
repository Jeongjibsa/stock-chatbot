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
        <div className="mx-auto max-w-[1120px] px-4 pb-14 pt-5 sm:px-6 lg:px-8">
          <header className="surface-panel sticky top-4 z-20 mb-10 flex items-center justify-between rounded-[22px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.88)] px-5 py-3 backdrop-blur-md">
            <Link className="flex items-center gap-3" href="/">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--foreground)] text-sm font-bold text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                SB
              </span>
              <div>
                <p className="text-sm font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">
                  Stock Briefing Bot
                </p>
                <p className="text-xs text-[color:var(--muted)]">
                  Public market archive
                </p>
              </div>
            </Link>
            <nav className="flex items-center gap-2">
              <Link
                className="rounded-xl px-3 py-2 text-sm font-medium text-[color:var(--muted)] transition hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--foreground)]"
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
