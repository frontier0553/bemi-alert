export type FilterType = 'ALL' | 'PUMP' | 'DUMP';

export interface Event {
  id: string;
  symbol: string;
  type: 'PUMP' | 'DUMP';
  changePct: number;
  volumeMult: number;
  price: number;
  detectedAt: string;
  // STEP 1 fields (present on Signal-backed events)
  changeWindow?: '3m' | '5m';
  volRatio?: number;
}

export interface Stats {
  todayTotal: number;
  todayPumps: number;
  todayDumps: number;
  topPump: Event | null;
  topDump: Event | null;
}

export interface GroupedSymbol {
  symbol: string;
  dominantType: 'PUMP' | 'DUMP' | 'BOTH';
  count: number;
  pumpCount: number;
  dumpCount: number;
  latest: Event;
  strongest: Event;
}
