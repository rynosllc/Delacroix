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
              <Image
                source={tab.icon}
                style={[styles.icon, !active && styles.iconInactive]}
                resizeMode="contain"
              />
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
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
    flexDirection: 'row',
  },
  pill: {
    flex: 1,
    height: 78,
    maxWidth: 560,
    marginHorizontal: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  pillImage: { width: '100%', height: '100%' },
  tab:  { alignItems: 'center', gap: 3, minWidth: 54 },
  icon: { width: 36, height: 30 },
  iconInactive: { opacity: 0.5 },
  label:       { fontSize: 9, color: 'rgba(212, 175, 55, 0.45)', letterSpacing: 1 },
  labelActive: { color: '#D4AF37' },
});
