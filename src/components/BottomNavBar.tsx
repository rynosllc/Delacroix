import { View, TouchableOpacity, Text, StyleSheet, Image, ImageBackground } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.shadowWrap}>
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
                  {active && <View style={styles.glow} />}
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  shadowWrap: {
    width: '92%',
    maxWidth: 560,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  pill: {
    height: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 16,
  },
  pillImage: { width: '100%', height: '100%' },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  iconWrap: {
    width: 48, height: 42,
    alignItems: 'center', justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(212, 175, 55, 0.20)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 12,
  },
  icon: { width: 36, height: 30 },
  iconActive: { transform: [{ scale: 1.2 }] },
  label:       { fontSize: 9, color: 'rgba(212, 175, 55, 0.55)', letterSpacing: 1 },
  labelActive: { color: '#D4AF37' },
});
