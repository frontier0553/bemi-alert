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

function fmt(v: number, digits = 2) {
  return v.toFixed(digits);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
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
              {lastUpdated.toLocaleTimeString('ko-KR')} 갱신 · {countdown}초 후 자동 새로고침
            </span>
          )}
          <button className={styles.refreshBtn} onClick={fetchData}>
            새로고침
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {stats && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>오늘 감지</div>
              <div className={styles.statValue}>{stats.todayTotal}</div>
              <div className={styles.statSub}>총 이벤트</div>
            </div>
            <div className={`${styles.statCard} ${styles.pumpCard}`}>
              <div className={styles.statLabel}>PUMP</div>
              <div className={`${styles.statValue} ${styles.pumpText}`}>{stats.todayPumps}</div>
              <div className={styles.statSub}>급등 감지</div>
            </div>
            <div className={`${styles.statCard} ${styles.dumpCard}`}>
              <div className={styles.statLabel}>DUMP</div>
              <div className={`${styles.statValue} ${styles.dumpText}`}>{stats.todayDumps}</div>
              <div className={styles.statSub}>급락 감지</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>최고 급등</div>
              {stats.topPump ? (
                <>
                  <div className={`${styles.statValue} ${styles.pumpText}`}>
                    +{fmt(stats.topPump.changePct)}%
                  </div>
                  <div className={styles.statSub}>{stats.topPump.symbol}</div>
                </>
              ) : (
                <div className={styles.statSub}>없음</div>
              )}
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>최고 급락</div>
              {stats.topDump ? (
                <>
                  <div className={`${styles.statValue} ${styles.dumpText}`}>
                    {fmt(stats.topDump.changePct)}%
                  </div>
                  <div className={styles.statSub}>{stats.topDump.symbol}</div>
                </>
              ) : (
                <div className={styles.statSub}>없음</div>
              )}
            </div>
          </div>
        )}

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
          <div className={styles.loading}>데이터 로딩 중</div>
        ) : events.length === 0 ? (
          <div className={styles.empty}>
            {search
              ? `"${search}" 에 해당하는 이벤트가 없습니다`
              : '감지된 이벤트가 없습니다'}
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>타입</th>
                  <th>심볼</th>
                  <th>변화율</th>
                  <th>거래량 배수</th>
                  <th>가격</th>
                  <th>감지 시간</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr
                    key={ev.id}
                    className={ev.type === 'PUMP' ? styles.rowPump : styles.rowDump}
                  >
                    <td>
                      <span
                        className={`${styles.badge} ${
                          ev.type === 'PUMP' ? styles.badgePump : styles.badgeDump
                        }`}
                      >
                        {ev.type === 'PUMP' ? '▲ PUMP' : '▼ DUMP'}
                      </span>
                    </td>
                    <td className={styles.symbol}>{ev.symbol}</td>
                    <td className={ev.type === 'PUMP' ? styles.pumpText : styles.dumpText}>
                      {ev.changePct > 0 ? '+' : ''}
                      {fmt(ev.changePct)}%
                    </td>
                    <td>x{fmt(ev.volumeMult, 1)}</td>
                    <td className={styles.price}>
                      ${fmt(ev.price, ev.price < 1 ? 6 : 2)}
                    </td>
                    <td className={styles.time}>{timeAgo(ev.detectedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
