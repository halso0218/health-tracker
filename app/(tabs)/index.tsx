import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getAllRecords, getRecord } from '../../src/storage/records';
import { getCategories } from '../../src/storage/categories';
import { Category, ConditionRecord } from '../../src/types';

const TODAY = new Date().toISOString().split('T')[0];

const SCORE_LABELS: Record<number, string> = {
  1: '😞 最悪', 2: '😕 悪い', 3: '😐 普通', 4: '🙂 良い', 5: '😄 最高',
};

export default function HomeScreen() {
  const [todayRecord, setTodayRecord] = useState<ConditionRecord | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const [today, all, cats] = await Promise.all([
      getRecord(TODAY),
      getAllRecords(),
      getCategories(),
    ]);
    setTodayRecord(today);
    setTotalCount(all.length);
    setCategories(cats);
  }

  const conds = todayRecord?.conditions ?? [];
  const latestCondition = conds.length > 0 ? conds[conds.length - 1] : undefined;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.dateText}>{TODAY}</Text>
      <Text style={styles.heading}>今日のサマリー</Text>

      {/* 最新体調 */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>体調（直近）</Text>
        {latestCondition ? (
          <>
            <Text style={styles.scoreText}>{SCORE_LABELS[latestCondition.score]}</Text>
            <Text style={styles.slotText}>{latestCondition.timeSlot}に記録</Text>
            {latestCondition.symptoms.length > 0 && (
              <Text style={styles.sub}>{latestCondition.symptoms.join('・')}</Text>
            )}
          </>
        ) : (
          <Text style={styles.empty}>未記録 →「体調」タブから入力</Text>
        )}
      </View>

      {/* 今日の記録 */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>今日の記録</Text>
        {todayRecord && todayRecord.entries.length > 0 ? (
          todayRecord.entries.map((e, i) => {
            const cat = categories.find(c => c.id === e.categoryId);
            return (
              <View key={i} style={styles.entryRow}>
                <Text style={styles.entrySlot}>{e.timeSlot}</Text>
                <Text style={styles.entryCat}>{cat?.name ?? e.categoryId}</Text>
                <Text style={styles.entryVal}>{e.value}</Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.empty}>未記録 →「記録」タブから入力</Text>
        )}
      </View>

      {/* 統計 */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{totalCount}</Text>
          <Text style={styles.statLabel}>記録日数</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>
            {totalCount >= 5 ? '分析可能' : `あと${5 - totalCount}日`}
          </Text>
          <Text style={styles.statLabel}>分析ステータス</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  dateText: { color: '#6b7280', fontSize: 13 },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827' },
  card: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 16, gap: 6,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 2 },
  scoreText: { fontSize: 26, fontWeight: '700', color: '#111827' },
  slotText: { fontSize: 12, color: '#9ca3af' },
  sub: { fontSize: 13, color: '#374151' },
  empty: { fontSize: 14, color: '#9ca3af' },
  entryRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  entrySlot: { fontSize: 12, color: '#2563eb', fontWeight: '600', width: 36 },
  entryCat: { fontSize: 12, color: '#6b7280', width: 60 },
  entryVal: { fontSize: 14, color: '#111827', flex: 1 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: {
    flex: 1, backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  statNum: { fontSize: 20, fontWeight: '700', color: '#2563eb' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
});
