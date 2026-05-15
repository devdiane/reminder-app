import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";

const token = process.env.TELEGRAM_BOT_TOKEN!;

export const bot = new TelegramBot(token);
