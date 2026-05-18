import { prisma } from "@/lib/prisma";
import { getEvents } from "@/services/event.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // 🔐 VERIFY: Check user exists and has Telegram chat ID connected
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });

    if (!user || !user.telegramChatId) {
      return NextResponse.json(
        {
          error:
            "Telegram connection required. Use /start command in bot to connect.",
        },
        { status: 403 },
      );
    }

    const events = await getEvents(userId);

    return NextResponse.json({ events });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}
