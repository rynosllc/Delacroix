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
import { Lux, SERIF, LuxRow, LuxButton, LuxInitials, LuxSectionHeader } from '@/components/lux';

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
      icon: 'document-text-outline' as const,
      onPress: () => router.push('/profile/terms'),
    },
    {
      label: 'Send Feedback',
      icon: 'mail-outline' as const,
      onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=DeLacroix%20feedback`),
    },
    {
      label: 'Rate DeLacroix',
      icon: 'star-outline' as const,
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
            <View style={styles.avatarRing}>
              <LuxInitials name={displayName || '?'} size={84} />
            </View>
            <Text style={styles.name} maxFontSizeMultiplier={1.25}>{displayName || '—'}</Text>
            <Text style={styles.email} maxFontSizeMultiplier={1.25}>{user?.email ?? ''}</Text>
          </View>

          <LuxSectionHeader title="Account" />

          {/* Settings rows */}
          <View style={styles.rows}>
            {rows.map(row => (
              <LuxRow key={row.label} icon={row.icon} title={row.label} onPress={row.onPress} />
            ))}
          </View>

          {/* Sign out — a real button, readable at a glance */}
          <LuxButton title="Sign Out" variant="outline" onPress={signOut} />

          {/* Account deletion (required by App Store guideline 5.1.1) */}
          <TouchableOpacity
            style={[styles.deleteBtn, deleting && { opacity: 0.6 }]}
            onPress={confirmDeleteAccount}
            disabled={deleting}
            activeOpacity={0.8}
          >
            {deleting
              ? <ActivityIndicator color={Lux.danger} />
              : <Text style={styles.deleteText} maxFontSizeMultiplier={1.25}>Delete Account</Text>}
          </TouchableOpacity>
        </ScrollView>

        <BottomNavBar />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, gap: 20, paddingBottom: 32 },

  avatarBlock: { alignItems: 'center', gap: 8, paddingTop: 10 },
  avatarRing: {
    padding: 5, borderRadius: 52,
    borderWidth: 1.5, borderColor: Lux.gold,
  },
  name:        { color: Lux.cream, fontSize: 26, fontFamily: SERIF, marginTop: 4 },
  email:       { color: Lux.muted, fontSize: 13, letterSpacing: 0.3 },

  rows: { gap: 10 },

  deleteBtn: { alignItems: 'center', paddingVertical: 10 },
  deleteText: { color: Lux.danger, fontSize: 14, fontWeight: '600' },
});
