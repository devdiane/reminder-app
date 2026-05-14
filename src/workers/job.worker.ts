import { prisma } from "../lib/prisma";
import { sendTelegramMessage } from "../services/telegram.service";

async function processJobs() {
  const now = new Date();

  const jobs = await prisma.job.findMany({
    where: {
      runAt: { lte: now },
      status: "PENDING",
    },
  });

  if (jobs.length === 0) return;

  for (const job of jobs) {
    try {
      console.log("PROCESSING:", job.type);

      const payload = job.payload as any;

      // mark as processing FIRST to avoid duplicates
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "DONE" },
      });

      switch (job.type) {
        case "REMINDER": {
          const message = buildReminderMessage(payload);
          await sendTelegramMessage(payload.userId, message);
          break;
        }

        case "MISSED_10M":
        case "MISSED_1H":
        case "MISSED_24H": {
          const message = buildMissedMessage(payload);
          await sendTelegramMessage(payload.userId, message);
          break;
        }

        default:
          console.log("Unknown job type:", job.type);
      }
    } catch (error) {
      console.error("Job failed:", job.id, error);

      // optional: revert status if failed
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "FAILED" },
      });
    }
  }
}

function buildReminderMessage(payload: any) {
  const date = new Date(payload.eventTime).toLocaleString();

  const hoursLeft = Math.max(
    0,
    Math.round((new Date(payload.eventTime).getTime() - Date.now()) / 3600000),
  );

  if (payload.type === "DEADLINE") {
    return `📌 Reminder: You have a deadline on ${date}.
⏳ You have ${hoursLeft} hours left before deadline.`;
  }

  if (payload.type === "MEETING") {
    return `📅 Reminder: You have a meeting on ${date}.
⏳ You have ${hoursLeft} hours left before meeting.`;
  }

  if (payload.type === "BUSINESS_TRIP") {
    return `✈️ Reminder: You have a business trip on ${date}.
⏳ You have ${hoursLeft} hours left before trip.`;
  }

  return `Reminder: You have an event on ${date}`;
}

function buildMissedMessage(payload: any) {
  const date = new Date(payload.eventTime).toLocaleString();

  if (payload.type === "DEADLINE") {
    return `🚨 Urgent Reminder: You missed the deadline for ${payload.title} that ended on ${date}`;
  }

  if (payload.type === "MEETING") {
    return `🚨 Urgent Reminder: You missed the meeting on ${date}`;
  }

  if (payload.type === "BUSINESS_TRIP") {
    return `🚨 Urgent Reminder: You missed your business trip on ${date}`;
  }

  return `🚨 You missed an event scheduled on ${date}`;
}

// run every 5 seconds
setInterval(processJobs, 5000);

console.log("📡 DB Queue Worker Running...");
