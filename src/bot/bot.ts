import "dotenv/config";
import http from "http";
import TelegramBot from "node-telegram-bot-api";
import { prisma } from "../lib/prisma";
import { createEvent, getEvents } from "../services/event.service";

const token = process.env.TELEGRAM_BOT_TOKEN!;
const port = process.env.PORT || 10000;

/**
 * 1. CONFIGURATION & POLLING
 * Polling only enabled for the Bot Service.
 */
const shouldPoll = process.env.ENABLE_POLLING === "true";
const bot = new TelegramBot(token, { polling: shouldPoll });

/**
 * 2. HEALTH CHECK SERVER
 * Only runs on the Bot instance to prevent EADDRINUSE errors in the Worker.
 */
if (shouldPoll) {
  http
    .createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Bot Service Online");
    })
    .listen(port, () => {
      console.log(`🚀 Bot health check active on port ${port}`);
    });
}

/**
 * 3. COMMAND HANDLERS
 */
if (shouldPoll) {
  // --- /START ---
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    await prisma.user.upsert({
      where: { id: userId },
      update: { telegramChatId: chatId.toString() },
      create: { id: userId, telegramChatId: chatId.toString() },
    });

    const welcomeMsg = `✅ *Account Connected\\!*

Welcome to your Reminder Assistant\\. Use /help to see how to schedule events in PH time\\.`;
    bot.sendMessage(chatId, welcomeMsg, { parse_mode: "MarkdownV2" });
  });

  // --- /HELP ---
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpText = `
🚀 *Reminder Bot Guide (PH)*

I'll send you notifications 24h, 1h, and 10m before your events\\.

📋 *Commands*
• /start — Link your account
• /add — Create a reminder
• /events — View your schedule
• /help — Show this guide

📝 *How to Add an Event*
Format: \`TYPE | Title | YYYY-MM-DD HH:MM\`

*Example (Tap to copy):*
\`/add DEADLINE | Project Launch | 2026-06-15 09:00\`

🔹 *Valid Types:*
🚨 \`DEADLINE\`
📅 \`MEETING\`
✈️ \`BUSINESS_TRIP\`
    `.trim();

    bot.sendMessage(chatId, helpText, { parse_mode: "MarkdownV2" });
  });

  // --- /EVENTS ---
  bot.onText(/\/events/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    try {
      const events = await getEvents(userId);
      if (events.length === 0) {
        return bot.sendMessage(chatId, "📭 *Your schedule is empty\\!*", {
          parse_mode: "MarkdownV2",
        });
      }

      const list = events
        .map((e) => {
          // Changed to Philippines Locale
          const date = new Date(e.startTime).toLocaleString("en-PH", {
            dateStyle: "medium",
            timeStyle: "short",
          });
          const emoji =
            e.type === "DEADLINE" ? "🚨" : e.type === "MEETING" ? "📅" : "✈️";
          return `${emoji} *${e.title}*\n   📅 ${date}`;
        })
        .join("\n\n");

      bot.sendMessage(chatId, `📋 *Upcoming Events (PH Time):*\n\n${list}`, {
        parse_mode: "MarkdownV2",
      });
    } catch (e) {
      bot.sendMessage(chatId, "❌ Failed to load events\\.");
    }
  });

  // --- /ADD ---
  bot.onText(/\/add (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId || !match) return;

    const parts = match[1].split("|").map((p) => p.trim());
    if (parts.length < 3) {
      return bot.sendMessage(
        chatId,
        "⚠️ *Format Error\\!* Use \`TYPE | Title | YYYY-MM-DD HH:MM\`",
        { parse_mode: "MarkdownV2" },
      );
    }

    const [type, title, dateStr] = parts;
    const startTime = new Date(dateStr);

    if (isNaN(startTime.getTime())) {
      return bot.sendMessage(
        chatId,
        "❌ *Invalid Date\\!* Use \`YYYY-MM-DD HH:MM\`",
        { parse_mode: "MarkdownV2" },
      );
    }

    try {
      await createEvent({
        title,
        type: type.toUpperCase(),
        startTime,
        userId,
      });

      bot.sendMessage(
        chatId,
        `✅ *Event Scheduled\\!*\n\n📍 *Title:* ${title}\n🕒 *Time:* ${startTime.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}\n🔔 Reminders set\\!`,
        { parse_mode: "MarkdownV2" },
      );
    } catch (error) {
      bot.sendMessage(chatId, "❌ Database error: Failed to save event\\.");
    }
  });
}

export default bot;
