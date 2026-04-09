import * as SecureStore from 'expo-secure-store';
import { Category } from '../types';

const CATEGORIES_KEY = 'health_categories';

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'food',
    name: '食事',
    inputType: 'free_text',
    isDefault: true,
  },
  {
    id: 'alcohol',
    name: 'アルコール',
    inputType: 'select',
    options: ['なし', '少量', '中量（ビール2杯程度）', '多量'],
    isDefault: true,
  },
  {
    id: 'sleep',
    name: '睡眠',
    inputType: 'select',
    options: ['4時間未満', '5時間', '6時間', '7時間', '8時間以上'],
    isDefault: true,
  },
  {
    id: 'exercise',
    name: '運動',
    inputType: 'select',
    options: ['なし', '軽い（散歩等）', '中程度', '激しい'],
    isDefault: true,
  },
  {
    id: 'caffeine',
    name: 'カフェイン',
    inputType: 'select',
    options: ['なし', 'コーヒー1杯', 'コーヒー2杯以上', 'お茶のみ'],
    isDefault: true,
  },
  {
    id: 'stress',
    name: 'ストレス',
    inputType: 'select',
    options: ['低い', '普通', '高い', '非常に高い'],
    isDefault: true,
  },
  {
    id: 'memo',
    name: '行動メモ',
    inputType: 'free_text',
    isDefault: true,
  },
];

export async function getCategories(): Promise<Category[]> {
  const raw = await SecureStore.getItemAsync(CATEGORIES_KEY);
  if (!raw) {
    await saveCategories(DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }
  return JSON.parse(raw);
}

export async function saveCategories(categories: Category[]): Promise<void> {
  await SecureStore.setItemAsync(CATEGORIES_KEY, JSON.stringify(categories));
}

export async function addCategory(category: Category): Promise<void> {
  const categories = await getCategories();
  categories.push(category);
  await saveCategories(categories);
}

export async function updateCategory(updated: Category): Promise<void> {
  const categories = await getCategories();
  const idx = categories.findIndex(c => c.id === updated.id);
  if (idx >= 0) {
    categories[idx] = updated;
    await saveCategories(categories);
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const categories = await getCategories();
  await saveCategories(categories.filter(c => c.id !== id));
}

export function generateId(): string {
  return `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
