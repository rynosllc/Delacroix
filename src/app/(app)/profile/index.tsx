import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ImageBackground, ScrollView,
  Alert, Linking, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { Brand } from '@/constants/brand';
import { BottomNavBar } from '@/components/BottomNavBar';

const BG = require('../../../../assets/background.png');

const SUPPORT_EMAIL = 'ismael@rynosops.com';
const APP_STORE_REVIEW_URL = 'https://apps.apple.com/app/id6785289391?action=write-review';

export default function YouScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState<string>('');
  const [deleting, setDeleting] = useState(false);

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

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete your account?',
      'This permanently removes your account, your contacts, and every gift you have sent. This cannot be undone.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Delete forever', style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const { data, error } = await supabase.functions.invoke('delete-account', { body: {} });
            setDeleting(false);
            if (error || data?.error) {
              Alert.alert('Could not delete account', 'Please try again or contact support.');
              return;
            }
            signOut();
          },
        },
      ],
    );
  }

  const rows = [
    {
      label: 'Terms & Privacy Policy',
      icon: '📄',
      onPress: () => router.push('/profile/terms'),
    },
    {
      label: 'Send Feedback',
      icon: '✉️',
      onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=DeLacroix%20feedback`),
    },
    {
      label: 'Rate DeLacroix',
      icon: '★',
      onPress: () => Linking.openURL(APP_STORE_REVIEW_URL),
    },
  ];

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
          </View>

          {/* Settings rows */}
          <View style={styles.card}>
            {rows.map((row, i) => (
              <View key={row.label}>
                <TouchableOpacity
                  style={styles.row}
                  onPress={row.onPress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rowIcon}>{row.icon}</Text>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowChevron}>›</Text>
                </TouchableOpacity>
                {i < rows.length - 1 && <View style={styles.rowSep} />}
              </View>
            ))}
          </View>

          {/* Sign out — a real button, readable at a glance */}
          <TouchableOpacity style={styles.signOut} onPress={signOut} activeOpacity={0.8}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          {/* Account deletion (required by App Store guideline 5.1.1) */}
          <TouchableOpacity
            style={[styles.deleteBtn, deleting && { opacity: 0.6 }]}
            onPress={confirmDeleteAccount}
            disabled={deleting}
            activeOpacity={0.8}
          >
            {deleting
              ? <ActivityIndicator color="#C0392B" />
              : <Text style={styles.deleteText}>Delete Account</Text>}
          </TouchableOpacity>
        </ScrollView>

        <BottomNavBar />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 20, paddingBottom: 32 },

  avatarBlock: { alignItems: 'center', gap: 8, paddingTop: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(36, 51, 39, 0.9)',
    borderWidth: 1.5, borderColor: 'rgba(212, 175, 55, 0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:  { color: Brand.gold, fontSize: 26, fontWeight: '600' },
  name:        { color: Brand.cream, fontSize: 20, fontFamily: 'ui-serif' },
  email:       { color: Brand.cream, fontSize: 13, opacity: 0.8 },

  card: {
    backgroundColor: 'rgba(36, 51, 39, 0.82)',
    borderWidth: 1, borderColor: Brand.greenBorder,
    borderRadius: 14, overflow: 'hidden',
  },
  row:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, gap: 12 },
  rowIcon:  { fontSize: 18, width: 24, textAlign: 'center' },
  rowLabel: { flex: 1, color: Brand.cream, fontSize: 15 },
  rowChevron: { color: Brand.gold, fontSize: 18 },
  rowSep:   { height: 1, backgroundColor: Brand.greenBorder, marginHorizontal: 16 },

  signOut: {
    height: 50,
    borderWidth: 1.5, borderColor: '#D4AF37', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  signOutText: { color: '#D4AF37', fontSize: 15, fontWeight: '600', letterSpacing: 0.5 },

  deleteBtn: { alignItems: 'center', paddingVertical: 10 },
  deleteText: { color: '#D96A5E', fontSize: 14, fontWeight: '600' },
});
