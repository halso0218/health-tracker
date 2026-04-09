import { ConditionRecord, CorrelationResult, AnalysisResult } from '../types';

const MAX_LAG_DAYS = 14;
const MIN_SAMPLE_COUNT = 5;

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  const num = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
  const denX = Math.sqrt(x.reduce((s, xi) => s + (xi - meanX) ** 2, 0));
  const denY = Math.sqrt(y.reduce((s, yi) => s + (yi - meanY) ** 2, 0));
  if (denX === 0 || denY === 0) return 0;
  return num / (denX * denY);
}

function buildDateMap(records: ConditionRecord[]): Map<string, ConditionRecord> {
  const map = new Map<string, ConditionRecord>();
  for (const r of records) map.set(r.date, r);
  return map;
}

/** 1日の平均体調スコアを計算（複数記録がある場合は平均） */
function avgScore(record: ConditionRecord): number {
  if (record.conditions.length === 0) return 0;
  const sum = record.conditions.reduce((s, c) => s + c.score, 0);
  return sum / record.conditions.length;
}

/**
 * その日に特定の因子が含まれているかを 0/1 で返す。
 * - select型カテゴリ: "カテゴリ名:値" のキーで一致判定
 * - free_text型カテゴリ: テキストに因子名が含まれるか
 */
function hasFactor(record: ConditionRecord, factor: string): number {
  for (const entry of record.entries) {
    const key = `${entry.categoryId}:${entry.value}`;
    if (key === factor) return 1;
    // free_text の部分一致
    if (entry.value.includes(factor)) return 1;
  }
  return 0;
}

/** 全因子キーを収集 */
function collectFactors(records: ConditionRecord[]): Set<string> {
  const factors = new Set<string>();
  for (const r of records) {
    for (const entry of r.entries) {
      // select型: "categoryId:value" をキーとして登録
      factors.add(`${entry.categoryId}:${entry.value}`);
      // free_text型: スペース・読点で分割してキーワードを登録
      if (entry.value.length > 0) {
        entry.value
          .split(/[、,，\s　]+/)
          .filter(f => f.length >= 2)
          .forEach(f => factors.add(f));
      }
    }
  }
  return factors;
}

export function analyze(records: ConditionRecord[], targetDate: string): AnalysisResult {
  // 体調スコアが1件以上あるレコードのみ対象
  const validRecords = records.filter(r => r.conditions.length > 0);

  if (validRecords.length < MIN_SAMPLE_COUNT) {
    const target = records.find(r => r.date === targetDate);
    return {
      date: targetDate,
      conditionScore: target ? avgScore(target) : 0,
      topCauses: [],
      dataCount: validRecords.length,
      message: `分析にはあと${Math.max(0, MIN_SAMPLE_COUNT - validRecords.length)}件以上の体調記録が必要です。`,
    };
  }

  const dateMap = buildDateMap(records);
  const sorted = [...validRecords].sort((a, b) => a.date.localeCompare(b.date));
  const allFactors = collectFactors(records);
  const results: CorrelationResult[] = [];

  for (const factor of allFactors) {
    // ラグ別単発相関
    for (let lag = 1; lag <= MAX_LAG_DAYS; lag++) {
      const x: number[] = [];
      const y: number[] = [];

      for (const record of sorted) {
        const futureDate = addDays(record.date, lag);
        const futureRecord = dateMap.get(futureDate);
        if (!futureRecord || futureRecord.conditions.length === 0) continue;
        x.push(hasFactor(record, factor));
        y.push(avgScore(futureRecord));
      }

      if (x.length < MIN_SAMPLE_COUNT) continue;
      if (!x.some(v => v === 1)) continue;

      const corr = pearsonCorrelation(x, y);
      if (corr <= -0.3) {
        results.push({ factor, lagDays: lag, correlation: corr, sampleCount: x.length, isAccumulative: false });
      }
    }

    // 累積効果（対象日の前N日連続でその因子がある場合）
    for (let streak = 2; streak <= 7; streak++) {
      const x: number[] = [];
      const y: number[] = [];

      for (const record of sorted) {
        if (record.conditions.length === 0) continue;
        let isStreak = true;
        // i=1〜streak: 対象日の「前N日」をチェック（対象日自身は含まない）
        for (let i = 1; i <= streak; i++) {
          const d = addDays(record.date, -i);
          const r = dateMap.get(d);
          if (!r || !hasFactor(r, factor)) { isStreak = false; break; }
        }
        x.push(isStreak ? 1 : 0);
        y.push(avgScore(record));
      }

      if (x.length < MIN_SAMPLE_COUNT || !x.some(v => v === 1)) continue;
      const corr = pearsonCorrelation(x, y);
      if (corr <= -0.35) {
        results.push({ factor, lagDays: 0, correlation: corr, sampleCount: x.length, isAccumulative: true, consecutiveDays: streak });
      }
    }
  }

  results.sort((a, b) => a.correlation - b.correlation);
  const topCauses = results.slice(0, 5);

  const targetRecord = dateMap.get(targetDate);
  return {
    date: targetDate,
    conditionScore: targetRecord ? avgScore(targetRecord) : 0,
    topCauses,
    dataCount: validRecords.length,
    message: topCauses.length === 0
      ? 'まだ明確な相関因子は見つかりません。記録を続けてください。'
      : `${validRecords.length}件の体調記録から分析しました。`,
  };
}
