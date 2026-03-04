'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

interface SettingConfig {
  key: string;
  label: string;
  description: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}

const SETTINGS: SettingConfig[] = [
  {
    key: 'SCAN_TOP_N',
    label: '감시 코인 수',
    description: '바이낸스 24h 거래량 기준 상위 N개 코인을 스캔합니다. 높을수록 더 많은 코인을 감시하지만 처리 시간이 늘어납니다.',
    unit: '개',
    min: 10,
    max: 500,
    step: 10,
  },
  {
    key: 'SCAN_PUMP_PCT',
    label: 'PUMP 기준',
    description: '24시간 대비 가격 변화율이 이 값 이상이면 PUMP로 판정합니다. 낮을수록 더 많은 이벤트가 감지됩니다.',
    unit: '%',
    min: 1,
    max: 50,
    step: 0.5,
  },
  {
    key: 'SCAN_DUMP_PCT',
    label: 'DUMP 기준',
    description: '24시간 대비 가격 변화율이 이 값 이하(-값)이면 DUMP로 판정합니다. 낮을수록 더 많은 이벤트가 감지됩니다.',
    unit: '%',
    min: 1,
    max: 50,
    step: 0.5,
  },
  {
    key: 'SCAN_VOLUME_MULT',
    label: '거래량 배수 기준',
    description: '해당 코인의 거래량이 감시 대상 코인들의 평균 거래량의 N배 이상일 때만 이벤트로 인정합니다. 높을수록 이상 거래량만 필터링됩니다.',
    unit: '배',
    min: 0.5,
    max: 20,
    step: 0.5,
  },
  {
    key: 'SCAN_COOLDOWN_MINUTES',
    label: '중복 감지 쿨타임',
    description: '같은 코인이 같은 방향(PUMP/DUMP)으로 다시 감지되기까지 최소 대기 시간입니다. 중복 이벤트를 방지합니다.',
    unit: '분',
    min: 1,
    max: 1440,
    step: 1,
  },
];

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setValues(data);
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <span>⚡</span>
          <span>Bemi Alert</span>
        </Link>
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>대시보드</Link>
          <Link href="/settings" className={`${styles.navLink} ${styles.navActive}`}>설정</Link>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>설정 & 문서</h1>
            <p className={styles.subtitle}>스캔 파라미터를 조정하고 각 설정의 의미를 확인하세요.</p>
          </div>
          <button
            className={`${styles.saveBtn} ${saved ? styles.saveBtnSuccess : ''}`}
            onClick={handleSave}
            disabled={loading}
          >
            {saved ? '✓ 저장 완료' : '설정 저장'}
          </button>
        </div>

        {/* 작동 방식 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>작동 방식</h2>
          <div className={styles.docCard}>
            <div className={styles.flowChart}>
              <div className={styles.flowStep}>
                <div className={styles.flowIcon}>🔄</div>
                <div className={styles.flowLabel}>주기적 스캔</div>
                <div className={styles.flowDesc}>60초마다 바이낸스 API 호출</div>
              </div>
              <div className={styles.flowArrow}>→</div>
              <div className={styles.flowStep}>
                <div className={styles.flowIcon}>📊</div>
                <div className={styles.flowLabel}>데이터 수집</div>
                <div className={styles.flowDesc}>상위 N개 코인의 24h 가격·거래량</div>
              </div>
              <div className={styles.flowArrow}>→</div>
              <div className={styles.flowStep}>
                <div className={styles.flowIcon}>🧮</div>
                <div className={styles.flowLabel}>조건 판별</div>
                <div className={styles.flowDesc}>가격 변화율 & 거래량 배수 계산</div>
              </div>
              <div className={styles.flowArrow}>→</div>
              <div className={styles.flowStep}>
                <div className={styles.flowIcon}>💾</div>
                <div className={styles.flowLabel}>이벤트 저장</div>
                <div className={styles.flowDesc}>조건 만족 & 쿨타임 지나면 DB 기록</div>
              </div>
            </div>
          </div>
        </section>

        {/* 판별 공식 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>판별 공식</h2>
          <div className={styles.formulaGrid}>
            <div className={`${styles.formulaCard} ${styles.pumpFormula}`}>
              <div className={styles.formulaTitle}>▲ PUMP 감지 조건</div>
              <div className={styles.formula}>
                가격변화율 ≥ <span className={styles.pumpText}>+PUMP기준%</span>
                <br />AND<br />
                거래량배수 ≥ <span className={styles.pumpText}>거래량배수기준</span>
              </div>
            </div>
            <div className={`${styles.formulaCard} ${styles.dumpFormula}`}>
              <div className={styles.formulaTitle}>▼ DUMP 감지 조건</div>
              <div className={styles.formula}>
                가격변화율 ≤ <span className={styles.dumpText}>−DUMP기준%</span>
                <br />AND<br />
                거래량배수 ≥ <span className={styles.dumpText}>거래량배수기준</span>
              </div>
            </div>
          </div>
          <div className={styles.docNote}>
            * 거래량배수 = 해당 코인의 24h 거래량 ÷ 감시 대상 코인 전체의 평균 24h 거래량
          </div>
        </section>

        {/* 파라미터 설정 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>파라미터 설정</h2>
          {loading ? (
            <div className={styles.loading}>로딩 중...</div>
          ) : (
            <div className={styles.settingsGrid}>
              {SETTINGS.map(s => (
                <div key={s.key} className={styles.settingCard}>
                  <div className={styles.settingHeader}>
                    <span className={styles.settingLabel}>{s.label}</span>
                    <span className={styles.settingKey}>{s.key}</span>
                  </div>
                  <p className={styles.settingDesc}>{s.description}</p>
                  <div className={styles.settingInput}>
                    <input
                      type="number"
                      min={s.min}
                      max={s.max}
                      step={s.step}
                      value={values[s.key] ?? ''}
                      onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
                      className={styles.input}
                    />
                    <span className={styles.unit}>{s.unit}</span>
                  </div>
                  <div className={styles.settingRange}>범위: {s.min} ~ {s.max} {s.unit}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {saved && <div className={styles.savedToast}>✓ 설정이 저장되었습니다</div>}
    </div>
  );
}
