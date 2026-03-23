"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Loader2, Bell } from "lucide-react";

type Setting = {
  id: string;
  timing: string;
  timeOfDay: string;
  enabled: boolean;
};

const timingOptions = [
  { value: "same_day_morning", label: "当日の朝" },
  { value: "1_day_before", label: "1日前" },
  { value: "2_days_before", label: "2日前" },
  { value: "3_days_before", label: "3日前" },
  { value: "1_week_before", label: "1週間前" },
];

export function NotificationTimingForm() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/notification-settings")
      .then((r) => r.json())
      .then((data) => { setSettings(data); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  async function handleAdd() {
    setSaving(true);
    try {
      const res = await fetch("/api/notification-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timing: "same_day_morning", timeOfDay: "09:00", enabled: true }),
      });
      const s = await res.json();
      setSettings([...settings, s]);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(setting: Setting) {
    setSaving(true);
    try {
      await fetch("/api/notification-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setting),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    try {
      await fetch("/api/notification-settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setSettings(settings.filter((s) => s.id !== id));
    } finally {
      setSaving(false);
    }
  }

  function updateSetting(id: string, field: Partial<Setting>) {
    setSettings(settings.map((s) => s.id === id ? { ...s, ...field } : s));
  }

  if (!loaded) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            通知タイミング設定
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleAdd} disabled={saving}>
            <Plus className="h-4 w-4 mr-1" />追加
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {settings.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            通知タイミングが設定されていません。「追加」ボタンで設定してください。
          </p>
        )}
        {settings.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-lg border p-3">
            <input
              type="checkbox"
              checked={s.enabled}
              onChange={(e) => {
                updateSetting(s.id, { enabled: e.target.checked });
                handleUpdate({ ...s, enabled: e.target.checked });
              }}
              className="h-4 w-4 rounded"
            />
            <select
              value={s.timing}
              onChange={(e) => {
                updateSetting(s.id, { timing: e.target.value });
                handleUpdate({ ...s, timing: e.target.value });
              }}
              className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              {timingOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">通知時刻</Label>
              <Input
                type="time"
                value={s.timeOfDay}
                onChange={(e) => {
                  updateSetting(s.id, { timeOfDay: e.target.value });
                  handleUpdate({ ...s, timeOfDay: e.target.value });
                }}
                className="w-24 h-9"
              />
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => handleDelete(s.id)}
              disabled={saving}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          予定の開始日時に対して、指定したタイミング・時刻にLINEグループへ自動通知を送信します。
        </p>
      </CardContent>
    </Card>
  );
}
