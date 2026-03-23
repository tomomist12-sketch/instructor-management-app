import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");

function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z_]+)=["']?(.*)["']?$/);
    if (match) result[match[1]] = match[2].replace(/["']/g, "");
  }
  return result;
}

export async function GET() {
  const content = fs.readFileSync(envPath, "utf-8");
  const env = parseEnv(content);
  return NextResponse.json({
    LINE_CHANNEL_ACCESS_TOKEN: env.LINE_CHANNEL_ACCESS_TOKEN || "",
    LINE_CHANNEL_SECRET: env.LINE_CHANNEL_SECRET || "",
    LINE_GROUP_ID: env.LINE_GROUP_ID || "",
  });
}

export async function POST(req: NextRequest) {
  const { LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET, LINE_GROUP_ID } = await req.json();

  const content = fs.readFileSync(envPath, "utf-8");
  let updated = content;

  function setEnvValue(fileContent: string, key: string, value: string): string {
    const regex = new RegExp(`^${key}=.*$`, "m");
    const newLine = `${key}="${value}"`;
    if (regex.test(fileContent)) {
      return fileContent.replace(regex, newLine);
    }
    return fileContent + `\n${newLine}`;
  }

  if (LINE_CHANNEL_ACCESS_TOKEN !== undefined) {
    updated = setEnvValue(updated, "LINE_CHANNEL_ACCESS_TOKEN", LINE_CHANNEL_ACCESS_TOKEN);
    process.env.LINE_CHANNEL_ACCESS_TOKEN = LINE_CHANNEL_ACCESS_TOKEN;
  }
  if (LINE_CHANNEL_SECRET !== undefined) {
    updated = setEnvValue(updated, "LINE_CHANNEL_SECRET", LINE_CHANNEL_SECRET);
    process.env.LINE_CHANNEL_SECRET = LINE_CHANNEL_SECRET;
  }
  if (LINE_GROUP_ID !== undefined) {
    updated = setEnvValue(updated, "LINE_GROUP_ID", LINE_GROUP_ID);
    process.env.LINE_GROUP_ID = LINE_GROUP_ID;
  }

  fs.writeFileSync(envPath, updated, "utf-8");

  return NextResponse.json({ ok: true });
}
