import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ImageBackground, ActivityIndicator, Platform,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Brand } from '@/constants/brand';

const BG = require('../../assets/background.png');

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
          <Text style={styles.wordmark}>DeLacroix</Text>

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
              <TouchableOpacity
                style={[styles.btn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator color="#1B3A2B" />
                  : <Text style={styles.btnText}>Save New Password</Text>}
              </TouchableOpacity>
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

          <Text style={styles.footer}>it's from the heart</Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, alignItems: 'center', gap: 16 },
  wordmark: { fontFamily: 'ui-serif', fontSize: 26, color: Brand.gold, letterSpacing: 2.5, marginBottom: 8 },
  title: { color: Brand.cream, fontSize: 22, fontFamily: 'ui-serif', textAlign: 'center' },
  sub:   { color: Brand.cream, fontSize: 14, textAlign: 'center', lineHeight: 21, opacity: 0.85 },
  input: {
    width: '100%',
    backgroundColor: 'rgba(36, 51, 39, 0.85)',
    borderWidth: 1, borderColor: Brand.greenBorder,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Brand.cream,
  },
  error: { color: '#E08A80', fontSize: 13, textAlign: 'center' },
  btn: {
    width: '100%', height: 52, backgroundColor: '#D4AF37',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  btnText: { color: '#1B3A2B', fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  footer: { color: 'rgba(212,175,55,0.45)', fontSize: 12, fontStyle: 'italic', letterSpacing: 1, marginTop: 16 },
});
