import { prisma } from "../lib/prisma";
import { sendTelegramMessage } from "../services/telegram.service";

async function processJobs() {
  const now = new Date();

  const jobs = await prisma.job.findMany({
    where: {
      runAt: { lte: now },
      status: "PENDING",
    },
    orderBy: {
      runAt: "asc",
    },
    take: 50, // Process max 50 jobs at a time
  });

  if (jobs.length === 0) return;

  console.log(`📡 Processing ${jobs.length} jobs...`);

  for (const job of jobs) {
    try {
      const payload = job.payload as Record<string, any>;

      // mark as processing FIRST to avoid duplicates
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "DONE" },
      });

      switch (job.type) {
        case "REMINDER": {
          const message = buildReminderMessage(payload, job.type);
          await sendTelegramMessage(payload.userId, message);
          break;
        }

        case "MISSED_10M":
        case "MISSED_1H":
        case "MISSED_24H": {
          const message = buildMissedMessage(payload, job.type);
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

function buildReminderMessage(payload: any, label: string) {
  const eventDate = new Date(payload.startTime);
  const dateStr = eventDate.toLocaleDateString();
  const timeStr = eventDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const msLeft = eventDate.getTime() - Date.now();
  const hoursLeft = Math.max(0, Math.round(msLeft / 3600000));
  const daysLeft = Math.max(0, Math.round(msLeft / 86400000));

  const emoji =
    payload.type === "DEADLINE"
      ? "📌"
      : payload.type === "MEETING"
        ? "📅"
        : "✈️";
  const typeLabel =
    payload.type === "DEADLINE"
      ? "deadline"
      : payload.type === "MEETING"
        ? "meeting"
        : "trip";

  // Build time remaining text
  let timeText = "";
  if (daysLeft > 0) {
    timeText = `You have ${daysLeft} day${daysLeft > 1 ? "s" : ""} left`;
  } else if (hoursLeft > 0) {
    timeText = `You have ${hoursLeft} hour${hoursLeft > 1 ? "s" : ""} left`;
  } else {
    const minutesLeft = Math.max(0, Math.round(msLeft / 60000));
    timeText = `You have ${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""} left`;
  }

  return `${emoji} Reminder: You have a ${typeLabel} — ${payload.title}
📅 ${dateStr} at ${timeStr}
⏳ ${timeText} before ${typeLabel}.`;
}

function buildMissedMessage(payload: any, missType: string) {
  const eventDate = new Date(payload.startTime);
  const dateStr = eventDate.toLocaleDateString();
  const timeStr = eventDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const emoji =
    payload.type === "DEADLINE"
      ? "🚨"
      : payload.type === "MEETING"
        ? "⚠️"
        : "⚠️";
  const typeLabel =
    payload.type === "DEADLINE"
      ? "deadline"
      : payload.type === "MEETING"
        ? "meeting"
        : "trip";

  if (missType === "MISSED_10M") {
    return `${emoji} Urgent: Your ${typeLabel} "${payload.title}" was due 10 minutes ago!`;
  }

  if (missType === "MISSED_1H") {
    return `${emoji} Missed: You missed your ${typeLabel} "${payload.title}" on ${dateStr} at ${timeStr}.`;
  }

  // MISSED_24H
  return `${emoji} Notice: The ${typeLabel} "${payload.title}" from ${dateStr} has passed.`;
}

// run every 10 seconds
setInterval(processJobs, 10000);

console.log("📡 DB Queue Worker Running...");
