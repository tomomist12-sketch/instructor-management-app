import { LineSettingsForm } from "./line-settings-form";
import { NotificationTimingForm } from "./notification-timing-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <NotificationTimingForm />
      <LineSettingsForm />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">LINE通知の送り方</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>シフト一覧の予定バッジをクリック → 詳細の「LINE通知」ボタンで手動送信</li>
            <li>上で設定した通知タイミングに従い、予定の◯日前・当日朝などに自動で通知されます</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
