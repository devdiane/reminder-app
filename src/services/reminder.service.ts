import { addJob } from "./jobQueue.service";

type EventPayload = {
  id: string;
  title: string;
  type: string;
  startTime: Date;
};

export async function scheduleReminders(event: EventPayload) {
  const eventTime = new Date(event.startTime).getTime();
  const now = Date.now();

  // Prevent invalid events
  if (!event.id || isNaN(eventTime)) return;

  const reminders = [
    { label: "3 days", offset: 3 * 24 * 60 * 60 * 1000 },
    { label: "24 hours", offset: 24 * 60 * 60 * 1000 },
    { label: "3 hours", offset: 3 * 60 * 60 * 1000 },
    { label: "1 hour", offset: 60 * 60 * 1000 },
    { label: "15 min", offset: 15 * 60 * 1000 },
    { label: "now", offset: 0 },
  ];

  // Remove old jobs for this event (prevents duplicates)
  await addJob("CLEANUP", { eventId: event.id }, new Date());

  // ACTIVE REMINDERS (only future jobs)
  const reminderJobs = reminders
    .map((r) => {
      const runAt = new Date(eventTime - r.offset);

      if (runAt.getTime() <= now) return null;

      return addJob(
        "REMINDER",
        {
          eventId: event.id,
          title: event.title,
          type: event.type,
          label: r.label,
          startTime: event.startTime,
        },
        runAt,
      );
    })
    .filter(Boolean);

  // MISSED ALERTS (only if event is in future)
  if (eventTime > now) {
    await Promise.all([
      addJob(
        "MISSED_10M",
        {
          eventId: event.id,
          title: event.title,
          type: event.type,
          startTime: event.startTime,
        },
        new Date(eventTime + 10 * 60 * 1000),
      ),

      addJob(
        "MISSED_1H",
        {
          eventId: event.id,
          title: event.title,
          type: event.type,
          startTime: event.startTime,
        },
        new Date(eventTime + 60 * 60 * 1000),
      ),

      addJob(
        "MISSED_24H",
        {
          eventId: event.id,
          title: event.title,
          type: event.type,
          startTime: event.startTime,
        },
        new Date(eventTime + 24 * 60 * 60 * 1000),
      ),
    ]);
  }

  await Promise.all(reminderJobs);

  return {
    eventId: event.id,
    totalReminders: reminderJobs.length,
  };
}
