# Bemi Alert

바이낸스 암호화폐 실시간 이상 신호 감지 대시보드.
PUMP/DUMP, 고래 활동, 선물 펀딩비·OI 급변을 자동 감지하고 텔레그램으로 알림을 발송합니다.

**라이브**: https://bemi-alert.vercel.app

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| **PUMP/DUMP 감지** | 바이낸스 상위 코인의 단기 가격 급등·급락 감지 |
| **Whale Flow** | 상위 30개 코인의 대형 거래(≥$100K) 매집·매도 압력 분석 |
| **선물 신호** | 펀딩비 극단(≥±0.1%) 및 OI 5분 급변(≥3%) 감지 |
| **텔레그램 알림** | 임계값 초과 시 구독자 전체 자동 발송 |
| **실시간 대시보드** | 30초 자동 갱신, 감지 내역 테이블 |

---

## 기술 스택

- **Frontend**: Next.js 15 (App Router) · TypeScript · Tailwind CSS v3
- **Backend**: Next.js API Routes (Serverless)
- **DB**: PostgreSQL (Supabase) · Prisma ORM
- **데이터**: Binance REST API (현물 + 선물)
- **알림**: Telegram Bot API
- **배포**: Vercel
- **스케줄러**: cron-job.org (외부 cron)

---

## 감지 로직

### PUMP/DUMP
- 3분·5분 수익률 임계값 초과 + 거래량 배수 조건 동시 충족
- 쿨다운: 같은 코인 N분 내 중복 차단

### Whale Flow
```
고래 거래 기준: 단건 ≥ $100K  OR  평균 거래의 20배 이상
압력지수(Score) = (매수건 × 2) − (매도건 × 2) + 거래량 스파이크(0~20)
저장 임계값: |score| ≥ 5
텔레그램 임계값: |score| ≥ 40
쿨다운: 10분
```

### 선물 신호
```
펀딩비: |rate| ≥ 0.1% per 8h → 롱/숏 과열
OI 급변: 5분봉 변화율 ≥ 3% → 포지션 빌드업/청산
쿨다운: 15분
```

---

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx                  # 메인 대시보드
│   ├── settings/page.tsx         # 파라미터 설정 페이지
│   ├── api/
│   │   ├── scan/                 # PUMP/DUMP 스캔 (cron)
│   │   ├── events/               # 감지 내역 조회
│   │   ├── whale-scan/           # 고래 스캔 (cron)
│   │   ├── whales/               # 고래 이벤트 조회
│   │   ├── futures-scan/         # 선물 신호 스캔 (cron)
│   │   ├── futures-alerts/       # 선물 알림 조회
│   │   ├── settings/             # 설정값 CRUD
│   │   └── telegram/webhook/     # 텔레그램 봇 webhook
│   └── components/
├── data/
│   ├── binance.ts                # 현물 티커 API
│   ├── whales.ts                 # 체결 데이터 (aggTrades)
│   └── futures.ts                # 선물 펀딩비·OI API
├── domain/
│   ├── scanner.ts                # PUMP/DUMP 감지 로직
│   ├── whale.ts                  # 고래 압력 분석 로직
│   └── futures.ts                # 선물 신호 감지 로직
└── lib/
    └── prisma.ts                 # Prisma 클라이언트
```

---

## DB 스키마

| 테이블 | 용도 |
|---|---|
| `Signal` | PUMP/DUMP 감지 이벤트 |
| `Cooldown` | 중복 감지 방지 쿨다운 |
| `WhaleEvent` | 고래 활동 이벤트 |
| `FuturesAlert` | 펀딩비·OI 이상 신호 |
| `Subscriber` | 텔레그램 구독자 |
| `Settings` | 스캔 파라미터 |

---

## 로컬 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env
# DATABASE_URL, ADMIN_SECRET, CRON_SECRET, TELEGRAM_BOT_TOKEN 입력

# 3. DB 마이그레이션
npx prisma db push

# 4. 개발 서버 실행
npm run dev
```

---

## 환경변수

| 변수 | 설명 |
|---|---|
| `DATABASE_URL` | PostgreSQL 연결 문자열 (Supabase) |
| `ADMIN_SECRET` | 설정 페이지 저장 인증키 |
| `CRON_SECRET` | cron-job.org 호출 인증키 |
| `TELEGRAM_BOT_TOKEN` | 텔레그램 봇 토큰 |

---

## cron-job.org 스케줄

| 엔드포인트 | 주기 | 용도 |
|---|---|---|
| `POST /api/scan` | 1분 | PUMP/DUMP 스캔 |
| `POST /api/whale-scan` | 1분 | 고래 활동 스캔 |
| `POST /api/futures-scan` | 5분 | 선물 신호 스캔 |

모든 요청에 `x-cron-secret` 헤더 필요.

---

## 텔레그램 봇

- 구독: `/start`
- 구독 취소: `/stop`
- 봇 주소: [@bemialert_bot](https://t.me/bemialert_bot)
