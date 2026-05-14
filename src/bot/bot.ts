import { prisma } from "@/lib/prisma";
import { bot } from "@/lib/telegram";

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

  bot.sendMessage(chatId, "✅ Telegram connected successfully!");
});

console.log("Bot running...");
