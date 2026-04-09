import * as SecureStore from 'expo-secure-store';
import { ConditionRecord } from '../types';

const indexKey = () => 'health_record_index';
const dateKey = (date: string) => `health_record_${date}`;

async function getIndex(): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(indexKey());
  if (!raw) return [];
  return JSON.parse(raw);
}

async function saveIndex(dates: string[]): Promise<void> {
  await SecureStore.setItemAsync(indexKey(), JSON.stringify(dates));
}

export async function saveRecord(record: ConditionRecord): Promise<void> {
  await SecureStore.setItemAsync(dateKey(record.date), JSON.stringify(record));
  const index = await getIndex();
  if (!index.includes(record.date)) {
    index.push(record.date);
    index.sort();
    await saveIndex(index);
  }
}

export async function getRecord(date: string): Promise<ConditionRecord | null> {
  const raw = await SecureStore.getItemAsync(dateKey(date));
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function getAllRecords(): Promise<ConditionRecord[]> {
  const index = await getIndex();
  const records: ConditionRecord[] = [];
  for (const date of index) {
    const record = await getRecord(date);
    if (record) records.push({
      date: record.date,
      conditions: record.conditions ?? [],
      entries: record.entries ?? [],
    });
  }
  return records;
}

export async function deleteRecord(date: string): Promise<void> {
  await SecureStore.deleteItemAsync(dateKey(date));
  const index = await getIndex();
  await saveIndex(index.filter(d => d !== date));
}

/** 空レコードを取得または新規作成。旧フォーマットのデータも安全に扱う */
export async function getOrCreateRecord(date: string): Promise<ConditionRecord> {
  const existing = await getRecord(date);
  if (!existing) return { date, conditions: [], entries: [] };
  return {
    date: existing.date,
    conditions: existing.conditions ?? [],
    entries: existing.entries ?? [],
  };
}
