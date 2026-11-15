import { View, StyleSheet, SafeAreaView, ImageBackground } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SendFlowHeader } from '@/components/SendFlowHeader';
import { LuxRow, LuxButton } from '@/components/lux';

const BG = require('../../../../assets/background.png');

export default function PhotoStep() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    recipientId: string; recipientName: string; occasion: string; message: string;
    returnTo?: string;
  }>();

  function advance(photoUri: string) {
    const { returnTo, ...rest } = params;
    if (returnTo === 'review') {
      router.replace({ pathname: '/send/review', params: { ...rest, photoUri } });
      return;
    }
    router.push({ pathname: '/send/gift', params: { ...rest, photoUri } });
  }

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <SendFlowHeader
          step={4}
          title="Add a personal touch"
          subtitle="A photo makes your gift feel even more personal."
          onBack={() => router.back()}
        />

        <View style={styles.body}>
          <LuxRow
            icon="camera-outline"
            title="Take a Photo"
            sub="Opens camera"
            onPress={() => advance('')}
          />
          <LuxRow
            icon="images-outline"
            title="Choose from Library"
            sub="Pick an existing photo"
            onPress={() => advance('')}
          />

          <LuxButton
            title="Skip for now"
            variant="outline"
            onPress={() => advance('')}
            style={{ marginTop: 10 }}
          />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 22, gap: 12, paddingTop: 6 },
});
