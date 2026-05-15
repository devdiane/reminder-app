import "dotenv/config";
import http from "http";
import { prisma } from "../lib/prisma";
import { sendTelegramMessage } from "../services/telegram.service";

/**
 * 1. RENDER HEALTH CHECK
 * We only start this if we are in the worker process to avoid port clashes.
 */
const port = process.env.PORT || 10000;

// This starts the server for the Worker service specifically.
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Worker is active and processing jobs");
});

server.listen(port, () => {
  console.log(`🚀 Worker health check server listening on port ${port}`);
});

// Handle server errors (like port already in use) gracefully
server.on("error", (e: any) => {
  if (e.code === "EADDRINUSE") {
    console.error(`❌ Port ${port} is already in use. Retrying in 5s...`);
    setTimeout(() => {
      server.close();
      server.listen(port);
    }, 5000);
  }
});

/**
 * 2. CORE PROCESSING LOGIC
 */
async function processJobs() {
  const now = new Date();

  try {
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

    const jobIds = jobsToProcess.map((j) => j.id);

    // ATOMIC LOCK
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
        await prisma.job.update({
          where: { id: job.id },
          data: { status: "FAILED" },
        });
      }
    }
  } catch (err) {
    console.error("Critical Worker Error:", err);
  }
}

/**
 * 3. MESSAGE BUILDERS
 * Use single '*' for bold in Telegram Markdown (Standard mode)
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

  return `${emoji} *Reminder:* You have a ${typeLabel} — *${payload.title}*\n📅 ${dateStr} at ${timeStr}\n⏳ ${timeText} before ${typeLabel}.`;
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
    return `${emoji} *Urgent:* Your ${typeLabel} "${payload.title}" was due 10 minutes ago!`;
  }
  if (missType === "MISSED_1H") {
    return `${emoji} *Missed:* You missed your ${typeLabel} "${payload.title}" on ${dateStr} at ${timeStr}.`;
  }
  return `${emoji} *Notice:* The ${typeLabel} "${payload.title}" from ${dateStr} has passed.`;
}

/**
 * 4. EXECUTION
 */
setInterval(processJobs, 10000);
console.log("📡 DB Queue Worker Running...");
