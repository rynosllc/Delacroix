import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ImageBackground,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Brand } from '@/constants/brand';
import { SendFlowHeader } from '@/components/SendFlowHeader';

const BG = require('../../../../assets/background.png');

export default function PhotoStep() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    recipientId: string; recipientName: string; occasion: string; message: string;
  }>();

  function advance(photoUri: string) {
    router.push({ pathname: '/send/gift', params: { ...params, photoUri } });
  }

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <SendFlowHeader
          step={4}
          title="Add a personal touch"
          onBack={() => router.back()}
        />

        <View style={styles.body}>
          <Text style={styles.hint}>Include a photo to make your gift feel even more personal.</Text>

          <View style={styles.options}>
            {/* REPLACE WITH CUSTOM ASSET LATER */}
            <TouchableOpacity
              style={styles.optionBtn}
              onPress={() => advance('')}
              activeOpacity={0.7}
            >
              <Text style={styles.optionIcon}>📷</Text>
              <Text style={styles.optionLabel}>Take a Photo</Text>
              <Text style={styles.optionSub}>Opens camera</Text>
            </TouchableOpacity>

            {/* REPLACE WITH CUSTOM ASSET LATER */}
            <TouchableOpacity
              style={styles.optionBtn}
              onPress={() => advance('')}
              activeOpacity={0.7}
            >
              <Text style={styles.optionIcon}>🖼️</Text>
              <Text style={styles.optionLabel}>Choose from Library</Text>
              <Text style={styles.optionSub}>Pick an existing photo</Text>
            </TouchableOpacity>
          </View>

          {/* REPLACE WITH CUSTOM ASSET LATER */}
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => advance('')}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  body:    { flex: 1, paddingHorizontal: 20, gap: 20 },
  hint:    { color: Brand.muted, fontSize: 14, textAlign: 'center', fontStyle: 'italic', paddingTop: 4 },
  options: { gap: 14 },
  optionBtn: {
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.35)',
    borderRadius: 14, paddingVertical: 22, alignItems: 'center', gap: 6,
  },
  optionIcon:  { fontSize: 36 },
  optionLabel: { color: Brand.cream, fontSize: 16, fontWeight: '600' },
  optionSub:   { color: Brand.muted, fontSize: 12 },
  skipBtn: {
    borderWidth: 1.5, borderColor: '#D4AF37',
    borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
  },
  skipText: { color: Brand.gold, fontSize: 15, fontWeight: '600', letterSpacing: 0.5 },
});
