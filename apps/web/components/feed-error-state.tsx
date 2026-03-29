import { Card, CardContent } from "./ui/card";

export function FeedErrorState() {
  return (
    <Card className="border-[color:var(--line-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.9))]">
      <CardContent className="flex flex-col gap-4">
        <p className="section-label text-[color:var(--accent-strong)]">
          Error
        </p>
        <h2 className="text-[1.6rem] font-semibold tracking-[-0.035em] text-[color:var(--foreground)]">
          공개 브리핑을 불러오지 못했습니다.
        </h2>
        <p className="text-[0.95rem] leading-8 text-[color:var(--muted)]">
          데이터베이스 연결이나 공개 브리핑 생성 경로를 확인해 주세요.
        </p>
      </CardContent>
    </Card>
  );
}
