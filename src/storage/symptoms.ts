import * as SecureStore from 'expo-secure-store';

const SYMPTOMS_KEY = 'health_symptoms';

const DEFAULT_SYMPTOMS: string[] = [
  '頭痛', '倦怠感', '腹痛', '不眠', 'むくみ', '肩こり', '食欲不振', '気分の落ち込み',
];

export async function getSymptoms(): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(SYMPTOMS_KEY);
  if (!raw) {
    await saveSymptoms(DEFAULT_SYMPTOMS);
    return DEFAULT_SYMPTOMS;
  }
  return JSON.parse(raw);
}

export async function saveSymptoms(symptoms: string[]): Promise<void> {
  await SecureStore.setItemAsync(SYMPTOMS_KEY, JSON.stringify(symptoms));
}

export async function addSymptom(name: string): Promise<void> {
  const symptoms = await getSymptoms();
  symptoms.push(name);
  await saveSymptoms(symptoms);
}

export async function deleteSymptom(index: number): Promise<void> {
  const symptoms = await getSymptoms();
  symptoms.splice(index, 1);
  await saveSymptoms(symptoms);
}

export async function moveSymptom(index: number, dir: 'up' | 'down'): Promise<void> {
  const symptoms = await getSymptoms();
  const swap = dir === 'up' ? index - 1 : index + 1;
  if (swap < 0 || swap >= symptoms.length) return;
  [symptoms[index], symptoms[swap]] = [symptoms[swap], symptoms[index]];
  await saveSymptoms(symptoms);
}
