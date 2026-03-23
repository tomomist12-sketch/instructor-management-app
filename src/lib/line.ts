const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_GROUP_ID = process.env.LINE_GROUP_ID;

/**
 * LINEグループへ通知メッセージを送信する
 * LINE Messaging API の Push メッセージを使用
 *
 * 設定手順:
 * 1. LINE Developers (https://developers.line.biz/) でMessaging APIチャネルを作成
 * 2. チャネルアクセストークン(長期)を発行し .env の LINE_CHANNEL_ACCESS_TOKEN に設定
 * 3. Botを講師用LINEグループに招待
 * 4. Webhook URL に https://<your-domain>/api/line/webhook を設定
 * 5. Botがグループ参加時にサーバーログに表示されるグループIDを .env の LINE_GROUP_ID に設定
 */
export async function sendLineNotification(message: string): Promise<boolean> {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_GROUP_ID) {
    console.log("[LINE グループ通知 - 未設定]", message);
    return false;
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: LINE_GROUP_ID,
        messages: [{ type: "text", text: message }],
      }),
    });

    if (!res.ok) {
      console.error("[LINE グループ通知エラー]", res.status, await res.text());
      return false;
    }

    console.log("[LINE グループ通知 送信成功]");
    return true;
  } catch (error) {
    console.error("[LINE グループ通知エラー]", error);
    return false;
  }
}
