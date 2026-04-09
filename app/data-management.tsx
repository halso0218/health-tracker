import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getAllRecords, deleteRecord } from '../src/storage/records';
import { getCategories } from '../src/storage/categories';
import { Category, ConditionRecord } from '../src/types';

const SCORE_LABELS: Record<number, string> = {
  1: '最悪', 2: '悪い', 3: '普通', 4: '良い', 5: '最高',
};

export default function DataManagementScreen() {
  const [records, setRecords] = useState<ConditionRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [recs, cats] = await Promise.all([getAllRecords(), getCategories()]);
    // 新しい日付順
    setRecords([...recs].sort((a, b) => b.date.localeCompare(a.date)));
    setCategories(cats);
    setLoading(false);
  }

  function toggleSelect(date: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === records.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(records.map(r => r.date)));
    }
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return;
    Alert.alert(
      `${selected.size}件を削除しますか？`,
      '削除したデータは元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する', style: 'destructive',
          onPress: async () => {
            for (const date of selected) {
              await deleteRecord(date);
            }
            setSelected(new Set());
            setSelectMode(false);
            await load();
          },
        },
      ]
    );
  }

  async function handleClearAll() {
    Alert.alert(
      '全データを削除しますか？',
      'すべての記録が削除されます。この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '全て削除する', style: 'destructive',
          onPress: async () => {
            for (const record of records) {
              await deleteRecord(record.date);
            }
            setRecords([]);
            setSelected(new Set());
            setSelectMode(false);
          },
        },
      ]
    );
  }

  async function handleExportCSV() {
    if (records.length === 0) {
      Alert.alert('データがありません');
      return;
    }

    // CSVヘッダー
    const lines: string[] = [
      '日付,種別,時間帯,カテゴリ/症状,値/スコア,メモ',
    ];

    for (const record of [...records].sort((a, b) => a.date.localeCompare(b.date))) {
      // 体調記録
      for (const cond of record.conditions) {
        const symptoms = cond.symptoms.join('・');
        const note = cond.note.replace(/,/g, '、').replace(/\n/g, ' ');
        lines.push([
          record.date,
          '体調',
          cond.timeSlot,
          symptoms || '-',
          `${cond.score}(${SCORE_LABELS[cond.score]})`,
          note,
        ].join(','));
      }
      // 行動・食事記録
      for (const entry of record.entries) {
        const cat = categories.find(c => c.id === entry.categoryId);
        const catName = cat?.name ?? entry.categoryId;
        const val = entry.value.replace(/,/g, '、').replace(/\n/g, ' ');
        lines.push([
          record.date,
          '行動',
          entry.timeSlot,
          catName,
          val,
          '',
        ].join(','));
      }
    }

    const csv = '\uFEFF' + lines.join('\n'); // BOM付き（Excel対応）
    const path = FileSystem.cacheDirectory + `health_data_${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'CSVをエクスポート' });
    } else {
      Alert.alert('共有機能が使用できません');
    }
  }

  const catName = (id: string) => categories.find(c => c.id === id)?.name ?? id;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* ツールバー */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolBtn, styles.toolBtnBlue]}
          onPress={handleExportCSV}
        >
          <Text style={styles.toolBtnTextWhite}>CSVエクスポート</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolBtn, selectMode ? styles.toolBtnGray : styles.toolBtnBorder]}
          onPress={() => { setSelectMode(v => !v); setSelected(new Set()); }}
        >
          <Text style={[styles.toolBtnText, selectMode && { color: '#374151' }]}>
            {selectMode ? '選択解除' : '複数選択'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolBtn, styles.toolBtnRed]}
          onPress={handleClearAll}
        >
          <Text style={styles.toolBtnTextWhite}>全削除</Text>
        </TouchableOpacity>
      </View>

      {/* 選択モード時の操作バー */}
      {selectMode && (
        <View style={styles.selectBar}>
          <TouchableOpacity onPress={toggleSelectAll}>
            <Text style={styles.selectAllText}>
              {selected.size === records.length ? '全解除' : '全選択'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.selectedCount}>{selected.size}件選択中</Text>
          <TouchableOpacity
            style={[styles.deleteSelectedBtn, selected.size === 0 && { opacity: 0.4 }]}
            onPress={handleDeleteSelected}
            disabled={selected.size === 0}
          >
            <Text style={styles.deleteSelectedText}>選択削除</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {records.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>記録がありません</Text>
          </View>
        ) : (
          records.map(record => (
            <TouchableOpacity
              key={record.date}
              style={[
                styles.dayCard,
                selectMode && selected.has(record.date) && styles.dayCardSelected,
              ]}
              onPress={() => selectMode && toggleSelect(record.date)}
              activeOpacity={selectMode ? 0.7 : 1}
            >
              {/* 選択チェック */}
              {selectMode && (
                <View style={[styles.checkbox, selected.has(record.date) && styles.checkboxChecked]}>
                  {selected.has(record.date) && <Text style={styles.checkmark}>✓</Text>}
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text style={styles.dateText}>{record.date}</Text>

                {/* 体調 */}
                {record.conditions.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>体調</Text>
                    {record.conditions.map((cond, i) => (
                      <Text key={i} style={styles.itemText}>
                        {cond.timeSlot}　スコア {cond.score}（{SCORE_LABELS[cond.score]}）
                        {cond.symptoms.length > 0 ? `　${cond.symptoms.join('・')}` : ''}
                        {cond.note ? `　${cond.note}` : ''}
                      </Text>
                    ))}
                  </View>
                )}

                {/* 行動・食事 */}
                {record.entries.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>行動・食事</Text>
                    {record.entries.map((entry, i) => (
                      <Text key={i} style={styles.itemText}>
                        {entry.timeSlot}　{catName(entry.categoryId)}：{entry.value}
                      </Text>
                    ))}
                  </View>
                )}

                {record.conditions.length === 0 && record.entries.length === 0 && (
                  <Text style={styles.emptyDayText}>記録なし</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toolbar: {
    flexDirection: 'row', gap: 8, padding: 12,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  toolBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
  },
  toolBtnBlue: { backgroundColor: '#2563eb' },
  toolBtnRed: { backgroundColor: '#ef4444' },
  toolBtnBorder: { borderWidth: 1.5, borderColor: '#d1d5db' },
  toolBtnGray: { backgroundColor: '#e5e7eb' },
  toolBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  toolBtnTextWhite: { fontSize: 12, fontWeight: '600', color: '#ffffff' },
  selectBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#eff6ff', borderBottomWidth: 1, borderBottomColor: '#bfdbfe',
  },
  selectAllText: { color: '#2563eb', fontSize: 13, fontWeight: '600' },
  selectedCount: { color: '#374151', fontSize: 13 },
  deleteSelectedBtn: {
    backgroundColor: '#ef4444', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
  },
  deleteSelectedText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  content: { padding: 12, gap: 10, paddingBottom: 40 },
  emptyCard: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 40,
    alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed',
  },
  emptyText: { color: '#9ca3af', fontSize: 14 },
  dayCard: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  dayCardSelected: { backgroundColor: '#eff6ff', borderWidth: 1.5, borderColor: '#2563eb' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  checkboxChecked: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  checkmark: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  dateText: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  section: { gap: 2, marginBottom: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280', marginBottom: 2 },
  itemText: { fontSize: 13, color: '#374151', lineHeight: 19 },
  emptyDayText: { fontSize: 13, color: '#9ca3af' },
});
