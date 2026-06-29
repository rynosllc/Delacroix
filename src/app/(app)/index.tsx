import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '@/context/auth';

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>Maison Delacroix</Text>
      <Text style={styles.subtitle}>Address Book coming soon</Text>
      <Text style={styles.user}>{user?.email}</Text>
      <TouchableOpacity style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C2B1E',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  wordmark: {
    fontFamily: 'serif',
    fontSize: 28,
    color: '#C9A84C',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#9A8C7A',
    fontSize: 14,
  },
  user: {
    color: '#3A4F3D',
    fontSize: 12,
  },
  signOut: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#3A4F3D',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  signOutText: {
    color: '#9A8C7A',
    fontSize: 14,
  },
});
