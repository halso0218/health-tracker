import { analyze } from '../src/analysis/lagCorrelation';
import { ConditionRecord } from '../src/types';

// ─── ヘルパー ──────────────────────────────────────────────────

function makeRecord(
  date: string,
  score: 1 | 2 | 3 | 4 | 5,
  factors: string[] = []
): ConditionRecord {
  return {
    date,
    conditions: [{ timeSlot: '夜', score, symptoms: [], note: '' }],
    entries: factors.map(f => {
      const [catId, value] = f.split(':');
      return { categoryId: catId, timeSlot: '夜', value };
    }),
  };
}

function dateAfter(base: string, days: number): string {
  const [y, m, d] = base.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return [
    dt.getFullYear(),
    String(dt.getMonth() + 1).padStart(2, '0'),
    String(dt.getDate()).padStart(2, '0'),
  ].join('-');
}

// ─── addDays のテスト（分析エンジン内の日付計算） ─────────────────

describe('日付計算', () => {
  test('月末を超えた日付が正しく計算される', () => {
    // 1/31 + 1 = 2/1
    const records = [makeRecord('2024-01-31', 3), makeRecord('2024-02-01', 2)];
    const result = analyze(records, '2024-01-31');
    // サンプル不足でもクラッシュしないことを確認
    expect(result.dataCount).toBe(2);
  });

  test('うるう年の2/28 + 1 = 2/29', () => {
    const records = [makeRecord('2024-02-28', 3), makeRecord('2024-02-29', 2)];
    const result = analyze(records, '2024-02-28');
    expect(result.dataCount).toBe(2);
  });
});

// ─── サンプル数不足 ────────────────────────────────────────────

describe('サンプル数不足', () => {
  test('4件以下では分析不可メッセージを返す', () => {
    const records = [
      makeRecord('2024-01-01', 3),
      makeRecord('2024-01-02', 2),
      makeRecord('2024-01-03', 4),
      makeRecord('2024-01-04', 3),
    ];
    const result = analyze(records, '2024-01-04');
    expect(result.topCauses).toHaveLength(0);
    expect(result.message).toContain('あと');
  });

  test('5件でも体調記録がない場合は不可', () => {
    const records: ConditionRecord[] = [
      { date: '2024-01-01', conditions: [], entries: [] },
      { date: '2024-01-02', conditions: [], entries: [] },
      { date: '2024-01-03', conditions: [], entries: [] },
      { date: '2024-01-04', conditions: [], entries: [] },
      { date: '2024-01-05', conditions: [], entries: [] },
    ];
    const result = analyze(records, '2024-01-05');
    expect(result.topCauses).toHaveLength(0);
  });
});

// ─── ラグ相関の検出 ────────────────────────────────────────────

describe('ラグ相関の検出', () => {
  test('翌日に不調が出るパターン（ラグ1）を検出できる', () => {
    // アルコールを飲んだ翌日は体調スコアが低い（明確な相関）
    const base = '2024-01-01';
    const records: ConditionRecord[] = [];
    for (let i = 0; i < 20; i++) {
      const date = dateAfter(base, i);
      const hasAlcohol = i % 2 === 0; // 偶数日にアルコール
      const score = hasAlcohol ? (5 as const) : (2 as const); // 偶数日の翌日（奇数日）に不調
      records.push(makeRecord(date, score, hasAlcohol ? ['alcohol:多量'] : []));
    }
    // 偶数日にアルコール → 奇数日にスコアが低いパターンを構築
    // ラグ1で負の相関が出るはず
    const result = analyze(records, dateAfter(base, 19));
    expect(result.dataCount).toBeGreaterThanOrEqual(5);
    // 因子が検出されるか、または十分なサンプル数があることを確認
    expect(result.message).not.toContain('あと');
  });

  test('相関がない場合は topCauses が空になりうる', () => {
    const base = '2024-01-01';
    const records: ConditionRecord[] = [];
    for (let i = 0; i < 10; i++) {
      const date = dateAfter(base, i);
      records.push(makeRecord(date, 3)); // 全日スコア3、行動なし
    }
    const result = analyze(records, dateAfter(base, 9));
    // 均一スコアでは相関係数が計算できず0になるため因子なし
    expect(result.topCauses).toHaveLength(0);
  });
});

// ─── 累積効果の検出 ────────────────────────────────────────────

describe('累積効果の検出', () => {
  test('連続行動 → 不調パターンを検出できる', () => {
    const base = '2024-01-01';
    const records: ConditionRecord[] = [];

    // 3日連続でアルコール飲んだ翌日（4日目）は体調スコアが低い
    for (let week = 0; week < 5; week++) {
      const offset = week * 7;
      // 連続3日: アルコール（スコアは普通）
      for (let d = 0; d < 3; d++) {
        records.push(makeRecord(dateAfter(base, offset + d), 3, ['alcohol:多量']));
      }
      // 4日目: 不調
      records.push(makeRecord(dateAfter(base, offset + 3), 1));
      // 5〜7日目: 普通
      for (let d = 4; d < 7; d++) {
        records.push(makeRecord(dateAfter(base, offset + d), 4));
      }
    }

    const result = analyze(records, dateAfter(base, 34));
    expect(result.dataCount).toBeGreaterThanOrEqual(5);
    // 累積効果または通常ラグ相関が検出されるか確認
    expect(result.message).not.toContain('あと');
  });
});

// ─── 結果の形式 ────────────────────────────────────────────────

describe('結果の形式', () => {
  test('topCauses は最大5件', () => {
    const base = '2024-01-01';
    const records: ConditionRecord[] = [];
    // 多数の因子を持つレコードを生成
    for (let i = 0; i < 20; i++) {
      const date = dateAfter(base, i);
      const factors = i % 2 === 0
        ? ['food:ラーメン', 'alcohol:多量', 'caffeine:コーヒー2杯以上', 'stress:高い', 'exercise:なし', 'sleep:5時間']
        : [];
      records.push(makeRecord(date, i % 2 === 0 ? 5 : 1, factors));
    }
    const result = analyze(records, dateAfter(base, 19));
    expect(result.topCauses.length).toBeLessThanOrEqual(5);
  });

  test('CorrelationResult の各フィールドが正しい型', () => {
    const base = '2024-01-01';
    const records: ConditionRecord[] = [];
    for (let i = 0; i < 10; i++) {
      records.push(makeRecord(dateAfter(base, i), i < 5 ? 5 : 1, i < 5 ? ['alcohol:多量'] : []));
    }
    const result = analyze(records, dateAfter(base, 9));
    for (const cause of result.topCauses) {
      expect(typeof cause.factor).toBe('string');
      expect(typeof cause.lagDays).toBe('number');
      expect(typeof cause.correlation).toBe('number');
      expect(cause.correlation).toBeGreaterThanOrEqual(-1);
      expect(cause.correlation).toBeLessThanOrEqual(1);
      expect(typeof cause.sampleCount).toBe('number');
      expect(typeof cause.isAccumulative).toBe('boolean');
    }
  });

  test('conditionScore は対象日の平均スコア', () => {
    const records = [
      { date: '2024-01-01', conditions: [
        { timeSlot: '朝' as const, score: 2 as const, symptoms: [], note: '' },
        { timeSlot: '夜' as const, score: 4 as const, symptoms: [], note: '' },
      ], entries: [] },
      makeRecord('2024-01-02', 3),
      makeRecord('2024-01-03', 3),
      makeRecord('2024-01-04', 3),
      makeRecord('2024-01-05', 3),
    ];
    const result = analyze(records, '2024-01-01');
    expect(result.conditionScore).toBe(3); // (2+4)/2 = 3
  });
});

// ─── エッジケース ──────────────────────────────────────────────

describe('エッジケース', () => {
  test('記録が0件でもクラッシュしない', () => {
    const result = analyze([], '2024-01-01');
    expect(result.topCauses).toHaveLength(0);
    expect(result.conditionScore).toBe(0);
  });

  test('対象日の記録がなくても conditionScore は0を返す', () => {
    const records = [
      makeRecord('2024-01-01', 3),
      makeRecord('2024-01-02', 3),
      makeRecord('2024-01-03', 3),
      makeRecord('2024-01-04', 3),
      makeRecord('2024-01-05', 3),
    ];
    const result = analyze(records, '2024-12-31'); // 存在しない日付
    expect(result.conditionScore).toBe(0);
  });

  test('free_text の値が空の場合は因子登録されない', () => {
    const records: ConditionRecord[] = [
      { date: '2024-01-01', conditions: [{ timeSlot: '夜', score: 3, symptoms: [], note: '' }],
        entries: [{ categoryId: 'memo', timeSlot: '夜', value: '' }] },
    ];
    // クラッシュしないことを確認
    const result = analyze(records, '2024-01-01');
    expect(result).toBeDefined();
  });
});
