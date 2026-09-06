import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ImageBackground, ScrollView, Image,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { GoldGradient } from '@/components/GoldGradient';

const BG = require('../../../assets/background.png');
const WORDMARK = require('../../../assets/images/ui/wordmark.png');

const GOLD       = '#D4AF37';
const GOLD_SOFT  = 'rgba(212, 175, 55, 0.65)';
const GOLD_FAINT = 'rgba(212, 175, 55, 0.4)';
const DARK_GREEN = '#1B3A2B';
const INPUT_FILL = 'rgba(10, 20, 10, 0.6)';

export default function LoginScreen() {
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
          {/* Gold wordmark (includes the tagline) */}
          <Image source={WORDMARK} style={styles.wordmarkImage} resizeMode="contain" />

          {/* WELCOME with diamond divider */}
          <Text style={styles.welcome}>WELCOME</Text>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLineShort} />
            <Text style={styles.dividerDiamond}>◆</Text>
            <View style={styles.dividerLineShort} />
          </View>

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

          {/* SIGN IN — REPLACE WITH CUSTOM ASSET LATER */}
          <TouchableOpacity
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.85}
            style={[styles.signInShadow, loading && { opacity: 0.7 }]}
          >
            <GoldGradient style={styles.signInBtn}>
              {loading
                ? <ActivityIndicator color={DARK_GREEN} />
                : <Text style={styles.signInText}>SIGN IN</Text>
              }
            </GoldGradient>
          </TouchableOpacity>

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

          {/* CREATE AN ACCOUNT — REPLACE WITH CUSTOM ASSET LATER */}
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity style={styles.createBtn} activeOpacity={0.7}>
              <Text style={styles.createText}>CREATE AN ACCOUNT</Text>
              <Ionicons name="chevron-forward" size={16} color={GOLD} />
            </TouchableOpacity>
          </Link>
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

  wordmarkImage: { width: 300, height: 96, marginBottom: 18, marginTop: 24 },

  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14,
  },
  dividerLineShort: { width: 38, height: 1, backgroundColor: GOLD_SOFT },
  dividerDiamond:   { color: GOLD, fontSize: 9 },

  welcome: {
    color: GOLD, fontSize: 32, fontWeight: '600',
    letterSpacing: 6, fontFamily: 'ui-serif', marginBottom: 10,
  },
  tagline: {
    color: GOLD_SOFT, fontSize: 16, fontStyle: 'italic',
    fontFamily: 'ui-serif', marginBottom: 32,
  },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%', height: 56,
    backgroundColor: INPUT_FILL,
    borderWidth: 1.5, borderColor: GOLD,
    borderRadius: 12, marginBottom: 14,
    paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  input:     { flex: 1, color: '#F5ECD7', fontSize: 16, height: '100%' },
  eyeBtn:    { padding: 6 },

  signInShadow: {
    width: '100%', marginTop: 8,
    shadowColor: GOLD, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
  },
  signInBtn: {
    height: 56, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  signInText: {
    color: DARK_GREEN, fontSize: 17, fontWeight: '700', letterSpacing: 3,
  },

  orRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    width: '80%', marginVertical: 22,
  },
  orLine: { flex: 1, height: 1, backgroundColor: GOLD_FAINT },
  orText: { color: GOLD_SOFT, fontSize: 13, letterSpacing: 2 },

  forgotBtn:  { paddingVertical: 12 },
  forgotText: { color: GOLD, fontSize: 14, textDecorationLine: 'underline' },

  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, width: '100%', height: 56,
    borderWidth: 1.5, borderColor: GOLD, borderRadius: 12,
  },
  createText: { color: GOLD, fontSize: 15, fontWeight: '600', letterSpacing: 2 },
});
