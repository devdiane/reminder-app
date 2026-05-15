import "dotenv/config";
import http from "http";
import TelegramBot from "node-telegram-bot-api";
import { prisma } from "../lib/prisma";
import { createEvent, getEvents } from "../services/event.service";

const token = process.env.TELEGRAM_BOT_TOKEN!;
const port = process.env.PORT || 10000;

// 1. Conditional Polling Logic
const shouldPoll = process.env.ENABLE_POLLING === "true";
const bot = new TelegramBot(token, { polling: shouldPoll });

if (shouldPoll) {
  http
    .createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Bot Service is Polling");
    })
    .listen(port, () => {
      console.log(`🚀 Bot Health check server listening on port ${port}`);
      console.log("🤖 Bot is listening for messages...");
    });
}

// 2. Command Handlers (Only registered if polling is enabled)
if (shouldPoll) {
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    await prisma.user.upsert({
      where: { id: userId },
      update: { telegramChatId: chatId.toString() },
      create: { id: userId, telegramChatId: chatId.toString() },
    });

    bot.sendMessage(chatId, "✅ Telegram connected successfully!");
  });

  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "📋 Commands: /start, /add, /events");
  });

  bot.onText(/\/events/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;
    try {
      const events = await getEvents(userId);
      const list = events.length
        ? events.map((e) => `• ${e.title}`).join("\n")
        : "No events.";
      bot.sendMessage(chatId, `📋 Your Events:\n\n${list}`);
    } catch (e) {
      bot.sendMessage(chatId, "❌ Error fetching events.");
    }
  });

  bot.onText(/\/add (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId || !match) return;

    const parts = match[1].split("|").map((p) => p.trim());
    if (parts.length < 3)
      return bot.sendMessage(chatId, "❌ Format: TYPE | Title | Date");

    const [type, title, dateStr] = parts;
    try {
      await createEvent({
        title,
        type: type.toUpperCase(),
        startTime: new Date(dateStr),
        userId,
      });
      bot.sendMessage(chatId, "✅ Event created!");
    } catch (e) {
      bot.sendMessage(chatId, "❌ Creation failed.");
    }
  });
}

export default bot;
