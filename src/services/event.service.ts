import { prisma } from "../lib/prisma";

export type EventInput = {
  title: string;
  type: string;
  startTime: Date;
  userId: string;
};

/**
 * Creates an event and schedules its corresponding reminder jobs.
 */
export async function createEvent(input: EventInput) {
  // 1. Save event to database
  const event = await prisma.event.create({
    data: {
      title: input.title,
      type: input.type,
      startTime: input.startTime,
      userId: input.userId,
    },
  });

  // 2. Generate reminder jobs - passing the actual event.id
  await scheduleReminders({
    eventId: event.id,
    ...input,
  });

  return event;
}

/**
 * Deletes an event and cleans up all associated jobs in the queue.
 */
export async function deleteEvent(eventId: string) {
  // Delete associated jobs using the eventId stored in the JSON payload
  await prisma.job.deleteMany({
    where: {
      payload: {
        path: ["eventId"],
        equals: eventId,
      },
    },
  });

  // Delete the actual event
  return prisma.event.delete({
    where: { id: eventId },
  });
}

/**
 * Fetches events, optionally filtered by user.
 */
export async function getEvents(userId?: string) {
  const where = userId ? { userId } : {};

  return prisma.event.findMany({
    where,
    orderBy: {
      startTime: "asc",
    },
  });
}

/**
 * Helper to calculate and persist reminder/missed status jobs.
 */
async function scheduleReminders(data: EventInput & { eventId: string }) {
  const eventDate = new Date(data.startTime);
  const now = new Date();

  const schedules = [
    { type: "REMINDER", label: "3 days", offset: -3 * 24 * 60 * 60 * 1000 },
    { type: "REMINDER", label: "24 hours", offset: -24 * 60 * 60 * 1000 },
    { type: "REMINDER", label: "3 hours", offset: -3 * 60 * 60 * 1000 },
    { type: "REMINDER", label: "1 hour", offset: -60 * 60 * 1000 },
    { type: "REMINDER", label: "15 min", offset: -15 * 60 * 1000 },
    { type: "REMINDER", label: "now", offset: 0 },
    { type: "MISSED_10M", label: "missed 10m", offset: 10 * 60 * 1000 },
    { type: "MISSED_1H", label: "missed 1h", offset: 60 * 60 * 1000 },
    { type: "MISSED_24H", label: "missed 24h", offset: 24 * 60 * 60 * 1000 },
  ];

  // Map to runAt dates and filter for future tasks only
  const validSchedules = schedules
    .map((s) => ({
      type: s.type,
      runAt: new Date(eventDate.getTime() + s.offset),
    }))
    .filter(
      (job) => job.runAt > now || job.runAt.getTime() > now.getTime() - 60000,
    );

  if (validSchedules.length > 0) {
    await prisma.job.createMany({
      data: validSchedules.map((job) => ({
        type: job.type,
        runAt: job.runAt,
        payload: {
          eventId: data.eventId, // KEY FIX: Linked to event for deletion
          title: data.title,
          type: data.type,
          startTime: data.startTime,
          userId: data.userId,
        },
      })),
    });
  }

  return { jobCount: validSchedules.length };
}
