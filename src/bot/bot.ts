import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import { prisma } from "../lib/prisma";
import { createEvent, getEvents } from "../services/event.service";

const token = process.env.TELEGRAM_BOT_TOKEN!;

const bot = new TelegramBot(token, { polling: true });

console.log("🤖 Bot running...");

// /start - Connect user
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id.toString();

  if (!userId) return;

  await prisma.user.upsert({
    where: { id: userId },
    update: {
      telegramChatId: chatId.toString(),
    },
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

Example:
/add DEADLINE | Project Submission | 2026-05-20 18:00

🔹 Types: DEADLINE, MEETING, BUSINESS_TRIP
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
    console.error(error);
    bot.sendMessage(chatId, "❌ Failed to fetch events.");
  }
});

// /add - Create new reminder
// Format: /add TYPE | Title | YYYY-MM-DD HH:MM
bot.onText(/\/add (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id.toString();

  if (!userId) {
    bot.sendMessage(chatId, "❌ User not found. Use /start first.");
    return;
  }

  if (!match) return;

  const input = match[1].trim();
  const parts = input.split("|").map((p) => p.trim());

  if (parts.length < 3) {
    bot.sendMessage(
      chatId,
      "❌ Invalid format.\n\nUse: /add TYPE | Title | YYYY-MM-DD HH:MM\n\nExample: /add DEADLINE | Project Submission | 2026-05-20 18:00",
    );
    return;
  }

  const [type, title, dateStr] = parts;

  // Validate type
  const validTypes = ["DEADLINE", "MEETING", "BUSINESS_TRIP"];
  if (!validTypes.includes(type.toUpperCase())) {
    bot.sendMessage(chatId, `❌ Invalid type. Use: ${validTypes.join(", ")}`);
    return;
  }

  // Parse date
  const startTime = new Date(dateStr);
  if (isNaN(startTime.getTime())) {
    bot.sendMessage(chatId, "❌ Invalid date format. Use: YYYY-MM-DD HH:MM");
    return;
  }

  if (startTime <= new Date()) {
    bot.sendMessage(chatId, "❌ Event must be in the future.");
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
      `✅ Event created!\n\n📌 ${title}\n   ${startTime.toLocaleString()}\n\nYou will receive reminders before this event.`,
    );
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "❌ Failed to create event.");
  }
});
