import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Lux, SERIF, T } from '@/components/lux';

interface Props {
  step: number;
  totalSteps?: number;
  title: string;
  subtitle?: string;
  onBack: () => void;
}

export function SendFlowHeader({ step, totalSteps = 6, title, subtitle, onBack }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={20} color={Lux.gold} />
        </TouchableOpacity>
        <View style={styles.dots}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i + 1 === step && styles.dotActive,
                i + 1 <  step && styles.dotDone,
              ]}
            />
          ))}
        </View>
        <View style={{ width: 40 }} />
      </View>
      <T style={styles.title}>{title}</T>
      <View style={styles.ruleRow}>
        <View style={styles.rule} />
        <Ionicons name="heart" size={9} color={Lux.gold} />
        <View style={styles.rule} />
      </View>
      {subtitle ? <T style={styles.subtitle}>{subtitle}</T> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14, gap: 10 },
  topRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(217,180,90,0.3)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center', justifyContent: 'center',
  },
  dots: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  dot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: 'rgba(217,180,90,0.22)',
  },
  dotActive: { width: 22, backgroundColor: Lux.gold },
  dotDone:   { backgroundColor: 'rgba(217,180,90,0.6)' },
  title: {
    color: Lux.cream, fontSize: 27, fontFamily: SERIF,
    letterSpacing: 0.5, textAlign: 'center', marginTop: 6,
  },
  ruleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  rule:    { width: 46, height: 1, backgroundColor: Lux.line },
  subtitle: {
    color: Lux.muted, fontSize: 14, fontStyle: 'italic',
    fontFamily: SERIF, textAlign: 'center',
  },
});
