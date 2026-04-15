import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, TextInput, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSymptoms, saveSymptoms, addSymptom } from '../src/storage/symptoms';

export default function SymptomEditScreen() {
  const insets = useSafeAreaInsets();
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setSymptoms(await getSymptoms());
  }

  function move(index: number, dir: 'up' | 'down') {
    const next = [...symptoms];
    const swap = dir === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setSymptoms(next);
    saveSymptoms(next);
  }

  function handleDelete(index: number) {
    const name = symptoms[index];
    Alert.alert(
      `「${name}」を削除しますか？`,
      '過去の記録に含まれる症状名はそのまま残ります。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する', style: 'destructive',
          onPress: () => {
            const next = symptoms.filter((_, i) => i !== index);
            setSymptoms(next);
            saveSymptoms(next);
          },
        },
      ]
    );
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name) { Alert.alert('症状名を入力してください'); return; }
    if (symptoms.includes(name)) { Alert.alert('同じ名前の症状が既にあります'); return; }
    await addSymptom(name);
    setNewName('');
    setModalVisible(false);
    await load();
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={styles.content}>
        {symptoms.map((name, index) => (
          <View key={index} style={styles.row}>
            {/* 並び替えボタン */}
            <View style={styles.arrows}>
              <TouchableOpacity
                onPress={() => move(index, 'up')}
                disabled={index === 0}
                style={[styles.arrowBtn, index === 0 && styles.arrowDisabled]}
              >
                <Text style={styles.arrowText}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => move(index, 'down')}
                disabled={index === symptoms.length - 1}
                style={[styles.arrowBtn, index === symptoms.length - 1 && styles.arrowDisabled]}
              >
                <Text style={styles.arrowText}>↓</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.name}>{name}</Text>

            <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(index)}>
              <Text style={styles.delText}>削除</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>＋ 症状を追加</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 追加モーダル */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: 20 + insets.bottom }]}>
            <Text style={styles.modalTitle}>症状を追加</Text>
            <Text style={styles.label}>症状名</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="例: 鼻水、めまい..."
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); setNewName(''); }}>
                <Text style={styles.cancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
                <Text style={styles.saveBtnText}>追加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#ffffff', borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  arrows: { flexDirection: 'row', gap: 4 },
  arrowBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  arrowDisabled: { opacity: 0.3 },
  arrowText: { fontSize: 14, color: '#374151' },
  name: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  delBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fef2f2' },
  delText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  addBtn: {
    borderWidth: 1.5, borderColor: '#2563eb', borderRadius: 12, borderStyle: 'dashed',
    padding: 16, alignItems: 'center',
  },
  addBtnText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, gap: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  input: {
    backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1,
    borderColor: '#e5e7eb', padding: 12, fontSize: 14, color: '#111827',
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#f3f4f6' },
  cancelText: { color: '#6b7280', fontWeight: '600' },
  saveBtn: { flex: 2, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#2563eb' },
  saveBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
