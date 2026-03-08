import { runScanOnce } from '../data/scanner';

async function main() {
  console.log('[worker] Bemi worker started');
  while (true) {
    try {
      await runScanOnce();
    } catch (err) {
      console.error('[worker] runScanOnce 에러 (60초 후 재시도):', err);
    }
    await new Promise(r => setTimeout(r, 60_000));
  }
}

main().catch(err => {
  console.error('[worker] 치명적 오류로 종료:', err);
  process.exit(1);
});
