import { Card, CardContent } from "./ui/card";

export function FeedEmptyState() {
  return (
    <Card>
      <CardContent className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
          Empty State
        </p>
        <h2 className="text-xl font-semibold">아직 공개 브리핑이 없습니다.</h2>
        <p className="text-sm leading-6 text-[color:var(--muted)]">
          daily report worker가 첫 공개 브리핑을 저장하면 이 화면에 최신순 feed가 표시됩니다.
        </p>
      </CardContent>
    </Card>
  );
}
