import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Complete baked pill artwork (frame + leather + all four tabs, from
// "assets/images/buttons pill.png", cropped to content). No code-drawn
// borders, shadows, icons, or labels — the image is the whole nav.
const PILL = require('../../assets/images/ui/pill-nav.png');

// Tap zones follow the BAKED tab order in the artwork, left to right:
// Home, Gifts, Friends(People), You.
const ZONES = [
  { left: '0%', route: '/' },
  { left: '25%', route: '/gifts' },
  { left: '50%', route: '/people' },
  { left: '75%', route: '/profile' },
] as const;

export function BottomNavBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.pillBox, { marginBottom: insets.bottom + 12 }]}>
      <Image source={PILL} style={styles.pillImage} resizeMode="stretch" />
      {ZONES.map(zone => (
        <TouchableOpacity
          key={zone.route}
          onPress={() => router.push(zone.route)}
          style={[styles.zone, { left: zone.left }]}
          activeOpacity={0.7}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pillBox: {
    width: '94%',
    alignSelf: 'center',
    height: 104,
    position: 'relative',
  },
  pillImage: { width: '100%', height: '100%' },
  zone: {
    position: 'absolute',
    top: 0,
    width: '25%',
    height: '100%',
  },
});
