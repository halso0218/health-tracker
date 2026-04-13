import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
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

      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.dateText}>{TODAY}</Text>
        <Text style={styles.heading}>今日のサマリー</Text>
      </View>

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
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{totalCount}</Text>
            <Text style={styles.statLabel}>記録日数</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>
              {totalCount >= 5 ? '分析可能' : `あと${5 - totalCount}日`}
            </Text>
            <Text style={styles.statLabel}>分析ステータス</Text>
          </View>
        </View>
      </View>

      {/* データ管理 */}
      <TouchableOpacity style={styles.manageBtn} onPress={() => router.push('/data-management')}>
        <Text style={styles.manageBtnText}>データを管理 ›</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },

  header: { gap: 2 },
  dateText: { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
  heading: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },

  card: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 16, gap: 6,
    minHeight: 90,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5, marginBottom: 2 },
  scoreText: { fontSize: 26, fontWeight: '700', color: '#111827' },
  slotText: { fontSize: 12, color: '#9ca3af' },
  sub: { fontSize: 13, color: '#374151' },
  empty: { fontSize: 14, color: '#9ca3af' },

  entryRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  entrySlot: { fontSize: 12, color: '#2563eb', fontWeight: '600', width: 36 },
  entryCat: { fontSize: 12, color: '#6b7280', width: 60 },
  entryVal: { fontSize: 14, color: '#111827', flex: 1 },

  statsCard: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 36, backgroundColor: '#bfdbfe' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#2563eb' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 4, letterSpacing: 0.3 },

  manageBtn: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', backgroundColor: '#ffffff',
  },
  manageBtnText: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
});
