import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { getOrCreateRecord, saveRecord } from '../../src/storage/records';
import { getCategories } from '../../src/storage/categories';
import { Category, ConditionRecord, DataEntry, TIME_SLOTS, TimeSlot } from '../../src/types';
import DateNavigator from '../../src/components/DateNavigator';
import OptionPicker from '../../src/components/OptionPicker';

const TODAY = new Date().toISOString().split('T')[0];

export default function RecordScreen() {
  const [date, setDate] = useState(TODAY);
  const [record, setRecord] = useState<ConditionRecord>({ date, conditions: [], entries: [] });
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // モーダルの入力値
  const [categoryId, setCategoryId] = useState('');
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('朝');
  const [value, setValue] = useState('');

  useFocusEffect(useCallback(() => {
    loadAll(date);
  }, [date]));

  async function loadAll(d: string) {
    const [r, cats] = await Promise.all([getOrCreateRecord(d), getCategories()]);
    setRecord(r);
    setCategories(cats);
  }

  function openAdd(defaultCategoryId?: string) {
    setEditIndex(null);
    setCategoryId(defaultCategoryId ?? categories[0]?.id ?? '');
    setTimeSlot('朝');
    setValue('');
    setModalVisible(true);
  }

  function openEdit(index: number) {
    const entry = record.entries[index];
    setEditIndex(index);
    setCategoryId(entry.categoryId);
    setTimeSlot(entry.timeSlot);
    setValue(entry.value);
    setModalVisible(true);
  }

  async function handleSave() {
    if (!categoryId) return;
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;
    if (cat.inputType === 'select' && !value) {
      Alert.alert('選択してください', '選択肢から選んでください。');
      return;
    }
    if (cat.inputType === 'free_text' && !value.trim()) {
      Alert.alert('入力してください', '内容を入力してください。');
      return;
    }

    const entry: DataEntry = { categoryId, timeSlot, value };
    const entries = [...record.entries];
    if (editIndex !== null) {
      entries[editIndex] = entry;
    } else {
      entries.push(entry);
    }
    // 時間帯順 → カテゴリ順でソート
    entries.sort((a, b) => {
      const timeSort = TIME_SLOTS.indexOf(a.timeSlot) - TIME_SLOTS.indexOf(b.timeSlot);
      if (timeSort !== 0) return timeSort;
      return a.categoryId.localeCompare(b.categoryId);
    });
    const updated = { ...record, date, entries };
    await saveRecord(updated);
    setRecord(updated);
    setModalVisible(false);
  }

  async function handleDelete(index: number) {
    Alert.alert('削除', 'この記録を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive', onPress: async () => {
          const entries = record.entries.filter((_, i) => i !== index);
          const updated = { ...record, entries };
          await saveRecord(updated);
          setRecord(updated);
        },
      },
    ]);
  }

  const selectedCategory = categories.find(c => c.id === categoryId);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={styles.content}>
        <DateNavigator date={date} onChange={d => { setDate(d); loadAll(d); }} />

        {/* カテゴリ別クイック追加ボタン */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.quickRow}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={styles.quickBtn}
                onPress={() => openAdd(cat.id)}
              >
                <Text style={styles.quickBtnText}>＋ {cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* 記録一覧 */}
        {record.entries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>この日の記録はありません</Text>
          </View>
        ) : (
          record.entries.map((entry, i) => {
            const cat = categories.find(c => c.id === entry.categoryId);
            return (
              <TouchableOpacity key={i} style={styles.entryCard} onPress={() => openEdit(i)}>
                <View style={styles.entryHeader}>
                  <View style={styles.timeBadge}>
                    <Text style={styles.timeBadgeText}>{entry.timeSlot}</Text>
                  </View>
                  <Text style={styles.catName}>{cat?.name ?? entry.categoryId}</Text>
                  <TouchableOpacity onPress={() => handleDelete(i)} style={styles.deleteBtn}>
                    <Text style={styles.deleteText}>削除</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.entryValue}>{entry.value}</Text>
              </TouchableOpacity>
            );
          })
        )}

        {/* カテゴリ管理ボタン */}
        <TouchableOpacity style={styles.manageBtn} onPress={() => router.push('/category-edit')}>
          <Text style={styles.manageBtnText}>カテゴリを管理 ›</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 入力モーダル */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {editIndex !== null ? '記録を編集' : '記録を追加'}
              </Text>

              {/* カテゴリ選択 */}
              <Text style={styles.label}>カテゴリ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.slotRow}>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.slotBtn, categoryId === cat.id && styles.slotBtnActive]}
                      onPress={() => { setCategoryId(cat.id); setValue(''); }}
                    >
                      <Text style={[styles.slotText, categoryId === cat.id && styles.slotTextActive]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* 時間帯 */}
              <Text style={styles.label}>時間帯</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.slotRow}>
                  {TIME_SLOTS.map(slot => (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.slotBtn, timeSlot === slot && styles.slotBtnActive]}
                      onPress={() => setTimeSlot(slot)}
                    >
                      <Text style={[styles.slotText, timeSlot === slot && styles.slotTextActive]}>
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* 入力（カテゴリタイプに応じて切り替え） */}
              <Text style={styles.label}>内容</Text>
              {selectedCategory?.inputType === 'select' && selectedCategory.options ? (
                <OptionPicker
                  options={selectedCategory.options}
                  value={value}
                  onChange={setValue}
                  placeholder={`${selectedCategory.name}を選択`}
                />
              ) : (
                <TextInput
                  style={styles.textInput}
                  value={value}
                  onChangeText={setValue}
                  placeholder="例: ラーメン、コーヒー..."
                  multiline
                />
              )}

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelText}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>保存</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  quickRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  quickBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#2563eb',
  },
  quickBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  emptyCard: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed',
  },
  emptyText: { color: '#9ca3af', fontSize: 14 },
  entryCard: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1, gap: 6,
  },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeBadge: { backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  timeBadgeText: { color: '#2563eb', fontSize: 13, fontWeight: '600' },
  catName: { fontSize: 13, fontWeight: '600', color: '#374151', flex: 1 },
  entryValue: { fontSize: 15, color: '#111827' },
  deleteBtn: { paddingHorizontal: 8 },
  deleteText: { color: '#ef4444', fontSize: 12 },
  manageBtn: { alignSelf: 'center', paddingVertical: 8 },
  manageBtnText: { color: '#6b7280', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, gap: 12, maxHeight: '90%',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  slotRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  slotBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: 'transparent',
  },
  slotBtnActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  slotText: { fontSize: 14, color: '#6b7280' },
  slotTextActive: { color: '#2563eb', fontWeight: '600' },
  textInput: {
    backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1,
    borderColor: '#e5e7eb', padding: 12, fontSize: 14, color: '#111827',
    minHeight: 60, textAlignVertical: 'top',
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#f3f4f6',
  },
  cancelText: { color: '#6b7280', fontWeight: '600' },
  saveBtn: { flex: 2, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#2563eb' },
  saveBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
