import { prisma } from "./prisma";

type EventPayload = {
  title: string;
  type: string;
  startTime: Date;
  userId: string;
};

export async function scheduleReminders(data: EventPayload) {
  const eventDate = new Date(data.startTime);

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
    {
      type: "REMINDER",
      runAt: new Date(eventDate.getTime() - 60 * 60 * 1000),
    },
    {
      type: "REMINDER",
      runAt: new Date(eventDate.getTime() - 15 * 60 * 1000),
    },
    {
      type: "REMINDER",
      runAt: eventDate,
    },

    // missed reminders
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

  await prisma.job.createMany({
    data: schedules.map((job) => ({
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
