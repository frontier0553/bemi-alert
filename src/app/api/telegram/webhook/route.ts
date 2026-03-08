import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { sendTelegramMessage } from '../../../../data/telegram';

const WELCOME = `🚀 <b>Bemi Alert에 오신 것을 환영합니다!</b>

실시간 코인 펌프 감지 알림을 보내드립니다.

현재 제공:
• 📈 Pump Alerts
• 📊 Volume Spike Alerts
• ⚡ 실시간 텔레그램 알림

알림을 시작했습니다. 신호가 감지되면 여기로 바로 보내드릴게요.

/stop — 알림 중지
/status — 구독 상태 확인
/link [코드] — 계정 연동`;

const STOPPED = `🔕 알림이 중지되었습니다.

다시 받으려면 /start 를 입력하세요.`;

export async function POST(req: NextRequest) {
  // Telegram 웹훅 서명 검증
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret) {
    const token = req.headers.get('x-telegram-bot-api-secret-token');
    if (token !== webhookSecret) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const msg = body?.message;
  if (!msg) return NextResponse.json({ ok: true });

  const chatId    = String(msg.chat?.id ?? '');
  const text      = (msg.text ?? '') as string;
  const username  = msg.from?.username  ?? null;
  const firstName = msg.from?.first_name ?? null;

  if (!chatId) return NextResponse.json({ ok: true });

  if (text.startsWith('/status')) {
    const sub = await prisma.subscriber.findUnique({ where: { chatId } });
    if (!sub || !sub.isActive) {
      await sendTelegramMessage(chatId, '❌ 현재 알림 구독 중이 아닙니다.\n\n/start 를 입력해 구독을 시작하세요.');
    } else {
      const linked = sub.userId ? '✅ 계정 연동됨' : '⚠️ 미연동\n(bemialert.com/user/settings 에서 코드 입력)';
      const name   = sub.firstName ? sub.firstName : (sub.username ?? '');
      await sendTelegramMessage(chatId,
        `📊 <b>구독 상태</b>\n\n` +
        `상태: ✅ 활성\n` +
        `이름: ${name}\n` +
        `계정: ${linked}\n\n` +
        `중지하려면 /stop\n` +
        `계정 연동하려면 /link [코드]`,
      );
    }
  } else if (text.startsWith('/start')) {
    await prisma.subscriber.upsert({
      where:  { chatId },
      update: { isActive: true, username, firstName },
      create: { chatId, username, firstName },
    });
    await sendTelegramMessage(chatId, WELCOME);
  } else if (text.startsWith('/stop')) {
    await prisma.subscriber.updateMany({
      where: { chatId },
      data:  { isActive: false },
    });
    await sendTelegramMessage(chatId, STOPPED);
  } else if (text.startsWith('/link ')) {
    const code = text.slice(6).trim();
    if (!/^\d{6}$/.test(code)) {
      await sendTelegramMessage(chatId, '❌ 코드는 6자리 숫자여야 합니다.\n\n설정 페이지에서 코드를 발급받아 입력해주세요.');
      return NextResponse.json({ ok: true });
    }
    const user = await prisma.user.findFirst({
      where: {
        linkCode: code,
        linkCodeExp: { gt: new Date() },
      },
    });
    if (!user) {
      await sendTelegramMessage(chatId, '❌ 유효하지 않거나 만료된 코드입니다.\n\n설정 페이지에서 새 코드를 발급받으세요.');
    } else {
      // 코드 클리어 + Subscriber에 userId 연결
      await prisma.user.update({
        where: { id: user.id },
        data: { linkCode: null, linkCodeExp: null },
      });
      await prisma.subscriber.upsert({
        where:  { chatId },
        update: { isActive: true, username, firstName, userId: user.id },
        create: { chatId, username, firstName, isActive: true, userId: user.id },
      });
      await sendTelegramMessage(
        chatId,
        `✅ <b>${user.email}</b> 계정과 연동되었습니다!\n\n이제 개인 설정에 맞춘 알림을 받습니다.`,
      );
    }
  }

  return NextResponse.json({ ok: true });
}
