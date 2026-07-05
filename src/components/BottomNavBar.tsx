import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = [
  { label: 'Home',   icon: '🏠', route: '/'       },
  { label: 'People', icon: '👥', route: '/people'  },
  { label: 'Gifts',  icon: '🎁', route: '/gifts'   },
  { label: 'You',    icon: '👤', route: '/profile' },
] as const;

export function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map(tab => {
        const active =
          tab.route === '/'
            ? pathname === '/' || pathname === ''
            : pathname === tab.route || pathname.startsWith(tab.route + '/');
        return (
          // REPLACE WITH CUSTOM ASSET LATER
          <TouchableOpacity
            key={tab.route}
            style={styles.tab}
            onPress={() => router.push(tab.route as string)}
            activeOpacity={0.7}
          >
            <Text style={[styles.icon, active && styles.iconActive]}>{tab.icon}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: 'rgba(15, 30, 15, 0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.3)',
    flexDirection: 'row',
    paddingTop: 12,
  },
  tab:        { flex: 1, alignItems: 'center', gap: 4 },
  icon:       { fontSize: 22, color: 'rgba(212, 175, 55, 0.4)' },
  iconActive: { color: '#D4AF37' },
  label:       { fontSize: 10, color: 'rgba(212, 175, 55, 0.4)', letterSpacing: 0.5 },
  labelActive: { color: '#D4AF37' },
});
