import "dotenv/config";
import http from "http";
import { prisma } from "../lib/prisma";
import { sendTelegramMessage } from "../services/telegram.service";

/**
 * 1. RENDER HEALTH CHECK
 * Required to keep the service from being killed on the Free Tier.
 */
const port = process.env.PORT || 10000;
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Worker is active");
  })
  .listen(port, () => {
    console.log(`🚀 Health check server listening on port ${port}`);
  });

/**
 * 2. CORE PROCESSING LOGIC
 */
async function processJobs() {
  const now = new Date();

  // Fetch pending jobs
  const jobsToProcess = await prisma.job.findMany({
    where: {
      runAt: { lte: now },
      status: "PENDING",
    },
    orderBy: { runAt: "asc" },
    take: 50,
  });

  if (jobsToProcess.length === 0) return;

  // ATOMIC LOCK: Immediately mark these jobs as DONE (or PROCESSING)
  // so the next interval (in 10s) doesn't pick up the same records.
  const jobIds = jobsToProcess.map((j) => j.id);
  await prisma.job.updateMany({
    where: { id: { in: jobIds } },
    data: { status: "DONE" },
  });

  console.log(`📡 Processing ${jobsToProcess.length} jobs...`);

  for (const job of jobsToProcess) {
    try {
      const payload = job.payload as Record<string, any>;

      switch (job.type) {
        case "REMINDER": {
          const message = buildReminderMessage(payload);
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
          console.warn(`❓ Unknown job type: ${job.type}`);
      }
    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error);
      // Optional: Revert to FAILED if you want to track issues
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "FAILED" },
      });
    }
  }
}

/**
 * 3. MESSAGE BUILDERS
 */
function buildReminderMessage(payload: any) {
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
  const typeLabel = payload.type?.toLowerCase() || "event";

  let timeText = "";
  if (daysLeft > 0) {
    timeText = `You have ${daysLeft} day${daysLeft > 1 ? "s" : ""} left`;
  } else if (hoursLeft > 0) {
    timeText = `You have ${hoursLeft} hour${hoursLeft > 1 ? "s" : ""} left`;
  } else {
    const minutesLeft = Math.max(0, Math.round(msLeft / 60000));
    timeText = `You have ${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""} left`;
  }

  return `${emoji} **Reminder:** You have a ${typeLabel} — **${payload.title}**
📅 ${dateStr} at ${timeStr}
⏳ ${timeText} before ${typeLabel}.`;
}

function buildMissedMessage(payload: any, missType: string) {
  const dateStr = new Date(payload.startTime).toLocaleDateString();
  const timeStr = new Date(payload.startTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const emoji = payload.type === "DEADLINE" ? "🚨" : "⚠️";
  const typeLabel = payload.type?.toLowerCase() || "event";

  if (missType === "MISSED_10M") {
    return `${emoji} **Urgent:** Your ${typeLabel} "${payload.title}" was due 10 minutes ago!`;
  }
  if (missType === "MISSED_1H") {
    return `${emoji} **Missed:** You missed your ${typeLabel} "${payload.title}" on ${dateStr} at ${timeStr}.`;
  }
  return `${emoji} **Notice:** The ${typeLabel} "${payload.title}" from ${dateStr} has passed.`;
}

/**
 * 4. EXECUTION
 */
setInterval(processJobs, 10000);
console.log("📡 DB Queue Worker Running...");
