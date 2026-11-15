import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Lux, T } from '@/components/lux';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { label: string; route: '/' | '/gifts' | '/people' | '/profile'; icon: IconName; iconActive: IconName }[] = [
  { label: 'Home',    route: '/',        icon: 'home-outline',   iconActive: 'home' },
  { label: 'Gifts',   route: '/gifts',   icon: 'gift-outline',   iconActive: 'gift' },
  { label: 'Friends', route: '/people',  icon: 'people-outline', iconActive: 'people' },
  { label: 'You',     route: '/profile', icon: 'person-outline', iconActive: 'person' },
];

// /profile is "You"; /profile/<id> and /contact/* belong to Friends.
function activeRoute(pathname: string): string {
  if (pathname === '/' || pathname === '') return '/';
  if (pathname.startsWith('/gift')) return '/gifts';
  if (pathname === '/profile' || pathname === '/profile/terms') return '/profile';
  if (pathname.startsWith('/people') || pathname.startsWith('/contact') || pathname.startsWith('/profile/')) return '/people';
  return '';
}

// Slim gold-rimmed pill from the home artwork: line icons, the current tab
// lifted on a soft plate.
export function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const current = activeRoute(pathname);

  return (
    <View style={[styles.wrap, { marginBottom: insets.bottom + 10 }]}>
      <LinearGradient
        colors={['#F2D57A', '#8C6B1F', '#E9C766', '#8C6B1F', '#F2D57A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.rim}
      >
        <View style={styles.inner}>
          {TABS.map(tab => {
            const active = current === tab.route;
            return (
              <TouchableOpacity
                key={tab.route}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => router.push(tab.route)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={active ? tab.iconActive : tab.icon}
                  size={23}
                  color={active ? Lux.goldBright : Lux.gold}
                />
                <T
                  style={[styles.label, active && styles.labelActive]}
                  maxFontSizeMultiplier={1.1}
                  numberOfLines={1}
                >
                  {tab.label}
                </T>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 14, borderRadius: 38,
    shadowColor: '#E9C766', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 8,
  },
  rim: { borderRadius: 38, padding: 2.5 },
  inner: {
    height: 68, borderRadius: 36,
    backgroundColor: '#08160D',
    borderWidth: 1, borderColor: 'rgba(60,110,70,0.55)',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 6, gap: 2,
  },
  tab: {
    flex: 1, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(217,180,90,0.22)',
  },
  label: { color: 'rgba(241,227,189,0.75)', fontSize: 11, letterSpacing: 0.3 },
  labelActive: { color: Lux.cream, fontWeight: '600' },
});
