// 時間帯（7区分）
export type TimeSlot =
  | '朝'     // 5-8時
  | '午前'   // 8-12時
  | '昼'     // 12-14時
  | '午後'   // 14-17時
  | '夕方'   // 17-19時
  | '夜'     // 19-23時
  | '深夜';  // 23-5時

export const TIME_SLOTS: TimeSlot[] = ['朝', '午前', '昼', '午後', '夕方', '夜', '深夜'];

// カテゴリの入力タイプ
export type CategoryInputType = 'free_text' | 'select';

// ユーザー定義カテゴリ
export type Category = {
  id: string;
  name: string;
  inputType: CategoryInputType;
  options?: string[]; // select の場合の選択肢
  isDefault?: boolean; // デフォルトカテゴリは削除不可
};

// 1件の体調記録
export type ConditionEntry = {
  timeSlot: TimeSlot;
  score: 1 | 2 | 3 | 4 | 5;
  symptoms: string[];
  note: string;
};

// 1件の行動・食事等記録
export type DataEntry = {
  categoryId: string;
  timeSlot: TimeSlot;
  value: string; // 自由記述の場合はテキスト、選択式の場合は選択肢の値
};

// 1日分のレコード
export type ConditionRecord = {
  date: string; // "YYYY-MM-DD"
  conditions: ConditionEntry[];
  entries: DataEntry[];
};

// 分析結果
export type CorrelationResult = {
  factor: string;           // "アルコール:多量" or "食事:ラーメン"
  lagDays: number;          // 何日前か（累積の場合は0）
  correlation: number;      // -1 〜 1
  sampleCount: number;
  isAccumulative: boolean;
  consecutiveDays?: number;
};

export type AnalysisResult = {
  date: string;
  conditionScore: number;
  topCauses: CorrelationResult[];
  dataCount: number;
  message: string;
};
