import { prisma } from "./prisma";

// Add id to the payload so we can link jobs to the specific event
type EventPayload = {
  id: string; // Added this
  title: string;
  type: string;
  startTime: Date;
  userId: string;
};

export async function scheduleReminders(data: EventPayload) {
  const eventDate = new Date(data.startTime);
  const now = new Date();

  const schedules = [
    {
      type: "REMINDER",
      runAt: new Date(eventDate.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      type: "REMINDER",
      runAt: new Date(eventDate.getTime() - 24 * 60 * 60 * 1000),
    },
    {
      type: "REMINDER",
      runAt: new Date(eventDate.getTime() - 3 * 60 * 60 * 1000),
    },
    { type: "REMINDER", runAt: new Date(eventDate.getTime() - 60 * 60 * 1000) },
    { type: "REMINDER", runAt: new Date(eventDate.getTime() - 15 * 60 * 1000) },
    { type: "REMINDER", runAt: eventDate },
    {
      type: "MISSED_10M",
      runAt: new Date(eventDate.getTime() + 10 * 60 * 1000),
    },
    {
      type: "MISSED_1H",
      runAt: new Date(eventDate.getTime() + 60 * 60 * 1000),
    },
    {
      type: "MISSED_24H",
      runAt: new Date(eventDate.getTime() + 24 * 60 * 60 * 1000),
    },
  ];

  // Filter out schedules that are already in the past
  const futureSchedules = schedules.filter((s) => s.runAt > now);

  if (futureSchedules.length === 0) return;

  await prisma.job.createMany({
    data: futureSchedules.map((job) => ({
      type: job.type,
      runAt: job.runAt,
      payload: {
        id: data.id, // Event ID for reference
        eventId: data.id, // Crucial for deleteEvent logic
        title: data.title,
        type: data.type,
        startTime: data.startTime,
        userId: data.userId, // ✅ Required for sending Telegram messages
      },
    })),
  });
}
