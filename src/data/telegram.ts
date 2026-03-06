import { prisma } from '../lib/prisma';

const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN ?? '';
const ADMIN_CHAT  = process.env.TELEGRAM_CHAT_ID   ?? '';  // fallback

/** Low-level: POST to Telegram Bot API sendMessage */
export async function sendTelegramMessage(chatId: string, message: string): Promise<void> {
  if (!BOT_TOKEN) return;

  const url  = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body = JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' });

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      // 봇 차단(403) / 채팅 없음(400) → 구독 비활성화
      if (res.status === 403 || res.status === 400) {
        await prisma.subscriber.updateMany({
          where: { chatId },
          data:  { isActive: false },
        }).catch(() => {});
      } else {
        console.error(`[telegram] sendMessage ${chatId} failed (${res.status}):`, text);
      }
    }
  } catch (err) {
    console.error('[telegram] fetch error:', err);
  }
}

/** Broadcast to all active subscribers. Falls back to ADMIN_CHAT if no subscribers. */
export async function sendTelegramAlertToSubscribers(message: string): Promise<void> {
  if (!BOT_TOKEN) return;

  const subscribers = await prisma.subscriber.findMany({
    where: { isActive: true },
    select: { chatId: true },
  });

  if (subscribers.length === 0) {
    // 구독자 없으면 관리자 fallback
    if (ADMIN_CHAT) await sendTelegramMessage(ADMIN_CHAT, message);
    return;
  }

  await Promise.allSettled(
    subscribers.map(s => sendTelegramMessage(s.chatId, message)),
  );
}
