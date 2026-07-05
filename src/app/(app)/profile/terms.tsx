import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand } from '@/constants/brand';
import { BottomNavBar } from '@/components/BottomNavBar';
const BG = require('../../../../assets/background.png');
export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ flex: 1 }}>
        <View style={[s.container, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.back}>
            <Text style={s.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Terms & Privacy Policy</Text>
          <View style={s.empty}><Text style={s.icon}>📄</Text><Text style={s.coming}>Coming soon</Text></View>
        </View>
        <BottomNavBar />
      </View>
    </ImageBackground>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  back:      { paddingVertical: 12 },
  backText:  { color: Brand.gold, fontSize: 17 },
  title:     { color: Brand.cream, fontSize: 22, fontFamily: 'ui-serif', marginBottom: 8 },
  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  icon:      { fontSize: 44, opacity: 0.45 },
  coming:    { color: Brand.muted, fontSize: 15, fontStyle: 'italic' },
});
