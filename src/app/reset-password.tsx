import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  ImageBackground, ActivityIndicator, Platform, Image,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Brand } from '@/constants/brand';
import { Lux, SERIF, LuxButton, luxStyles } from '@/components/lux';

const BG = require('../../assets/background.png');
const LOCKUP = require('../../assets/images/ui/brand-lockup.png');

// Landing page for Supabase password-recovery links (web). The email link
// verifies the token and redirects here with access/refresh tokens in the
// URL hash; we establish the session and let the user set a new password.
export default function ResetPasswordScreen() {
  const [ready, setReady] = useState<'checking' | 'ok' | 'invalid'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'web') { setReady('invalid'); return; }
    const hash = typeof window !== 'undefined' ? window.location.hash.substring(1) : '';
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (!accessToken || !refreshToken) { setReady('invalid'); return; }
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => setReady(error ? 'invalid' : 'ok'));
  }, []);

  async function handleSave() {
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    setDone(true);
  }

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <View style={styles.page}>
        <View style={styles.card}>
          <Image source={LOCKUP} style={styles.lockup} resizeMode="contain" accessibilityLabel="DeLacroix" />

          {ready === 'checking' && <ActivityIndicator color={Brand.gold} />}

          {ready === 'invalid' && (
            <>
              <Text style={styles.title}>This reset link isn't valid</Text>
              <Text style={styles.sub}>
                It may have expired. Request a new one from the app's sign-in
                screen with "Forgot password?".
              </Text>
            </>
          )}

          {ready === 'ok' && !done && (
            <>
              <Text style={styles.title}>Choose a new password</Text>
              <TextInput
                style={styles.input}
                placeholder="New password"
                placeholderTextColor={Brand.muted}
                selectionColor={Brand.gold}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={Brand.muted}
                selectionColor={Brand.gold}
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <LuxButton
                title="Save new password"
                onPress={handleSave}
                loading={saving}
                style={{ width: '100%' }}
              />
            </>
          )}

          {done && (
            <>
              <Text style={styles.title}>Password updated ✓</Text>
              <Text style={styles.sub}>
                You can now sign in to the DeLacroix app with your new password.
              </Text>
            </>
          )}

        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, alignItems: 'center', gap: 16 },
  lockup: { width: 236, height: 190 },
  title: { color: Lux.cream, fontSize: 24, fontFamily: SERIF, textAlign: 'center' },
  sub:   { color: Lux.muted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  input: { ...luxStyles.input, width: '100%' },
  error: { color: Lux.danger, fontSize: 13, textAlign: 'center' },
});
