import { View, TouchableOpacity, Text, StyleSheet, Image, ImageBackground } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// assets/images/nav/pill.png — generated from the master artwork
// "assets/images/buttons pill.png" (user's corrected export, 2026-08-13),
// cropped to the artwork bounds at 1500x322. The asset carries its own
// shadow and framing; this component adds NO shadow/elevation styles.
const PILL = require('../../assets/images/nav/pill.png');
const PILL_ASPECT = 1500 / 322;

const TABS = [
  { label: 'Home',   icon: require('../../assets/images/nav/home.png'),    route: '/'        },
  { label: 'People', icon: require('../../assets/images/nav/people.png'),  route: '/people'  },
  { label: 'Gifts',  icon: require('../../assets/images/nav/gifts.png'),   route: '/gifts'   },
  { label: 'You',    icon: require('../../assets/images/nav/profile.png'), route: '/profile' },
] as const;

export function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + 10 }]}>
      {/* Box matches the artwork's aspect ratio exactly, so stretch fills
          it with no distortion of the gold frame. */}
      <ImageBackground
        source={PILL}
        style={styles.pill}
        imageStyle={styles.pillImage}
        resizeMode="stretch"
      >
        {TABS.map(tab => {
          const active =
            tab.route === '/'
              ? pathname === '/' || pathname === ''
              : pathname === tab.route || pathname.startsWith(tab.route + '/');
          return (
            <TouchableOpacity
              key={tab.route}
              style={styles.tab}
              onPress={() => router.push(tab.route)}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrap}>
                {active && <View style={styles.activeRing} />}
                <Image
                  source={tab.icon}
                  style={[styles.icon, active && styles.iconActive]}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  pill: {
    width: '92%',
    maxWidth: 560,
    aspectRatio: PILL_ASPECT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    // Keeps all four tabs inside the leather area of the frame; the
    // rounded gold ends eat roughly this much on each side.
    paddingHorizontal: 30,
  },
  pillImage: { width: '100%', height: '100%' },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  iconWrap: {
    width: 44, height: 38,
    alignItems: 'center', justifyContent: 'center',
  },
  activeRing: {
    position: 'absolute',
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(212, 175, 55, 0.20)',
  },
  icon: { width: 34, height: 28 },
  iconActive: { transform: [{ scale: 1.2 }] },
  label:       { fontSize: 9, color: 'rgba(212, 175, 55, 0.55)', letterSpacing: 1 },
  labelActive: { color: '#D4AF37' },
});
