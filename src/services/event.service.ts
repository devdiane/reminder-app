import { prisma } from "../lib/prisma";

export type EventInput = {
  title: string;
  type: string;
  startTime: Date;
  userId: string;
};

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

  // 2. Generate reminder jobs
  await scheduleReminders({
    title: input.title,
    type: input.type,
    startTime: input.startTime,
    userId: input.userId,
  });

  return event;
}

export async function deleteEvent(eventId: string) {
  // Delete associated jobs first
  const payload = await prisma.job.findFirst({
    where: {
      payload: {
        path: ["eventId"],
        equals: eventId,
      },
    },
    select: { payload: true },
  });

  if (payload) {
    await prisma.job.deleteMany({
      where: {
        payload: {
          path: ["eventId"],
          equals: eventId,
        },
      },
    });
  }

  // Delete event
  return prisma.event.delete({
    where: { id: eventId },
  });
}

export async function getEvents(userId?: string) {
  const where = userId ? { userId } : {};

  return prisma.event.findMany({
    where,
    orderBy: {
      startTime: "asc",
    },
  });
}

async function scheduleReminders(data: {
  title: string;
  type: string;
  startTime: Date;
  userId: string;
}) {
  const eventDate = new Date(data.startTime);

  const schedules = [
    {
      type: "REMINDER",
      label: "3 days",
      runAt: new Date(eventDate.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      type: "REMINDER",
      label: "24 hours",
      runAt: new Date(eventDate.getTime() - 24 * 60 * 60 * 1000),
    },
    {
      type: "REMINDER",
      label: "3 hours",
      runAt: new Date(eventDate.getTime() - 3 * 60 * 60 * 1000),
    },
    {
      type: "REMINDER",
      label: "1 hour",
      runAt: new Date(eventDate.getTime() - 60 * 60 * 1000),
    },
    {
      type: "REMINDER",
      label: "15 min",
      runAt: new Date(eventDate.getTime() - 15 * 60 * 1000),
    },
    {
      type: "REMINDER",
      label: "now",
      runAt: eventDate,
    },

    // missed reminders
    {
      type: "MISSED_10M",
      label: "missed 10m",
      runAt: new Date(eventDate.getTime() + 10 * 60 * 1000),
    },
    {
      type: "MISSED_1H",
      label: "missed 1h",
      runAt: new Date(eventDate.getTime() + 60 * 60 * 1000),
    },
    {
      type: "MISSED_24H",
      label: "missed 24h",
      runAt: new Date(eventDate.getTime() + 24 * 60 * 60 * 1000),
    },
  ];

  // Create jobs only if runAt is in the future (or very recent past within 1 minute for "now" reminder)
  const now = new Date();
  const validSchedules = schedules.filter(
    (job) => job.runAt > now || job.runAt.getTime() > now.getTime() - 60 * 1000,
  );

  if (validSchedules.length > 0) {
    await prisma.job.createMany({
      data: validSchedules.map((job) => ({
        type: job.type,
        runAt: job.runAt,
        payload: {
          title: data.title,
          type: data.type,
          startTime: data.startTime,
          userId: data.userId,
        },
      })),
    });
  }

  return { event, jobCount: validSchedules.length };
}
