import { getEvents } from "@/services/event.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    const events = await getEvents(userId || undefined);

    return NextResponse.json({ events });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}
