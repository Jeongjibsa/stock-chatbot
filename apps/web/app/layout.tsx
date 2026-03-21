import type { ReactNode } from "react";

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
      <body>{children}</body>
    </html>
  );
}
