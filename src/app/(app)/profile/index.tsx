import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ImageBackground, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { Brand } from '@/constants/brand';
import { BottomNavBar } from '@/components/BottomNavBar';

const BG = require('../../../../assets/background.png');

const SETTINGS_ROWS = [
  { label: 'Subscription & Upgrade', route: '/profile/subscription', icon: '⭐' },
  { label: 'Payment & Payouts',       route: '/profile/payment',      icon: '💳' },
  { label: 'Notifications',           route: '/profile/notifications',icon: '🔔' },
  { label: 'Privacy & Security',      route: '/profile/privacy',      icon: '🔒' },
  { label: 'Terms & Privacy Policy',  route: '/profile/terms',        icon: '📄' },
  { label: 'Send Feedback',           route: '/profile/feedback',     icon: '✉️' },
  { label: 'Rate DeLacroix',          route: '/profile/rate',         icon: '★' },
] as const;

export default function YouScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
      });
  }, [user]);

  const initials = displayName
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar block */}
          <View style={styles.avatarBlock}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.name}>{displayName || '—'}</Text>
            <Text style={styles.email}>{user?.email ?? ''}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>DeLacroix Free</Text>
            </View>
          </View>

          {/* Settings rows */}
          <View style={styles.card}>
            {SETTINGS_ROWS.map((row, i) => (
              <View key={row.route}>
                {/* REPLACE WITH CUSTOM ASSET LATER */}
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => router.push(row.route as string)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rowIcon}>{row.icon}</Text>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowChevron}>›</Text>
                </TouchableOpacity>
                {i < SETTINGS_ROWS.length - 1 && <View style={styles.rowSep} />}
              </View>
            ))}
          </View>

          {/* Sign out */}
          <TouchableOpacity style={styles.signOut} onPress={signOut} activeOpacity={0.7}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>

        <BottomNavBar />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 24, paddingBottom: 32 },

  avatarBlock: { alignItems: 'center', gap: 8, paddingTop: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(36, 51, 39, 0.9)',
    borderWidth: 1.5, borderColor: 'rgba(212, 175, 55, 0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:  { color: Brand.gold, fontSize: 26, fontWeight: '600' },
  name:        { color: Brand.cream, fontSize: 20, fontFamily: 'ui-serif' },
  email:       { color: Brand.muted, fontSize: 13 },
  badge: {
    borderWidth: 1, borderColor: Brand.gold,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, marginTop: 2,
  },
  badgeText:   { color: Brand.gold, fontSize: 11, letterSpacing: 1, fontWeight: '600' },

  card: {
    backgroundColor: 'rgba(36, 51, 39, 0.82)',
    borderWidth: 1, borderColor: Brand.greenBorder,
    borderRadius: 14, overflow: 'hidden',
  },
  row:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, gap: 12 },
  rowIcon:  { fontSize: 18, width: 24, textAlign: 'center' },
  rowLabel: { flex: 1, color: Brand.cream, fontSize: 15 },
  rowChevron: { color: Brand.gold, fontSize: 18, opacity: 0.65 },
  rowSep:   { height: 1, backgroundColor: Brand.greenBorder, marginHorizontal: 16 },

  signOut:     { alignItems: 'center', paddingVertical: 8 },
  signOutText: { color: 'rgba(212, 175, 55, 0.45)', fontSize: 14 },
});
