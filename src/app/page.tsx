'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

type FilterType = 'ALL' | 'PUMP' | 'DUMP';

interface Event {
  id: string;
  symbol: string;
  type: 'PUMP' | 'DUMP';
  changePct: number;
  volumeMult: number;
  price: number;
  detectedAt: string;
}

interface Stats {
  todayTotal: number;
  todayPumps: number;
  todayDumps: number;
  topPump: Event | null;
  topDump: Event | null;
}

interface GroupedSymbol {
  symbol: string;
  dominantType: 'PUMP' | 'DUMP' | 'BOTH';
  count: number;
  pumpCount: number;
  dumpCount: number;
  latest: Event;
  strongest: Event;
}

function fmt(v: number, digits = 2) {
  return v.toFixed(digits);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}초 전`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

function signalStrength(volumeMult: number, changePct: number): number {
  const volScore = volumeMult >= 10 ? 3 : volumeMult >= 5 ? 2 : volumeMult >= 2 ? 1 : 0;
  const chgScore = Math.abs(changePct) >= 15 ? 2 : Math.abs(changePct) >= 7 ? 1 : 0;
  return Math.max(1, Math.min(5, volScore + chgScore));
}

function volAboveAvg(volumeMult: number): string {
  const pct = Math.round((volumeMult - 1) * 100);
  return `평균 대비 ${pct}% 급증`;
}

function groupBySymbol(events: Event[]): GroupedSymbol[] {
  const map = new Map<string, GroupedSymbol>();
  for (const ev of events) {
    const g = map.get(ev.symbol);
    if (!g) {
      map.set(ev.symbol, {
        symbol: ev.symbol,
        dominantType: ev.type,
        count: 1,
        pumpCount: ev.type === 'PUMP' ? 1 : 0,
        dumpCount: ev.type === 'DUMP' ? 1 : 0,
        latest: ev,
        strongest: ev,
      });
    } else {
      g.count++;
      if (ev.type === 'PUMP') g.pumpCount++;
      else g.dumpCount++;
      if (Math.abs(ev.changePct) > Math.abs(g.strongest.changePct)) g.strongest = ev;
      g.dominantType =
        g.pumpCount > 0 && g.dumpCount > 0 ? 'BOTH' :
        g.pumpCount > g.dumpCount ? 'PUMP' : 'DUMP';
    }
  }
  return Array.from(map.values());
}

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (filter !== 'ALL') params.set('type', filter);
      if (search.trim()) params.set('symbol', search.trim());
      const res = await fetch(`/api/events?${params}`);
      const data = await res.json();
      setEvents(data.events ?? []);
      setStats(data.stats ?? null);
      setLastUpdated(new Date());
      setCountdown(30);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  const now = Date.now();
  const liveEvents = events.filter(
    ev => now - new Date(ev.detectedAt).getTime() < 5 * 60 * 1000
  );
  const grouped = groupBySymbol(events);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⚡</span>
          <span>Bemi Alert</span>
        </div>
        <nav className={styles.nav}>
          <Link href="/" className={`${styles.navLink} ${styles.navActive}`}>대시보드</Link>
          <Link href="/settings" className={styles.navLink}>설정</Link>
        </nav>
        <div className={styles.headerRight}>
          {lastUpdated && (
            <span className={styles.lastUpdated}>
              {lastUpdated.toLocaleTimeString('ko-KR')} · {countdown}초 후 갱신
            </span>
          )}
          <button className={styles.refreshBtn} onClick={fetchData}>↻ 새로고침</button>
        </div>
      </header>

      <main className={styles.main}>

        {/* ── SECTION 1: Market Summary ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📊 마켓 현황</h2>
          {stats ? (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>오늘 총 감지</div>
                <div className={styles.statValue}>{stats.todayTotal}</div>
                <div className={styles.statSub}>이벤트</div>
              </div>
              <div className={`${styles.statCard} ${styles.pumpCard}`}>
                <div className={styles.statLabel}>▲ 급등 (PUMP)</div>
                <div className={`${styles.statValue} ${styles.pumpText}`}>{stats.todayPumps}</div>
                <div className={styles.statSub}>오늘</div>
              </div>
              <div className={`${styles.statCard} ${styles.dumpCard}`}>
                <div className={styles.statLabel}>▼ 급락 (DUMP)</div>
                <div className={`${styles.statValue} ${styles.dumpText}`}>{stats.todayDumps}</div>
                <div className={styles.statSub}>오늘</div>
              </div>
              <div className={`${styles.statCard} ${styles.pumpCard}`}>
                <div className={styles.statLabel}>🏆 최강 급등</div>
                {stats.topPump ? (
                  <>
                    <div className={`${styles.statValue} ${styles.pumpText}`}>
                      +{fmt(stats.topPump.changePct)}%
                    </div>
                    <div className={styles.statSub}>{stats.topPump.symbol}</div>
                  </>
                ) : <div className={styles.statSub}>없음</div>}
              </div>
              <div className={`${styles.statCard} ${styles.dumpCard}`}>
                <div className={styles.statLabel}>💀 최강 급락</div>
                {stats.topDump ? (
                  <>
                    <div className={`${styles.statValue} ${styles.dumpText}`}>
                      {fmt(stats.topDump.changePct)}%
                    </div>
                    <div className={styles.statSub}>{stats.topDump.symbol}</div>
                  </>
                ) : <div className={styles.statSub}>없음</div>}
              </div>
              <div className={`${styles.statCard} ${liveEvents.length > 0 ? styles.activeCard : ''}`}>
                <div className={styles.statLabel}>
                  {liveEvents.length > 0 && <span className={styles.pulseDot} />}
                  현재 활성
                </div>
                <div className={`${styles.statValue} ${liveEvents.length > 0 ? styles.activeText : ''}`}>
                  {liveEvents.length}
                </div>
                <div className={styles.statSub}>최근 5분</div>
              </div>
            </div>
          ) : (
            <div className={styles.loading}>로딩 중...</div>
          )}
        </section>

        {/* ── SECTION 2: Live Events ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            🚨 실시간 신호
            {liveEvents.length > 0 && (
              <span className={styles.livePill}>● LIVE {liveEvents.length}</span>
            )}
          </h2>
          {loading ? (
            <div className={styles.loading}>로딩 중...</div>
          ) : liveEvents.length === 0 ? (
            <div className={styles.emptyLive}>
              <div>최근 5분간 감지된 신호 없음</div>
              <div className={styles.emptyHint}>다음 스캔: {countdown}초 후</div>
            </div>
          ) : (
            <div className={styles.liveGrid}>
              {liveEvents.map(ev => {
                const stars = signalStrength(ev.volumeMult, ev.changePct);
                const isPump = ev.type === 'PUMP';
                return (
                  <div
                    key={ev.id}
                    className={`${styles.liveCard} ${isPump ? styles.liveCardPump : styles.liveCardDump}`}
                  >
                    <div className={styles.liveCardTop}>
                      <span className={`${styles.liveTypeBadge} ${isPump ? styles.liveTypePump : styles.liveTypeDump}`}>
                        {isPump ? '▲ PUMP 신호' : '▼ DUMP 신호'}
                      </span>
                      <span className={styles.liveTimeAgo}>{timeAgo(ev.detectedAt)}</span>
                    </div>

                    <div className={styles.liveSymbol}>{ev.symbol}</div>
                    <div className={`${styles.liveChange} ${isPump ? styles.pumpText : styles.dumpText}`}>
                      {ev.changePct > 0 ? '+' : ''}{fmt(ev.changePct)}%
                    </div>

                    <div className={styles.liveStats}>
                      <div className={styles.liveStat}>
                        <span className={styles.liveStatLabel}>거래량 급증</span>
                        <span className={styles.liveStatVal}>x{fmt(ev.volumeMult, 1)}</span>
                        <span className={styles.liveStatSub}>{volAboveAvg(ev.volumeMult)}</span>
                      </div>
                      <div className={styles.liveStat}>
                        <span className={styles.liveStatLabel}>현재가</span>
                        <span className={styles.liveStatVal}>
                          ${fmt(ev.price, ev.price < 1 ? 6 : 2)}
                        </span>
                      </div>
                    </div>

                    <div className={styles.strengthRow}>
                      <span className={styles.strengthLabel}>신호 강도</span>
                      <span className={`${styles.stars} ${isPump ? styles.starsPump : styles.starsDump}`}>
                        {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
                      </span>
                    </div>
                    <div className={styles.strengthBar}>
                      <div
                        className={`${styles.strengthFill} ${isPump ? styles.fillPump : styles.fillDump}`}
                        style={{ width: `${(stars / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── SECTION 3: Recent History ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📋 최근 감지 내역</h2>
          <div className={styles.toolbar}>
            <div className={styles.filterTabs}>
              {(['ALL', 'PUMP', 'DUMP'] as const).map(f => (
                <button
                  key={f}
                  className={[
                    styles.tab,
                    filter === f ? styles.tabActive : '',
                    f === 'PUMP' ? styles.tabPump : '',
                    f === 'DUMP' ? styles.tabDump : '',
                  ].join(' ')}
                  onClick={() => setFilter(f)}
                >
                  {f === 'ALL' ? '전체' : f}
                </button>
              ))}
            </div>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="심볼 검색 (BTC, ETH...)"
              value={search}
              onChange={e => setSearch(e.target.value.toUpperCase())}
            />
          </div>

          {loading ? (
            <div className={styles.loading}>로딩 중...</div>
          ) : grouped.length === 0 ? (
            <div className={styles.empty}>
              {search ? `"${search}" 에 해당하는 이벤트가 없습니다` : '감지된 이벤트가 없습니다'}
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>타입</th>
                    <th>심볼</th>
                    <th>최대 가격 변동</th>
                    <th>거래량 증가</th>
                    <th>현재가</th>
                    <th>마지막 감지</th>
                    <th>감지 횟수</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map(g => {
                    const isPump = g.dominantType !== 'DUMP';
                    const ev = g.latest;
                    return (
                      <tr
                        key={g.symbol}
                        className={isPump ? styles.rowPump : styles.rowDump}
                      >
                        <td>
                          <span className={`${styles.badge} ${
                            g.dominantType === 'PUMP' ? styles.badgePump :
                            g.dominantType === 'DUMP' ? styles.badgeDump :
                            styles.badgeBoth
                          }`}>
                            {g.dominantType === 'PUMP' ? '▲ PUMP' :
                             g.dominantType === 'DUMP' ? '▼ DUMP' : '▲▼ MIX'}
                          </span>
                        </td>
                        <td className={styles.symbol}>{g.symbol}</td>
                        <td className={g.strongest.type === 'PUMP' ? styles.pumpText : styles.dumpText}>
                          {g.strongest.changePct > 0 ? '+' : ''}{fmt(g.strongest.changePct)}%
                        </td>
                        <td>
                          <span className={styles.volMain}>x{fmt(ev.volumeMult, 1)}</span>
                          <br />
                          <span className={styles.volSub}>{volAboveAvg(ev.volumeMult)}</span>
                        </td>
                        <td className={styles.price}>
                          ${fmt(ev.price, ev.price < 1 ? 6 : 2)}
                        </td>
                        <td className={styles.time}>{timeAgo(ev.detectedAt)}</td>
                        <td>
                          {g.count > 1 ? (
                            <span className={styles.countBadge}>{g.count}회</span>
                          ) : (
                            <span className={styles.countOnce}>1회</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
