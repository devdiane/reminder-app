import { addJob } from "./jobQueue.service";

export async function scheduleReminders(event: any) {
  const eventTime = new Date(event.startTime).getTime();

  const reminders = [
    { label: "3 days", offset: 3 * 24 * 60 * 60 * 1000 },
    { label: "24 hours", offset: 24 * 60 * 60 * 1000 },
    { label: "3 hours", offset: 3 * 60 * 60 * 1000 },
    { label: "1 hour", offset: 60 * 60 * 1000 },
    { label: "15 min", offset: 15 * 60 * 1000 },
    { label: "now", offset: 0 },
  ];

  for (const r of reminders) {
    const runAt = new Date(eventTime - r.offset);

    if (runAt > new Date()) {
      await addJob(
        "REMINDER",
        {
          eventId: event.id,
          title: event.title,
          type: event.type,
          label: r.label,
        },
        runAt,
      );
    }
  }

  // missed alerts
  await addJob(
    "MISSED_10M",
    { eventId: event.id },
    new Date(eventTime + 10 * 60 * 1000),
  );
  await addJob(
    "MISSED_1H",
    { eventId: event.id },
    new Date(eventTime + 60 * 60 * 1000),
  );
  await addJob(
    "MISSED_24H",
    { eventId: event.id },
    new Date(eventTime + 24 * 60 * 60 * 1000),
  );
}
