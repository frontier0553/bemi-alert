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

interface AlertFilter {
  symbol:    string;   // ex) "BTCUSDT"
  changePct: number;   // 실제 변동폭 (양수=PUMP, 음수=DUMP)
  alertType: 'PUMP' | 'DUMP' | 'WHALE' | 'FUTURES';
}

/** Broadcast to all active subscribers, respecting per-user preferences. */
export async function sendTelegramAlertToSubscribers(
  message: string,
  filter?: AlertFilter,
): Promise<void> {
  if (!BOT_TOKEN) return;

  const subscribers = await prisma.subscriber.findMany({
    where: { isActive: true },
    select: { chatId: true, userId: true },
  });

  if (subscribers.length === 0) {
    if (ADMIN_CHAT) await sendTelegramMessage(ADMIN_CHAT, message);
    return;
  }

  // userId 있는 구독자들의 UserSettings 일괄 조회
  const userIds = subscribers.map(s => s.userId).filter(Boolean) as string[];
  const settingsMap = new Map<string, { coinFilter: string | null; pumpPct: number | null; dumpPct: number | null }>();
  if (userIds.length > 0) {
    const rows = await prisma.userSettings.findMany({ where: { userId: { in: userIds } } });
    for (const r of rows) settingsMap.set(r.userId, r);
  }

  const baseCoin = filter?.symbol.replace(/(USDT|USDC|BUSD|FDUSD|TUSD)$/, '') ?? '';

  await Promise.allSettled(
    subscribers.map(s => {
      // userId 없는 구독자 (봇만 구독) → 무조건 발송
      if (!s.userId || !filter) return sendTelegramMessage(s.chatId, message);

      const prefs = settingsMap.get(s.userId);
      if (!prefs) return sendTelegramMessage(s.chatId, message); // 설정 없으면 전체 발송

      // 코인 필터 체크
      if (prefs.coinFilter) {
        let coins: string[] = [];
        try { coins = JSON.parse(prefs.coinFilter); } catch { /* 잘못된 JSON이면 필터 무시 */ }
        if (coins.length > 0 && !coins.includes(baseCoin)) return Promise.resolve();
      }

      // 임계값 체크 (PUMP/DUMP만 적용)
      if (filter.alertType === 'PUMP' && prefs.pumpPct != null) {
        if (filter.changePct < prefs.pumpPct) return Promise.resolve();
      }
      if (filter.alertType === 'DUMP' && prefs.dumpPct != null) {
        if (Math.abs(filter.changePct) < prefs.dumpPct) return Promise.resolve();
      }

      return sendTelegramMessage(s.chatId, message);
    }),
  );
}
