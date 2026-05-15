import "dotenv/config";
import http from "http";
import TelegramBot from "node-telegram-bot-api";
import { prisma } from "../lib/prisma";
import { createEvent, getEvents } from "../services/event.service";

const token = process.env.TELEGRAM_BOT_TOKEN!;
const port = process.env.PORT || 10000;

const shouldPoll = process.env.ENABLE_POLLING === "true";
const bot = new TelegramBot(token, { polling: shouldPoll });

/**
 * HEALTH CHECK SERVER (only for polling instance)
 */
if (shouldPoll) {
  http
    .createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Bot is polling...");
    })
    .listen(port, () => {
      console.log(`🚀 Bot Health check server listening on port ${port}`);
    });
}

/**
 * COMMANDS
 */
if (shouldPoll) {
  // START
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    await prisma.user.upsert({
      where: { id: userId },
      update: { telegramChatId: chatId.toString() },
      create: { id: userId, telegramChatId: chatId.toString() },
    });

    const guideText = `
👋 <b>Welcome to Reminder Bot!</b>

📋 <b>Available Commands:</b>
/start - Connect your account
/add - Create a new reminder
/events - List your upcoming events
/help - Show this guide

📝 <b>/add Format:</b>
<code>/add TYPE | Title | YYYY-MM-DD HH:MM</code>

<b>Example:</b>
<code>/add DEADLINE | Project Submission | 2026-05-20 18:00</code>

🔹 <b>Types:</b> DEADLINE, MEETING, BUSINESS_TRIP

💡 Tip: Set reminders at least 5 minutes in the future.
    `.trim();

    bot.sendMessage(chatId, guideText, { parse_mode: "HTML" });
  });

  // HELP
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;

    const helpText = `
📋 <b>Available Commands:</b>
/start - Connect your account
/add - Create a new reminder
/events - List your upcoming events
/help - Show this guide

📝 <b>/add Format:</b>
<code>/add TYPE | Title | YYYY-MM-DD HH:MM</code>

<b>Example:</b>
<code>/add DEADLINE | Project Submission | 2026-05-20 18:00</code>

🔹 <b>Types:</b> DEADLINE, MEETING, BUSINESS_TRIP
    `.trim();

    bot.sendMessage(chatId, helpText, { parse_mode: "HTML" });
  });

  // EVENTS
  bot.onText(/\/events/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    try {
      const events = await getEvents(userId);

      if (events.length === 0) {
        return bot.sendMessage(chatId, "📭 <b>Your schedule is clear!</b>", {
          parse_mode: "HTML",
        });
      }

      const list = events
        .map((e) => {
          const date = new Date(e.startTime).toLocaleString("en-PH", {
            dateStyle: "medium",
            timeStyle: "short",
          });

          const emoji =
            e.type === "DEADLINE" ? "📌" : e.type === "MEETING" ? "📅" : "✈️";

          return `${emoji} <b>${e.title}</b>\n   📅 ${date}`;
        })
        .join("\n\n");

      bot.sendMessage(chatId, `📋 <b>Your Upcoming Events:</b>\n\n${list}`, {
        parse_mode: "HTML",
      });
    } catch {
      bot.sendMessage(chatId, "❌ Failed to fetch events.");
    }
  });

  // ADD
  bot.onText(/\/add (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId || !match) return;

    const parts = match[1].split("|").map((p) => p.trim());

    if (parts.length < 3) {
      return bot.sendMessage(
        chatId,
        "❌ <b>Format Error!</b>\nUse: TYPE | Title | YYYY-MM-DD HH:MM",
        { parse_mode: "HTML" },
      );
    }

    const [type, title, dateStr] = parts;
    const startTime = new Date(dateStr);

    if (isNaN(startTime.getTime())) {
      return bot.sendMessage(
        chatId,
        "❌ <b>Invalid Date!</b> Use YYYY-MM-DD HH:MM",
        { parse_mode: "HTML" },
      );
    }

    try {
      await createEvent({
        title,
        type: type.toUpperCase(),
        startTime,
        userId,
      });

      const successDate = startTime.toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      bot.sendMessage(
        chatId,
        `✅ <b>Event Scheduled!</b>\n\n📍 <b>Title:</b> ${title}\n🕒 <b>Time:</b> ${successDate}`,
        { parse_mode: "HTML" },
      );
    } catch {
      bot.sendMessage(chatId, "❌ Database error: Failed to save event.");
    }
  });
}

export default bot;
