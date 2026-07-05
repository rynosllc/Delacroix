import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Brand } from '@/constants/brand';

interface Props {
  step: number;
  totalSteps?: number;
  title: string;
  onBack: () => void;
}

export function SendFlowHeader({ step, totalSteps = 6, title, onBack }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.dots}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i + 1 === step  && styles.dotActive,
                i + 1 <  step  && styles.dotDone,
              ]}
            />
          ))}
        </View>
        <View style={{ width: 60 }} />
      </View>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingBottom: 12, gap: 14 },
  topRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:   { width: 60 },
  backText:  { color: Brand.gold, fontSize: 17 },
  dots:      { flexDirection: 'row', gap: 7, alignItems: 'center' },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
  },
  dotActive: { width: 22, backgroundColor: '#D4AF37' },
  dotDone:   { backgroundColor: 'rgba(212, 175, 55, 0.5)' },
  title: {
    color: Brand.cream, fontSize: 24, fontFamily: 'ui-serif',
    letterSpacing: 0.5, textAlign: 'center',
  },
});
