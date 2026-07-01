import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Brand } from '@/constants/brand';

export default function GiftComingSoonScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>DeLacroix</Text>
      <Text style={styles.title}>Gift flow coming soon</Text>
      <Text style={styles.subtitle}>This will be the Create Gift flow.</Text>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Go back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center', gap: 16 },
  wordmark: { fontFamily: 'ui-serif', fontSize: 24, color: Brand.gold, letterSpacing: 2 },
  title: { color: Brand.cream, fontSize: 20 },
  subtitle: { color: Brand.muted, fontSize: 14 },
  back: { marginTop: 16 },
  backText: { color: Brand.gold, fontSize: 15 },
});
