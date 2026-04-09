import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getAllRecords } from '../../src/storage/records';
import { analyze } from '../../src/analysis/lagCorrelation';
import { AnalysisResult } from '../../src/types';

const TODAY = new Date().toISOString().split('T')[0];

export default function AnalysisScreen() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      run();
    }, [])
  );

  async function run() {
    setLoading(true);
    try {
      const records = await getAllRecords();
      const r = analyze(records, TODAY);
      setResult(r);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>不調の原因分析</Text>
      <Text style={styles.sub}>最大14日前の行動・食事との相関を分析します</Text>

      {loading && <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />}

      {!loading && result && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>分析対象日</Text>
            <Text style={styles.dateText}>{result.date}</Text>
            <Text style={[styles.cardLabel, { marginTop: 8 }]}>
              データ件数: {result.dataCount} 件
            </Text>
          </View>

          {result.topCauses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{result.message}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>有力な原因（相関が強い順）</Text>
              {result.topCauses.map((cause, i) => (
                <View key={i} style={styles.causeCard}>
                  <View style={styles.causeHeader}>
                    <Text style={styles.causeStrength}>
                      {cause.correlation <= -0.6 ? '🔴 強い相関' : '🟡 中程度の相関'}
                    </Text>
                    <Text style={styles.corrValue}>
                      相関: {cause.correlation.toFixed(2)}
                    </Text>
                  </View>

                  {cause.isAccumulative ? (
                    <Text style={styles.causeFactor}>
                      「{cause.factor}」が {cause.consecutiveDays} 日連続
                    </Text>
                  ) : (
                    <Text style={styles.causeFactor}>
                      {cause.lagDays} 日前の「{cause.factor}」
                    </Text>
                  )}

                  <Text style={styles.causeSample}>
                    サンプル数: {cause.sampleCount} 件
                  </Text>
                </View>
              ))}

              <View style={styles.noteCard}>
                <Text style={styles.noteText}>
                  ⚠️ 相関は因果関係ではありません。あくまで傾向の参考としてご利用ください。
                </Text>
              </View>
            </>
          )}

          <TouchableOpacity style={styles.rerunBtn} onPress={run}>
            <Text style={styles.rerunBtnText}>再分析する</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 14, color: '#6b7280', marginTop: -8 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  dateText: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  causeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  causeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  causeStrength: { fontSize: 13, fontWeight: '600', color: '#374151' },
  corrValue: { fontSize: 12, color: '#6b7280' },
  causeFactor: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  causeSample: { fontSize: 12, color: '#9ca3af' },
  emptyCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  emptyText: { fontSize: 14, color: '#92400e', lineHeight: 22 },
  noteCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  noteText: { fontSize: 12, color: '#64748b', lineHeight: 18 },
  rerunBtn: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  rerunBtnText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
});
