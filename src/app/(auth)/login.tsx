import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ImageBackground, ScrollView, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { LuxButton } from '@/components/lux';

const BG = require('../../../assets/background.png');
const LOCKUP = require('../../../assets/images/ui/brand-lockup.png');

const GOLD       = '#D9B45A';
const GOLD_SOFT  = 'rgba(217, 180, 90, 0.65)';
const GOLD_FAINT = 'rgba(241, 227, 189, 0.35)';
const INPUT_FILL = 'rgba(0, 0, 0, 0.28)';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) Alert.alert('Sign in failed', error);
  }

  async function handleForgotPassword() {
    const addr = email.trim().toLowerCase();
    if (!addr) {
      Alert.alert('Enter your email', 'Type your email above, then tap "Forgot password?" again.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(addr, {
      redirectTo: 'https://delacroix.expo.app/reset-password',
    });
    if (error) {
      Alert.alert('Could not send reset email', error.message);
      return;
    }
    Alert.alert(
      'Check your email',
      `If an account exists for ${addr}, a password reset link is on its way.`,
    );
  }

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Monogram, wordmark and tagline, cut from the home artwork */}
          <Image
            source={LOCKUP}
            style={styles.lockup}
            resizeMode="contain"
            accessibilityLabel="DeLacroix — it's from the heart"
          />

          {/* Email */}
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={20} color={GOLD} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={GOLD_FAINT}
              selectionColor={GOLD}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          {/* Password */}
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={20} color={GOLD} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={GOLD_FAINT}
              selectionColor={GOLD}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="current-password"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(v => !v)}
              style={styles.eyeBtn}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={GOLD}
              />
            </TouchableOpacity>
          </View>

          <LuxButton
            title="Sign in"
            chevron
            onPress={handleSignIn}
            loading={loading}
            style={{ width: '100%', marginTop: 8 }}
          />

          {/* Forgot password */}
          <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7} style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* OR divider */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>

          <LuxButton
            title="Create an account"
            variant="outline"
            chevron
            onPress={() => router.push('/(auth)/signup')}
            style={{ width: '100%' }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
  },

  // 507x408 artwork; explicit points because RN-web ignores aspectRatio on
  // images with a known natural size.
  lockup: { width: 286, height: 230, marginBottom: 22 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%', height: 56,
    backgroundColor: INPUT_FILL,
    borderWidth: 1, borderColor: 'rgba(217,180,90,0.45)',
    borderRadius: 14, marginBottom: 14,
    paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  input:     { flex: 1, color: '#F1E3BD', fontSize: 16, height: '100%' },
  eyeBtn:    { padding: 6 },

  orRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    width: '80%', marginVertical: 22,
  },
  orLine: { flex: 1, height: 1, backgroundColor: GOLD_FAINT },
  orText: { color: GOLD_SOFT, fontSize: 13, letterSpacing: 2 },

  forgotBtn:  { paddingVertical: 14 },
  forgotText: { color: GOLD, fontSize: 14, textDecorationLine: 'underline' },
});
