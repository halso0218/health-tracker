import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';

type Props = {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

const CHIP_THRESHOLD = 6; // これ以下はチップ、超えたらドロップダウン

export default function OptionPicker({ options, value, onChange, placeholder = '選択してください' }: Props) {
  const [modalVisible, setModalVisible] = useState(false);

  if (options.length <= CHIP_THRESHOLD) {
    // チップ表示
    return (
      <View style={styles.chipRow}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, value === opt && styles.chipActive]}
            onPress={() => onChange(opt)}
          >
            <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // ドロップダウン（モーダル）表示
  return (
    <>
      <TouchableOpacity
        style={styles.dropdownBtn}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.dropdownText, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{placeholder}</Text>
            <FlatList
              data={options}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, value === item && styles.modalItemActive]}
                  onPress={() => { onChange(item); setModalVisible(false); }}
                >
                  <Text style={[styles.modalItemText, value === item && styles.modalItemTextActive]}>
                    {item}
                  </Text>
                  {value === item && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  chipActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  chipText: { fontSize: 14, color: '#6b7280' },
  chipTextActive: { color: '#2563eb', fontWeight: '600' },
  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownText: { fontSize: 14, color: '#111827' },
  placeholder: { color: '#9ca3af' },
  arrow: { fontSize: 12, color: '#6b7280' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    maxHeight: 400,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  modalItemActive: { backgroundColor: '#eff6ff' },
  modalItemText: { fontSize: 15, color: '#111827' },
  modalItemTextActive: { color: '#2563eb', fontWeight: '600' },
  check: { color: '#2563eb', fontSize: 16 },
});
