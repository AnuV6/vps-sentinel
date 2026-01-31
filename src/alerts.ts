import nodemailer from 'nodemailer';
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
dotenv.config();

// --- CONFIGURATION ---
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com', // Keep placeholder for now unless user provides
        pass: 'your-app-password'
    }
});

async function sendTelegramAlert(message: string) {
    try {
        await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, message);
    } catch (error) {
        console.error('[TELEGRAM] Failed to send message:', error);
    }
}

export async function sendAlert(monitorName: string, url: string, status: number, isUp: boolean) {
    const emoji = isUp ? '✅' : '🔴';
    const statusHeader = isUp ? 'RECOVERED' : 'DOWN';

    // Cleaner, more compact message
    const text = `${emoji} <b>${statusHeader}: ${monitorName}</b>
🔗 ${url}
📉 <b>Status:</b> ${status}
🕒 <b>Time:</b> ${new Date().toLocaleTimeString()}
    `;

    // console.log(`[ALERT SYSTEM] Triggering: ${monitorName} is ${statusHeader}`);

    // Send Telegram
    try {
        await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, text, { parse_mode: 'HTML' });
    } catch (error) {
        console.error('[TELEGRAM] Failed to send message:', error);
    }

    // Send Email (Only if configured)
    if (process.env.SMTP_USER) {
        try {
            await transporter.sendMail({
                from: '"VPS Sentinel" <alerts@vps-sentinel.com>',
                to: 'admin@example.com',
                subject: `${emoji} ${monitorName}: ${statusHeader}`,
                text: text.replace(/<[^>]*>/g, '') // Strip HTML for email plain text
            });
        } catch (error) {
            console.error('[EMAIL] Failed:', error);
        }
    }
}
