import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConsultActions } from "./consult-actions";
import { ConsultAddButton } from "./consult-add-button";

export const dynamic = "force-dynamic";

export default async function ConsultsPage() {
  const consults = await prisma.schedule.findMany({
    where: { category: "first_consult" },
    include: { instructor: true },
    orderBy: { scheduledAt: "asc" },
  });
  const instructors = await prisma.instructor.findMany({ orderBy: { createdAt: "asc" } });

  const upcoming = consults.filter((c) => c.status === "scheduled" && new Date(c.scheduledAt) >= new Date());
  const past = consults.filter((c) => c.status !== "scheduled" || new Date(c.scheduledAt) < new Date());

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-end">
        <ConsultAddButton instructors={instructors.map((i) => ({ id: i.id, name: i.name }))} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">今後の初回コンサル（{upcoming.length}件）</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">予定なし。ローテーション設定から生成してください。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2 font-medium">日付</th>
                    <th className="p-2 font-medium">時間</th>
                    <th className="p-2 font-medium">担当講師</th>
                    <th className="p-2 font-medium">参加者</th>
                    <th className="p-2 font-medium">メモ</th>
                    <th className="p-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-accent/50">
                      <td className="p-2">
                        {new Date(c.scheduledAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric", weekday: "short" })}
                      </td>
                      <td className="p-2">
                        {new Date(c.scheduledAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                        {c.endAt && ` - ${new Date(c.endAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`}
                      </td>
                      <td className="p-2 font-medium">{c.instructor.name}</td>
                      <td className="p-2 text-muted-foreground">{c.participantName || "—"}</td>
                      <td className="p-2 text-muted-foreground text-xs max-w-[200px] truncate">{c.memo || ""}</td>
                      <td className="p-2">
                        <ConsultActions consultId={c.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">過去の初回コンサル（{past.length}件）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm opacity-60">
                <tbody>
                  {past.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="p-2">
                        {new Date(c.scheduledAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                      </td>
                      <td className="p-2">{c.instructor.name}</td>
                      <td className="p-2 text-muted-foreground">{c.participantName || "—"}</td>
                      <td className="p-2">
                        <Badge variant={c.status === "completed" ? "default" : "destructive"} className="text-xs">
                          {c.status === "completed" ? "完了" : "キャンセル"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
