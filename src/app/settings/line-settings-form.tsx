"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Send, Save, Loader2 } from "lucide-react";

export function LineSettingsForm() {
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");
  const [groupId, setGroupId] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 現在の設定を読み込む
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setToken(data.LINE_CHANNEL_ACCESS_TOKEN || "");
        setSecret(data.LINE_CHANNEL_SECRET || "");
        setGroupId(data.LINE_GROUP_ID || "");
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          LINE_CHANNEL_ACCESS_TOKEN: token,
          LINE_CHANNEL_SECRET: secret,
          LINE_GROUP_ID: groupId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: "success", text: "設定を保存しました。" });
      } else {
        setMessage({ type: "error", text: "保存に失敗しました。" });
      }
    } catch {
      setMessage({ type: "error", text: "保存に失敗しました。" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!token || !groupId) {
      setMessage({ type: "error", text: "トークンとグループIDを入力して保存してからテストしてください。" });
      return;
    }
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/line/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, groupId }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: "success", text: "テスト通知を送信しました。LINEグループを確認してください。" });
      } else {
        setMessage({ type: "error", text: data.error || "送信に失敗しました。" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました。" });
    } finally {
      setTesting(false);
    }
  }

  const hasToken = !!token;
  const hasSecret = !!secret;
  const hasGroupId = !!groupId;
  const isConfigured = hasToken && hasGroupId;

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
          <CardTitle className="text-base">LINE API 設定</CardTitle>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isConfigured ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}>
            {isConfigured ? (
              <><CheckCircle className="h-3 w-3" />設定済み</>
            ) : (
              <><XCircle className="h-3 w-3" />未設定</>
            )}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <div className={`rounded-md p-3 text-sm ${
            message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-2">
          <Label>チャネルアクセストークン（長期）</Label>
          <Input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="LINE Developers → Messaging API設定 → チャネルアクセストークン"
            type="password"
          />
          <p className="text-xs text-muted-foreground">
            {hasToken ? <span className="text-green-600">設定済み（{token.slice(0, 8)}...）</span> : "未設定"}
          </p>
        </div>

        <div className="space-y-2">
          <Label>チャネルシークレット</Label>
          <Input
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="LINE Developers → チャネル基本設定 → チャネルシークレット"
            type="password"
          />
          <p className="text-xs text-muted-foreground">
            {hasSecret ? <span className="text-green-600">設定済み（{secret.slice(0, 6)}...）</span> : "未設定（Webhook検証用・任意）"}
          </p>
        </div>

        <div className="space-y-2">
          <Label>LINEグループID</Label>
          <Input
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            placeholder="C1234abcd... (Botがグループ参加時にサーバーログに出力)"
          />
          <p className="text-xs text-muted-foreground">
            {hasGroupId ? <span className="text-green-600">設定済み（{groupId.slice(0, 10)}...）</span> : "未設定"}
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            {saving ? "保存中..." : "設定を保存"}
          </Button>
          <Button onClick={handleTest} disabled={testing || !isConfigured} variant="outline" className="flex-1">
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            {testing ? "送信中..." : "テスト送信"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
