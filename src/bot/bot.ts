import "dotenv/config";
import http from "http";
import TelegramBot from "node-telegram-bot-api";
import { prisma } from "../lib/prisma";
import { createEvent, getEvents } from "../services/event.service";

const token = process.env.TELEGRAM_BOT_TOKEN!;
const port = process.env.PORT || 10000;

// 1. DUAL-SERVICE LOGIC
// shouldPoll is true ONLY for the Bot Service.
// For the Worker Service, this prevents the '409 Conflict' error.
const shouldPoll = process.env.ENABLE_POLLING === "true";
const bot = new TelegramBot(token, { polling: shouldPoll });

/**
 * 2. HEALTH CHECK SERVER
 * Only runs on the main Bot instance to avoid 'EADDRINUSE' (Port 10000) errors.
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
 * 3. COMMAND HANDLERS
 */
if (shouldPoll) {
  // /START - Show guide on first interaction
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    await prisma.user.upsert({
      where: { id: userId },
      update: { telegramChatId: chatId.toString() },
      create: { id: userId, telegramChatId: chatId.toString() },
    });

    // Show guide on first interaction
    const guideText = `
👋 *Welcome to Reminder Bot!*

📋 *Available Commands:*

/start - Connect your account
/add - Create a new reminder
/events - List your upcoming events
/help - Show this guide

📝 */add Format:*
\`/add TYPE | Title | YYYY-MM-DD HH:MM\`

*Example:*
\`/add DEADLINE | Project Submission | 2026-05-20 18:00\`

🔹 *Types:* DEADLINE, MEETING, BUSINESS_TRIP

💡 *Tip:* Set /add for a time at least 5 minutes in the future to receive reminders!
    `.trim();

    bot.sendMessage(chatId, guideText, { parse_mode: "Markdown" });
  });

  // /HELP (ENHANCED PH GUIDE)
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpText = `
📋 *Available Commands:*

/start - Connect your account
/add - Create a new reminder
/events - List your upcoming events
/help - Show this guide

📝 */add Format:*
\`/add TYPE | Title | YYYY-MM-DD HH:MM\`

*Example:*
\`/add DEADLINE | Project Submission | 2026-05-20 18:00\`

🔹 *Types:* DEADLINE, MEETING, BUSINESS_TRIP
    `.trim();
    bot.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
  });

  // /EVENTS
  bot.onText(/\/events/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    try {
      const events = await getEvents(userId);
      if (events.length === 0) {
        return bot.sendMessage(chatId, "📭 *Your schedule is clear!*", {
          parse_mode: "Markdown",
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
          return `${emoji} *${e.title}*\n   📅 ${date}`;
        })
        .join("\n\n");

      bot.sendMessage(chatId, `📋 *Your Upcoming Events:*\n\n${list}`, {
        parse_mode: "Markdown",
      });
    } catch (e) {
      bot.sendMessage(chatId, "❌ Failed to fetch events.");
    }
  });

  // /ADD
  bot.onText(/\/add (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId || !match) return;

    const parts = match[1].split("|").map((p) => p.trim());
    if (parts.length < 3) {
      return bot.sendMessage(
        chatId,
        "❌ *Format Error!*\nUse: TYPE | Title | YYYY-MM-DD HH:MM",
        { parse_mode: "Markdown" },
      );
    }

    const [type, title, dateStr] = parts;
    const startTime = new Date(dateStr);

    if (isNaN(startTime.getTime())) {
      return bot.sendMessage(
        chatId,
        "❌ *Invalid Date!* Use YYYY-MM-DD HH:MM",
        { parse_mode: "Markdown" },
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
        `✅ *Event Scheduled!*\n\n📍 *Title:* ${title}\n🕒 *Time:* ${successDate}`,
        { parse_mode: "Markdown" },
      );
    } catch (error) {
      bot.sendMessage(chatId, "❌ Database error: Failed to save event.");
    }
  });
}

export default bot;
