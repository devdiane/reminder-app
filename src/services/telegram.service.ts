import bot from "../bot/bot";
import { prisma } from "../lib/prisma";

export async function sendTelegramMessage(userId: string, message: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });

    if (!user || !user.telegramChatId) {
      console.warn(`⚠️ No Telegram Chat ID found for user: ${userId}`);
      return;
    }

    await bot.sendMessage(user.telegramChatId, message, {
      parse_mode: "Markdown",
    });

    return true;
  } catch (error) {
    console.error(`❌ Failed to send Telegram message to ${userId}:`, error);
    throw error; // Re-throw so the worker marks the job as FAILED
  }
}
