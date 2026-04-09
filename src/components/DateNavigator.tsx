import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  date: string; // "YYYY-MM-DD"
  onChange: (date: string) => void;
};

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatLabel(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = addDays(today, -1);
  if (dateStr === today) return `今日（${dateStr}）`;
  if (dateStr === yesterday) return `昨日（${dateStr}）`;
  return dateStr;
}

export default function DateNavigator({ date, onChange }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const isToday = date === today;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.arrow} onPress={() => onChange(addDays(date, -1))}>
        <Text style={styles.arrowText}>‹</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onChange(today)}>
        <Text style={styles.dateText}>{formatLabel(date)}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.arrow, isToday && styles.arrowDisabled]}
        onPress={() => !isToday && onChange(addDays(date, 1))}
      >
        <Text style={[styles.arrowText, isToday && styles.arrowTextDisabled]}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  arrow: { padding: 8 },
  arrowDisabled: { opacity: 0.3 },
  arrowText: { fontSize: 24, color: '#2563eb', fontWeight: '300' },
  arrowTextDisabled: { color: '#9ca3af' },
  dateText: { fontSize: 15, fontWeight: '600', color: '#111827' },
});
