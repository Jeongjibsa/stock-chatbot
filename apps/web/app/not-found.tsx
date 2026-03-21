import Link from "next/link";

import { Card, CardContent } from "../components/ui/card";

export default function NotFoundPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Card>
        <CardContent className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
            Not Found
          </p>
          <h1 className="text-2xl font-semibold">브리핑을 찾을 수 없습니다.</h1>
          <p className="text-sm leading-7 text-[color:var(--muted)]">
            삭제되었거나 아직 공개 저장이 완료되지 않은 브리핑일 수 있습니다.
          </p>
          <Link className="text-sm font-semibold text-[color:var(--accent)]" href="/">
            공개 브리핑 피드로 돌아가기
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
