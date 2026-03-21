import { Card, CardContent } from "./ui/card";

export function FeedErrorState() {
  return (
    <Card className="border-red-200/80 bg-red-50/70 dark:border-red-500/20 dark:bg-red-950/20">
      <CardContent className="space-y-3">
        <p className="kicker text-red-700 dark:text-red-300">
          Error
        </p>
        <h2 className="text-xl font-semibold tracking-tight">
          공개 브리핑을 불러오지 못했습니다.
        </h2>
        <p className="text-sm leading-7 text-[color:var(--muted)]">
          데이터베이스 연결이나 공개 브리핑 생성 경로를 확인해 주세요.
        </p>
      </CardContent>
    </Card>
  );
}
