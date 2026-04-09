import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal,
} from 'react-native';
import {
  getCategories, saveCategories, addCategory, deleteCategory, generateId,
} from '../src/storage/categories';
import { getAllRecords } from '../src/storage/records';
import { Category, CategoryInputType } from '../src/types';

export default function CategoryEditScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  // カテゴリIDごとの記録件数
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);

  // フォーム
  const [name, setName] = useState('');
  const [inputType, setInputType] = useState<CategoryInputType>('free_text');
  const [optionsText, setOptionsText] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const [cats, records] = await Promise.all([getCategories(), getAllRecords()]);
    setCategories(cats);

    // カテゴリごとの記録件数を集計
    const counts: Record<string, number> = {};
    for (const record of records) {
      for (const entry of record.entries) {
        counts[entry.categoryId] = (counts[entry.categoryId] ?? 0) + 1;
      }
    }
    setEntryCounts(counts);
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
    const count = entryCounts[cat.id] ?? 0;
    const isDefault = cat.isDefault ?? false;

    // 警告メッセージを組み立てる
    const lines: string[] = [];

    if (isDefault) {
      lines.push('⚠️ これはデフォルトカテゴリです。');
      lines.push('');
    }

    if (count > 0) {
      lines.push(`📊 過去の記録: ${count}件`);
      lines.push('');
      lines.push('【記録データへの影響】');
      lines.push('・記録データ自体は削除されません');
      lines.push('・ただし「不明なカテゴリ」として表示されます');
      lines.push('');
      lines.push('【分析への影響】');
      lines.push('・既存の記録は引き続き分析に使われます');
      lines.push('・カテゴリ名ではなくIDで表示されます');
    } else {
      lines.push('このカテゴリの記録はまだありません。');
      lines.push('分析への影響はありません。');
    }

    lines.push('');
    lines.push('削除後は元に戻せません。');

    Alert.alert(
      `「${cat.name}」を削除しますか？`,
      lines.join('\n'),
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: async () => {
            await deleteCategory(cat.id);
            setCategories(prev => prev.filter(c => c.id !== cat.id));
            const newCounts = { ...entryCounts };
            delete newCounts[cat.id];
            setEntryCounts(newCounts);
          },
        },
      ]
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* 注意書き */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            カテゴリを削除すると、そのカテゴリ名は表示されなくなりますが、過去の記録データは残ります。分析への影響は削除前に確認できます。
          </Text>
        </View>

        {categories.map(cat => {
          const count = entryCounts[cat.id] ?? 0;
          return (
            <View key={cat.id} style={styles.catCard}>
              <View style={styles.catInfo}>
                <View style={styles.catNameRow}>
                  <Text style={styles.catName}>{cat.name}</Text>
                  {cat.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>デフォルト</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.catType}>
                  {cat.inputType === 'free_text' ? '自由記述' : `選択式（${cat.options?.length}件）`}
                  {count > 0 ? `　記録 ${count}件` : '　未記録'}
                </Text>
              </View>
              <View style={styles.catBtns}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(cat)}>
                  <Text style={styles.editBtnText}>編集</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(cat)}>
                  <Text style={styles.delBtnText}>削除</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>＋ カテゴリを追加</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 追加・編集モーダル */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editTarget ? 'カテゴリを編集' : 'カテゴリを追加'}
            </Text>

            {!editTarget && (
              <View style={styles.addInfoCard}>
                <Text style={styles.addInfoText}>
                  💡 新しいカテゴリは追加後から記録できます。過去の日付に遡って記録することも可能です。
                </Text>
              </View>
            )}

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
  infoCard: {
    backgroundColor: '#f0f9ff', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#bae6fd',
  },
  infoText: { fontSize: 13, color: '#0369a1', lineHeight: 18 },
  catCard: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  catInfo: { flex: 1, gap: 4 },
  catNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  defaultBadge: {
    backgroundColor: '#f3f4f6', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  defaultBadgeText: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
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
  addInfoCard: {
    backgroundColor: '#fffbeb', borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: '#fde68a',
  },
  addInfoText: { fontSize: 12, color: '#92400e', lineHeight: 18 },
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
