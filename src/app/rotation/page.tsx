import { prisma } from "@/lib/prisma";
import { RotationForm } from "./rotation-form";
import { LineReplyForm } from "./line-reply-form";

export const dynamic = "force-dynamic";

export default async function RotationPage() {
  const instructors = await prisma.instructor.findMany({ orderBy: { createdAt: "asc" } });
  const settings = await prisma.rotationSetting.findMany();
  const instList = instructors.map((i) => ({ id: i.id, name: i.name }));

  return (
    <div className="space-y-8 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        各業務の繰り返しパターンを設定します。保存後に「予定を生成」でシフト表に自動反映されます。
      </p>

      {/* 1. ライン返信: 曜日ごと固定担当 */}
      <LineReplyForm
        instructors={instList}
        settings={settings.filter((s) => s.category === "line_reply")}
      />

      {/* 2. 初回コンサル: 週替わりローテーション */}
      <RotationForm
        category="first_consult"
        categoryLabel="初回コンサル"
        instructors={instList}
        existing={settings.find((s) => s.category === "first_consult") || null}
        defaultStartTime="21:00"
        defaultEndTime="22:00"
        showTime
      />

      {/* 3. ライブトーク: 週替わりローテーション（時間はシフト表から後で編集） */}
      <RotationForm
        category="live_talk"
        categoryLabel="ライブトーク"
        instructors={instList}
        existing={settings.find((s) => s.category === "live_talk") || null}
        defaultStartTime=""
        defaultEndTime=""
        showTime={false}
        note="※ 時間は毎回異なるため、シフト表のバッジをクリックして個別に編集してください"
      />

      {/* 4. 勉強会: 週替わりローテーション */}
      <RotationForm
        category="study_group"
        categoryLabel="勉強会"
        instructors={instList}
        existing={settings.find((s) => s.category === "study_group") || null}
        defaultStartTime="14:00"
        defaultEndTime="15:30"
        showTime
      />

      {/* 5. 音声コラム: 週替わりローテーション */}
      <RotationForm
        category="column"
        categoryLabel="音声コラム"
        instructors={instList}
        existing={settings.find((s) => s.category === "column") || null}
        defaultStartTime=""
        defaultEndTime=""
        showTime={false}
        note="※ 時間はシフト表のバッジをクリックして個別に編集してください"
      />
    </div>
  );
}
