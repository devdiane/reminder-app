import "dotenv/config";
import http from "http";
import TelegramBot from "node-telegram-bot-api";
import { prisma } from "../lib/prisma";
import { createEvent, getEvents } from "../services/event.service";

const token = process.env.TELEGRAM_BOT_TOKEN!;
const port = process.env.PORT || 10000;

// 1. Conditional Polling Logic
// Only the 'reminder-app' should have ENABLE_POLLING=true in Render env vars
const shouldPoll = process.env.ENABLE_POLLING === "true";
const bot = new TelegramBot(token, { polling: shouldPoll });

// 2. Health Check Server
// Both services need this to stay "Live" on Render
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(shouldPoll ? "Bot is polling" : "Worker is active");
  })
  .listen(port, () => {
    console.log(`🚀 Health check server listening on port ${port}`);
    console.log(
      shouldPoll
        ? "🤖 Bot is listening for messages..."
        : "💤 Bot is in send-only mode (polling disabled)",
    );
  });

// 3. Command Handlers (Only registered if polling is enabled)
if (shouldPoll) {
  // /start - Connect user
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();

    if (!userId) return;

    await prisma.user.upsert({
      where: { id: userId },
      update: { telegramChatId: chatId.toString() },
      create: {
        id: userId,
        telegramChatId: chatId.toString(),
      },
    });

    bot.sendMessage(
      chatId,
      "✅ Telegram connected successfully!\n\nUse /help for available commands.",
    );
  });

  // /help - Show all commands
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpText = `
📋 Available Commands:
/start - Connect your Telegram account
/add - Create a new reminder
/events - List your upcoming events
/help - Show this help message

📝 /add Format:
/add TYPE | Title | YYYY-MM-DD HH:MM
`.trim();
    bot.sendMessage(chatId, helpText);
  });

  // /events - List user's events
  bot.onText(/\/events/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    try {
      const events = await getEvents(userId);
      if (events.length === 0) {
        bot.sendMessage(chatId, "📭 No events yet. Use /add to create one.");
        return;
      }

      const eventsList = events
        .slice(0, 10)
        .map((e) => {
          const date = new Date(e.startTime).toLocaleString();
          const emoji =
            e.type === "DEADLINE" ? "📌" : e.type === "MEETING" ? "📅" : "✈️";
          return `${emoji} ${e.title}\n   ${date}`;
        })
        .join("\n\n");

      bot.sendMessage(chatId, `📋 Your Events:\n\n${eventsList}`);
    } catch (error) {
      bot.sendMessage(chatId, "❌ Failed to fetch events.");
    }
  });

  // /add - Create new reminder
  bot.onText(/\/add (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId || !match) return;

    const input = match[1].trim();
    const parts = input.split("|").map((p) => p.trim());

    if (parts.length < 3) {
      bot.sendMessage(
        chatId,
        "❌ Invalid format. Use: /add TYPE | Title | YYYY-MM-DD HH:MM",
      );
      return;
    }

    const [type, title, dateStr] = parts;
    const startTime = new Date(dateStr);

    if (isNaN(startTime.getTime())) {
      bot.sendMessage(chatId, "❌ Invalid date format.");
      return;
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
        `✅ Event created for ${startTime.toLocaleString()}`,
      );
    } catch (error) {
      bot.sendMessage(chatId, "❌ Failed to create event.");
    }
  });
}

// Export the bot instance so the Worker can use it to sendMessage
export default bot;
