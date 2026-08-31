import {
  View, TouchableOpacity, Text, StyleSheet, Image, ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// assets/images/nav/pill.png — from the master "assets/images/buttons pill.png".
// The asset carries its own shadow and framing; no shadow/elevation styles here.
//
// Structure: the ImageBackground container owns the frame-safe padding; the
// tab row is a separate inner View at width:'100%', so it is CONSTRAINED to
// the container's content box and can never outgrow the artwork.
const PILL = require('../../assets/images/nav/pill.png');

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
  const { width: winW } = useWindowDimensions();

  const pillW = Math.min(Math.round(winW * 0.95), 600);
  const pillH = 104;
  // The rounded gold end caps occupy roughly this much of each end
  const sidePad = Math.round(pillW * 0.09);

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + 12 }]}>
      <ImageBackground
        source={PILL}
        style={[styles.pill, { width: pillW, height: pillH, paddingHorizontal: sidePad }]}
        imageStyle={styles.pillImage}
        resizeMode="stretch"
        onLayout={e => {
          if (__DEV__) {
            console.log(`[nav-debug] pill container width: ${Math.round(e.nativeEvent.layout.width)}`);
          }
        }}
      >
        <View
          style={styles.tabRow}
          onLayout={e => {
            if (__DEV__) {
              console.log(`[nav-debug] tab row width: ${Math.round(e.nativeEvent.layout.width)}`);
            }
          }}
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
                <Text
                  style={[styles.label, active && styles.labelActive]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.15}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillImage: { width: '100%', height: '100%' },
  // Constrained to the container's content box (inside the end-cap padding)
  tabRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  tab: { alignItems: 'center', gap: 3, flexShrink: 1 },
  iconWrap: {
    width: 52, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  activeRing: {
    position: 'absolute',
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(212, 175, 55, 0.20)',
  },
  icon: { width: 39, height: 32 },
  iconActive: { transform: [{ scale: 1.2 }] },
  label:       { fontSize: 10, color: 'rgba(212, 175, 55, 0.55)', letterSpacing: 1 },
  labelActive: { color: '#D4AF37' },
});
