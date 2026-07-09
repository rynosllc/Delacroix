import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ImageBackground,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Brand } from '@/constants/brand';

const BG = require('../../../../assets/background.png');

export default function SendSuccessScreen() {
  const router = useRouter();
  const { recipientName } = useLocalSearchParams<{ recipientName: string }>();

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <View style={styles.body}>
          <View style={styles.checkCircle}>
            <Text style={styles.check}>✓</Text>
          </View>
          <Text style={styles.title}>Your gift is on its way</Text>
          {recipientName ? (
            <Text style={styles.subtitle}>
              {recipientName} will receive it with love.
            </Text>
          ) : null}
        </View>

        {/* REPLACE WITH CUSTOM ASSET LATER */}
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => router.replace('/')}
          activeOpacity={0.85}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.viewGifts}
          onPress={() => router.replace('/gifts')}
          activeOpacity={0.7}
        >
          <Text style={styles.viewGiftsText}>View your gifts</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 20 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  checkCircle: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, borderColor: '#D4AF37',
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  check:    { color: '#D4AF37', fontSize: 48, lineHeight: 56 },
  title:    { color: Brand.gold, fontSize: 26, fontFamily: 'ui-serif', letterSpacing: 1, textAlign: 'center' },
  subtitle: { color: Brand.muted, fontSize: 14, fontStyle: 'italic', textAlign: 'center' },
  doneBtn: {
    height: 56, backgroundColor: '#D4AF37',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  doneBtnText:   { color: '#1B3A2B', fontSize: 16, fontWeight: '700', letterSpacing: 1.5 },
  viewGifts:     { alignItems: 'center', paddingVertical: 16 },
  viewGiftsText: { color: Brand.gold, fontSize: 14 },
});
