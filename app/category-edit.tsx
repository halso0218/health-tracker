import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal,
} from 'react-native';
import { router } from 'expo-router';
import {
  getCategories, saveCategories, addCategory, deleteCategory, generateId,
} from '../src/storage/categories';
import { Category, CategoryInputType } from '../src/types';

export default function CategoryEditScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);

  // フォーム
  const [name, setName] = useState('');
  const [inputType, setInputType] = useState<CategoryInputType>('free_text');
  const [optionsText, setOptionsText] = useState(''); // 改行区切りで入力

  useEffect(() => { load(); }, []);

  async function load() {
    const cats = await getCategories();
    setCategories(cats);
  }

  function openAdd() {
    setEditTarget(null);
    setName('');
    setInputType('free_text');
    setOptionsText('');
    setModalVisible(true);
  }

  function openEdit(cat: Category) {
    setEditTarget(cat);
    setName(cat.name);
    setInputType(cat.inputType);
    setOptionsText(cat.options?.join('\n') ?? '');
    setModalVisible(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('カテゴリ名を入力してください');
      return;
    }
    const options = inputType === 'select'
      ? optionsText.split('\n').map(s => s.trim()).filter(s => s.length > 0)
      : undefined;

    if (inputType === 'select' && (!options || options.length < 2)) {
      Alert.alert('選択肢を2つ以上入力してください');
      return;
    }

    if (editTarget) {
      const updated = categories.map(c =>
        c.id === editTarget.id ? { ...c, name: name.trim(), inputType, options } : c
      );
      await saveCategories(updated);
      setCategories(updated);
    } else {
      const newCat: Category = {
        id: generateId(),
        name: name.trim(),
        inputType,
        options,
      };
      await addCategory(newCat);
      setCategories(prev => [...prev, newCat]);
    }
    setModalVisible(false);
  }

  async function handleDelete(cat: Category) {
    if (cat.isDefault) {
      Alert.alert('削除できません', 'デフォルトカテゴリは削除できません。');
      return;
    }
    Alert.alert('削除', `「${cat.name}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive', onPress: async () => {
          await deleteCategory(cat.id);
          setCategories(prev => prev.filter(c => c.id !== cat.id));
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={styles.content}>
        {categories.map(cat => (
          <View key={cat.id} style={styles.catCard}>
            <View style={styles.catInfo}>
              <Text style={styles.catName}>{cat.name}</Text>
              <Text style={styles.catType}>
                {cat.inputType === 'free_text' ? '自由記述' : `選択式（${cat.options?.length}件）`}
                {cat.isDefault ? '　デフォルト' : ''}
              </Text>
            </View>
            <View style={styles.catBtns}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(cat)}>
                <Text style={styles.editBtnText}>編集</Text>
              </TouchableOpacity>
              {!cat.isDefault && (
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(cat)}>
                  <Text style={styles.delBtnText}>削除</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>＋ カテゴリを追加</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 編集モーダル */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editTarget ? 'カテゴリを編集' : 'カテゴリを追加'}
            </Text>

            <Text style={styles.label}>カテゴリ名</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="例: 体重、水分、サプリ..."
            />

            <Text style={styles.label}>入力タイプ</Text>
            <View style={styles.typeRow}>
              {(['free_text', 'select'] as CategoryInputType[]).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeBtn, inputType === type && styles.typeBtnActive]}
                  onPress={() => setInputType(type)}
                >
                  <Text style={[styles.typeText, inputType === type && styles.typeTextActive]}>
                    {type === 'free_text' ? '自由記述' : '選択式'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {inputType === 'select' && (
              <>
                <Text style={styles.label}>選択肢（1行に1つ入力）</Text>
                <TextInput
                  style={[styles.textInput, { minHeight: 120 }]}
                  value={optionsText}
                  onChangeText={setOptionsText}
                  placeholder={'なし\n少量\n中量\n多量'}
                  multiline
                  textAlignVertical="top"
                />
              </>
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
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  catCard: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  catInfo: { flex: 1, gap: 2 },
  catName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  catType: { fontSize: 12, color: '#9ca3af' },
  catBtns: { flexDirection: 'row', gap: 8 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#eff6ff' },
  editBtnText: { color: '#2563eb', fontSize: 13, fontWeight: '600' },
  delBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fef2f2' },
  delBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  addBtn: { backgroundColor: '#2563eb', borderRadius: 12, padding: 14, alignItems: 'center' },
  addBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, gap: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  textInput: {
    backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1,
    borderColor: '#e5e7eb', padding: 12, fontSize: 14, color: '#111827',
  },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1, padding: 12, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: 'transparent',
  },
  typeBtnActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  typeText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  typeTextActive: { color: '#2563eb' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#f3f4f6' },
  cancelText: { color: '#6b7280', fontWeight: '600' },
  saveBtn: { flex: 2, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#2563eb' },
  saveBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
