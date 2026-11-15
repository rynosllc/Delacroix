import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
  ImageBackground, ScrollView, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { Lux, SERIF, T, LuxButton } from '@/components/lux';

const BG = require('../../../assets/background.png');
const LOCKUP = require('../../../assets/images/ui/brand-lockup.png');

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!displayName.trim() || !email.trim() || !password) {
      Alert.alert('Missing details', 'Please enter your name, email, and a password.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password too short', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email.trim().toLowerCase(), password, displayName.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Sign up failed', error);
      return;
    }
    // If email confirmation is enabled there's no session yet — tell the
    // user what happens next instead of leaving them on the form.
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      Alert.alert('Check your email', 'We sent a confirmation link. Tap it, then sign in.');
    }
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
          <Image
            source={LOCKUP}
            style={styles.lockup}
            resizeMode="contain"
            accessibilityLabel="DeLacroix — it's from the heart"
          />

          <T style={styles.title}>Create your account</T>

          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={20} color={Lux.gold} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Your name (shown to recipients)"
              placeholderTextColor={Lux.faint}
              selectionColor={Lux.gold}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoComplete="name"
              maxFontSizeMultiplier={1.25}
            />
          </View>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={20} color={Lux.gold} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Lux.faint}
              selectionColor={Lux.gold}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              maxFontSizeMultiplier={1.25}
            />
          </View>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={20} color={Lux.gold} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password (8+ characters)"
              placeholderTextColor={Lux.faint}
              selectionColor={Lux.gold}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              maxFontSizeMultiplier={1.25}
            />
          </View>

          <LuxButton
            title="Create account"
            chevron
            onPress={handleSignUp}
            loading={loading}
            style={{ width: '100%', marginTop: 8 }}
          />

          <Text style={styles.legalNote} maxFontSizeMultiplier={1.25}>
            By creating an account you agree to our{' '}
            <Text
              style={styles.legalLink}
              onPress={() => WebBrowser.openBrowserAsync('https://delacroix.expo.app/terms.html')}
            >
              Terms
            </Text>
            {' '}and{' '}
            <Text
              style={styles.legalLink}
              onPress={() => WebBrowser.openBrowserAsync('https://delacroix.expo.app/privacy.html')}
            >
              Privacy Policy
            </Text>
            .
          </Text>

          <TouchableOpacity
            style={styles.switchLink}
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.switchText} maxFontSizeMultiplier={1.25}>
              Already have an account? <Text style={styles.switchTextBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28, paddingVertical: 48,
  },
  lockup: { width: 236, height: 190, marginBottom: 10 },
  title: {
    color: Lux.cream, fontSize: 24, fontFamily: SERIF,
    letterSpacing: 0.5, marginBottom: 20,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%', height: 56,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1, borderColor: 'rgba(217,180,90,0.45)',
    borderRadius: 14, marginBottom: 14, paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  input:     { flex: 1, color: Lux.cream, fontSize: 16, height: '100%' },
  legalNote: {
    color: Lux.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 16,
  },
  legalLink: { color: Lux.gold, textDecorationLine: 'underline' },
  switchLink: { marginTop: 24, paddingVertical: 8 },
  switchText: { color: Lux.muted, fontSize: 14 },
  switchTextBold: { color: Lux.goldBright, fontWeight: '600' },
});
