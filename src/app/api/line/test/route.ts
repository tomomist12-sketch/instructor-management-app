import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { token, groupId } = await req.json();

  if (!token || !groupId) {
    return NextResponse.json({ ok: false, error: "トークンとグループIDが必要です" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: groupId,
        messages: [{
          type: "text",
          text: "講師業務管理アプリからのテスト通知です。\nこのメッセージが届いていれば、LINE通知の設定は正常です。",
        }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ ok: false, error: `LINE API エラー (${res.status}): ${body}` });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: `通信エラー: ${e instanceof Error ? e.message : "不明"}` });
  }
}
