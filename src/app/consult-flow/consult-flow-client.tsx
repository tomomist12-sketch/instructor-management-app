"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Copy, ExternalLink, AlertCircle, Users } from "lucide-react";
import { ConsultActions } from "@/app/consults/consult-actions";
import { ConsultAddButton } from "@/app/consults/consult-add-button";

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 text-xs">
          {copied ? <><Check className="h-3 w-3 mr-1 text-green-600" />コピー済み</> : <><Copy className="h-3 w-3 mr-1" />コピー</>}
        </Button>
      </div>
      <p className="text-sm whitespace-pre-wrap leading-relaxed">{text}</p>
    </div>
  );
}

function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
      <ExternalLink className="h-3.5 w-3.5" />{label}
    </a>
  );
}

type Participant = {
  name: string;
  instructorName: string;
};

type UpcomingConsult = {
  id: string;
  scheduledAt: string;
  endAt: string | null;
  instructorName: string;
  participantName: string | null;
  memo: string | null;
};

type PastConsult = {
  id: string;
  scheduledAt: string;
  instructorName: string;
  participantName: string | null;
  status: string;
};

type Props = {
  zoomUrl: string;
  consultTime: string;
  consultDate: string;
  isToday: boolean;
  instructorName: string;
  participants: Participant[];
  upcomingConsults: UpcomingConsult[];
  pastConsults: PastConsult[];
  instructors: { id: string; name: string }[];
};

export function ConsultFlowClient({
  zoomUrl, consultTime, consultDate, isToday, instructorName,
  participants, upcomingConsults, pastConsults, instructors,
}: Props) {
  const timeText = consultTime || "21時";

  return (
    <Tabs defaultValue="flow" className="max-w-3xl">
      <TabsList>
        <TabsTrigger value="flow">当日の流れ</TabsTrigger>
        <TabsTrigger value="list">コンサル一覧</TabsTrigger>
      </TabsList>

      <TabsContent value="flow" className="space-y-6 max-w-2xl">
        {/* 今日の予定情報 */}
        {consultDate ? (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant={isToday ? "default" : "secondary"} className="text-sm px-3 py-1">
                {isToday ? "本日" : "次回"}
              </Badge>
              <div>
                <p className="text-sm font-medium">{consultDate} {consultTime}</p>
                {instructorName && <p className="text-xs text-muted-foreground">担当: {instructorName}</p>}
              </div>
              {zoomUrl ? (
                <a href={zoomUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-blue-600 hover:underline">
                  Zoom開く
                </a>
              ) : (
                <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />Zoom URL未設定
                </span>
              )}
            </div>
            {/* 参加者情報 */}
            {isToday && participants.length > 0 && (
              <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3">
                <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">参加者 {participants.length}名</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {participants.map((p, i) => (
                      <Badge key={i} variant="outline" className="text-xs font-normal">
                        {p.name || "名前未設定"}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">予定されている初回コンサルはありません</p>
        )}

        {/* Step 1 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-cyan-800 text-xs font-bold">1</span>
              当日の午前〜昼にリマインドを送る
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CopyBlock
              label="リマインド文"
              text={`@さん
お疲れ様です！本日${timeText}より初回コンサルよろしくお願いいたします✨
お時間になりましたらzoomのリンクをお送りいたしますね👀`}
            />
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-cyan-800 text-xs font-bold">2</span>
              当日30分前までにZoomリンクを送る
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CopyBlock
              label="Zoomリンク送付文"
              text={`@さん
本日${timeText}よりzoomのご参加をお願いします✨

${zoomUrl || "（Zoom URL未取得）"}

パスワード無しでご参加いただけます！`}
            />
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-cyan-800 text-xs font-bold">3</span>
              スライドをもとに初回コンサルを行う
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LinkButton
              href="https://docs.google.com/presentation/d/18A3yDWzsMueeFTEm72qMSvEFk0n1KGDgaAUauUaPW6I/edit?slide=id.g286fd708114_0_0#slide=id.g286fd708114_0_0"
              label="初回コンサル用スライドを開く"
            />
          </CardContent>
        </Card>

        {/* Step 4 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-cyan-800 text-xs font-bold">4</span>
              アウトプットを依頼する
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock
              label="アウトプット依頼文"
              text={`@さん
初回コンサルお疲れ様でした！

これから頑張っていきましょう🔥
zoomでお伝えした公式LINEにご登録をお願いします！

【サポートLINE】
ebayのご質問は、下記公式LINEにてお願いします👇
https://lin.ee/PCzDzOm

【仕入れ同行告知LINE】
仕入れ同行の募集が決まれば、お知らせをするLINEです！
https://utage-system.com/line/open/3dnyVL8KS69C

【運営公式LINE】
運営からの重要なお知らせを配信します！
https://utage-system.com/line/open/46ScnLOVx1Zu

また、ZOOMでもお伝えさせていただいた通り、初回コンサルの感想と今後の意気込みを、以下のLINEグループに投稿していただきたいです！

オープンチャット「🌏物販ONE【ebay部門】」
https://line.me/ti/g2/TlyaNUZzHg-n2TZOpOhN0v1-pW2yQQnljdLkUQ?utm_source=invitation&utm_medium=link_copy&utm_campaign=default`}
            />
            <div className="pt-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">特典資料</p>
              <LinkButton
                href="https://drive.google.com/file/d/10H8yK66Wi3_SOO84QM60dbJegR9pCnoO/view"
                label="特典PDFを開く"
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="list" className="space-y-6">
        <div className="flex justify-end">
          <ConsultAddButton instructors={instructors} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">今後の初回コンサル（{upcomingConsults.length}件）</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingConsults.length === 0 ? (
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
                    {upcomingConsults.map((c) => (
                      <tr key={c.id} className="border-b hover:bg-accent/50">
                        <td className="p-2">
                          {new Date(c.scheduledAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "short", day: "numeric", weekday: "short" })}
                        </td>
                        <td className="p-2">
                          {new Date(c.scheduledAt).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" })}
                          {c.endAt && ` - ${new Date(c.endAt).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" })}`}
                        </td>
                        <td className="p-2 font-medium">{c.instructorName}</td>
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

        {pastConsults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-muted-foreground">過去の初回コンサル（{pastConsults.length}件）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm opacity-60">
                  <tbody>
                    {pastConsults.map((c) => (
                      <tr key={c.id} className="border-b">
                        <td className="p-2">
                          {new Date(c.scheduledAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "short", day: "numeric" })}
                        </td>
                        <td className="p-2">{c.instructorName}</td>
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
      </TabsContent>
    </Tabs>
  );
}
