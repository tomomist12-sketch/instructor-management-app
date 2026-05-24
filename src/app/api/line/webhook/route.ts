import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.text();

  console.log("=== LINE Webhook受信 ===");

  let data;
  try {
    data = JSON.parse(body);
  } catch {
    console.log("JSONパース失敗:", body.substring(0, 200));
    return NextResponse.json({ status: "ok" });
  }

  console.log("イベント数:", data.events?.length || 0);

  for (const event of data.events || []) {
    console.log("イベントタイプ:", event.type, "ソース:", JSON.stringify(event.source));

    // グループ関連のイベントからグループIDを取得
    if (event.source?.type === "group") {
      console.log("==============================================");
      console.log("LINE グループID を検出しました:");
      console.log(event.source.groupId);
      console.log("==============================================");
    }

    // テキストメッセージに「コラム」が含まれていたらコラム投稿ログに記録
    if (event.type === "message" && event.message?.type === "text") {
      const text: string = event.message.text || "";
      if (text.includes("コラム")) {
        await prisma.columnPostLog.create({ data: {} });
        console.log("[ColumnPostLog] 記録:", text);
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}

export async function GET() {
  return NextResponse.json({ status: "LINE Webhook endpoint is active" });
}
