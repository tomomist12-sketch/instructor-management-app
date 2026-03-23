import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.notificationSetting.findMany();
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const { timing, timeOfDay, enabled } = await req.json();
  const setting = await prisma.notificationSetting.create({
    data: { timing, timeOfDay: timeOfDay || "09:00", enabled: enabled ?? true },
  });
  return NextResponse.json(setting);
}

export async function PUT(req: NextRequest) {
  const { id, timing, timeOfDay, enabled } = await req.json();
  const setting = await prisma.notificationSetting.update({
    where: { id },
    data: { timing, timeOfDay, enabled },
  });
  return NextResponse.json(setting);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.notificationSetting.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
