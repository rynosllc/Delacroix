import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';

// expo-linear-gradient is a native module. It is installed in package.json
// but is NOT in the currently-installed dev build — rendering it there would
// crash. This runtime check detects whether the native module made it into
// the binary; after the next EAS build the real gradient kicks in on its own.
const gradientAvailable = !!(globalThis as any).expo?.modules?.ExpoLinearGradient;

let LinearGradient: any = null;
if (gradientAvailable) {
  LinearGradient = require('expo-linear-gradient').LinearGradient;
}

const GOLD_STOPS = ['#8C6B1F', '#D4AF37', '#F2D57A', '#D4AF37', '#8C6B1F'];

interface Props {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/** Diagonal luxury-gold gradient; falls back to solid gold + sheen
 *  on builds that don't yet include expo-linear-gradient. */
export function GoldGradient({ style, children }: Props) {
  if (LinearGradient) {
    return (
      <LinearGradient
        colors={GOLD_STOPS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={style}
      >
        {children}
      </LinearGradient>
    );
  }
  return (
    <View style={[styles.fallback, style]}>
      <View style={styles.sheen} pointerEvents="none" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: '#D4AF37', overflow: 'hidden' },
  sheen: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '45%',
    backgroundColor: 'rgba(255, 245, 200, 0.28)',
  },
});
