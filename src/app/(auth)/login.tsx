import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ImageBackground,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/context/auth';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) Alert.alert('Sign in failed', error);
  }

  return (
    <ImageBackground
      source={require('../../../assets/background.png')}
      style={styles.container}
      resizeMode="cover"
    >
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.wordmark}>DeLacroix</Text>
        <Text style={styles.tagline}>it's from the heart</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#9A8C7A"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9A8C7A"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#F5ECD7" />
              : <Text style={styles.buttonText}>Sign In</Text>
            }
          </TouchableOpacity>
        </View>

        <Link href="/(auth)/signup" asChild>
          <TouchableOpacity style={styles.switchLink}>
            <Text style={styles.switchText}>
              New here? <Text style={styles.switchTextBold}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  wordmark: {
    fontFamily: 'serif',
    fontSize: 28,
    color: '#C9A84C',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 13,
    color: '#9A8C7A',
    textAlign: 'center',
    letterSpacing: 1,
    fontStyle: 'italic',
    marginBottom: 48,
  },
  form: {
    gap: 14,
  },
  input: {
    backgroundColor: '#243327',
    borderWidth: 1,
    borderColor: '#3A4F3D',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#F5ECD7',
  },
  button: {
    backgroundColor: '#C9A84C',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#1C2B1E',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  switchLink: {
    marginTop: 28,
    alignItems: 'center',
  },
  switchText: {
    color: '#9A8C7A',
    fontSize: 14,
  },
  switchTextBold: {
    color: '#C9A84C',
    fontWeight: '600',
  },
});
