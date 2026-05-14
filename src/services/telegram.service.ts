import { prisma } from "@/lib/prisma";
import { bot } from "@/lib/telegram";

export async function sendTelegramMessage(userId: string, message: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user?.telegramChatId) return;

  await bot.sendMessage(user.telegramChatId, message);
}
