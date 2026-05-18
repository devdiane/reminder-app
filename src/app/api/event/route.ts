import { createEvent, deleteEvent } from "@/services/event.service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { title, type, startTime, userId } = body;

    if (!title || !type || !startTime || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const event = await createEvent({
      title,
      type,
      startTime: new Date(startTime),
      userId,
    });

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    await deleteEvent(eventId, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);

    const message =
      error instanceof Error ? error.message : "Failed to delete event";
    const status = message.includes("unauthorized") ? 403 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
