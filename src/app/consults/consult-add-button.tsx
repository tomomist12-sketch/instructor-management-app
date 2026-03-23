"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SimpleModal } from "@/components/simple-modal";
import { Plus } from "lucide-react";
import { createSchedule } from "@/app/actions/schedules";

type Props = {
  instructors: { id: string; name: string }[];
};

export function ConsultAddButton({ instructors }: Props) {
  const [open, setOpen] = useState(false);
  const [instructorId, setInstructorId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!instructorId) { setError("担当講師を選択してください"); return; }
    if (!scheduledAt) { setError("日時を入力してください"); return; }
    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("category", "first_consult");
      fd.set("title", "初回コンサル");
      fd.set("instructorId", instructorId);
      fd.set("participantName", participantName);
      fd.set("scheduledAt", scheduledAt);
      fd.set("endAt", endAt);
      fd.set("memo", memo);
      fd.set("repeat", "none");
      fd.set("repeatCount", "1");
      await createSchedule(fd);
      setInstructorId("");
      setScheduledAt("");
      setEndAt("");
      setParticipantName("");
      setMemo("");
      setOpen(false);
    } catch (e) {
      setError("保存に失敗しました: " + (e instanceof Error ? e.message : ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />初回コンサルを追加
      </button>
      <SimpleModal open={open} onClose={() => setOpen(false)} title="初回コンサルを追加">
        <div className="space-y-4">
          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{error}</p>}
          <div className="space-y-2">
            <Label>担当講師</Label>
            <select value={instructorId} onChange={(e) => setInstructorId(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
              <option value="">選択してください</option>
              {instructors.map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>参加者名（任意）</Label>
            <Input value={participantName} onChange={(e) => setParticipantName(e.target.value)} placeholder="例: 佐藤さん" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>開始日時</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>終了日時（任意）</Label>
              <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>メモ</Label>
            <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border px-4 py-2 text-sm">キャンセル</button>
            <Button onClick={handleSave} disabled={loading}>{loading ? "保存中..." : "追加"}</Button>
          </div>
        </div>
      </SimpleModal>
    </>
  );
}
