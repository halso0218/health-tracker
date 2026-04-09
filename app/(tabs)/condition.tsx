import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getOrCreateRecord, saveRecord } from '../../src/storage/records';
import { ConditionEntry, ConditionRecord, TIME_SLOTS, TimeSlot } from '../../src/types';
import DateNavigator from '../../src/components/DateNavigator';

const TODAY = new Date().toISOString().split('T')[0];

const SCORE_OPTIONS = [
  { value: 1 as const, label: '😞', desc: '最悪' },
  { value: 2 as const, label: '😕', desc: '悪い' },
  { value: 3 as const, label: '😐', desc: '普通' },
  { value: 4 as const, label: '🙂', desc: '良い' },
  { value: 5 as const, label: '😄', desc: '最高' },
];

const SYMPTOM_OPTIONS = ['頭痛', '倦怠感', '腹痛', '不眠', 'むくみ', '肩こり', '食欲不振', '気分の落ち込み'];

const EMPTY_ENTRY: Omit<ConditionEntry, 'timeSlot'> = {
  score: 3,
  symptoms: [],
  note: '',
};

export default function ConditionScreen() {
  const [date, setDate] = useState(TODAY);
  const [record, setRecord] = useState<ConditionRecord>({ date, conditions: [], entries: [] });
  const [modalVisible, setModalVisible] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // モーダルの入力値
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('朝');
  const [score, setScore] = useState<1|2|3|4|5>(3);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [note, setNote] = useState('');

  useFocusEffect(useCallback(() => { loadRecord(date); }, [date]));

  async function loadRecord(d: string) {
    const r = await getOrCreateRecord(d);
    setRecord(r);
  }

  function openAdd() {
    setEditIndex(null);
    setTimeSlot('朝');
    setScore(3);
    setSymptoms([]);
    setNote('');
    setModalVisible(true);
  }

  function openEdit(index: number) {
    const entry = record.conditions[index];
    setEditIndex(index);
    setTimeSlot(entry.timeSlot);
    setScore(entry.score);
    setSymptoms([...entry.symptoms]);
    setNote(entry.note);
    setModalVisible(true);
  }

  async function handleSave() {
    const entry: ConditionEntry = { timeSlot, score, symptoms, note };
    const conditions = [...record.conditions];
    if (editIndex !== null) {
      conditions[editIndex] = entry;
    } else {
      conditions.push(entry);
    }
    // 時間帯順にソート
    conditions.sort((a, b) => TIME_SLOTS.indexOf(a.timeSlot) - TIME_SLOTS.indexOf(b.timeSlot));
    const updated = { ...record, date, conditions };
    await saveRecord(updated);
    setRecord(updated);
    setModalVisible(false);
  }

  async function handleDelete(index: number) {
    Alert.alert('削除', 'この記録を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive', onPress: async () => {
          const conditions = record.conditions.filter((_, i) => i !== index);
          const updated = { ...record, conditions };
          await saveRecord(updated);
          setRecord(updated);
        },
      },
    ]);
  }

  function toggleSymptom(s: string) {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={styles.content}>
        <DateNavigator date={date} onChange={d => { setDate(d); loadRecord(d); }} />

        {record.conditions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>この日の体調記録はありません</Text>
          </View>
        ) : (
          record.conditions.map((entry, i) => (
            <TouchableOpacity key={i} style={styles.entryCard} onPress={() => openEdit(i)}>
              <View style={styles.entryHeader}>
                <View style={styles.timeBadge}>
                  <Text style={styles.timeBadgeText}>{entry.timeSlot}</Text>
                </View>
                <Text style={styles.scoreEmoji}>
                  {SCORE_OPTIONS.find(s => s.value === entry.score)?.label}
                </Text>
                <Text style={styles.scoreDesc}>
                  {SCORE_OPTIONS.find(s => s.value === entry.score)?.desc}
                </Text>
                <TouchableOpacity onPress={() => handleDelete(i)} style={styles.deleteBtn}>
                  <Text style={styles.deleteText}>削除</Text>
                </TouchableOpacity>
              </View>
              {entry.symptoms.length > 0 && (
                <Text style={styles.symptoms}>{entry.symptoms.join('・')}</Text>
              )}
              {!!entry.note && <Text style={styles.noteText}>{entry.note}</Text>}
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>＋ 体調を追加</Text>
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
                {editIndex !== null ? '体調を編集' : '体調を追加'}
              </Text>

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

              {/* スコア */}
              <Text style={styles.label}>体調スコア</Text>
              <View style={styles.scoreRow}>
                {SCORE_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.scoreBtn, score === opt.value && styles.scoreBtnActive]}
                    onPress={() => setScore(opt.value)}
                  >
                    <Text style={styles.scoreEmoji}>{opt.label}</Text>
                    <Text style={[styles.scoreDesc, score === opt.value && { color: '#2563eb', fontWeight: '600' }]}>
                      {opt.desc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 症状 */}
              <Text style={styles.label}>症状</Text>
              <View style={styles.chipRow}>
                {SYMPTOM_OPTIONS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, symptoms.includes(s) && styles.chipActive]}
                    onPress={() => toggleSymptom(s)}
                  >
                    <Text style={[styles.chipText, symptoms.includes(s) && styles.chipTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* メモ */}
              <Text style={styles.label}>メモ（任意）</Text>
              <TextInput
                style={styles.textArea}
                value={note}
                onChangeText={setNote}
                placeholder="気になること..."
                multiline
                numberOfLines={2}
              />

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
  emptyCard: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed',
  },
  emptyText: { color: '#9ca3af', fontSize: 14 },
  entryCard: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeBadge: { backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  timeBadgeText: { color: '#2563eb', fontSize: 13, fontWeight: '600' },
  scoreEmoji: { fontSize: 22 },
  scoreDesc: { fontSize: 13, color: '#6b7280', flex: 1 },
  deleteBtn: { paddingHorizontal: 8 },
  deleteText: { color: '#ef4444', fontSize: 12 },
  symptoms: { fontSize: 13, color: '#374151', marginTop: 6 },
  noteText: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  addBtn: {
    backgroundColor: '#2563eb', borderRadius: 12, padding: 14, alignItems: 'center',
  },
  addBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
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
  scoreRow: { flexDirection: 'row', gap: 6 },
  scoreBtn: {
    flex: 1, alignItems: 'center', padding: 8, borderRadius: 10,
    backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  scoreBtnActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  chipActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  chipText: { fontSize: 13, color: '#6b7280' },
  chipTextActive: { color: '#2563eb', fontWeight: '600' },
  textArea: {
    backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1,
    borderColor: '#e5e7eb', padding: 10, fontSize: 14, color: '#111827',
    minHeight: 60, textAlignVertical: 'top',
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  cancelText: { color: '#6b7280', fontWeight: '600' },
  saveBtn: { flex: 2, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#2563eb' },
  saveBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
