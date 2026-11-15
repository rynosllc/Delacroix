import { useState } from 'react';
import {
  View, StyleSheet, SafeAreaView, ImageBackground, Image, Alert,
  ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SendFlowHeader } from '@/components/SendFlowHeader';
import { Lux, T, LuxRow, LuxButton, luxStyles } from '@/components/lux';
import { pickGiftPhoto } from '@/lib/photos';

const BG = require('../../../../assets/background.png');

export default function PhotoStep() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    recipientId: string; recipientName: string; occasion: string; message: string;
    photoUri?: string; returnTo?: string;
  }>();
  const [photoUri, setPhotoUri] = useState(params.photoUri ?? '');
  const [busy, setBusy] = useState(false);

  function advance(uri: string) {
    const { returnTo, ...rest } = params;
    if (returnTo === 'review') {
      router.replace({ pathname: '/send/review', params: { ...rest, photoUri: uri } });
      return;
    }
    router.push({ pathname: '/send/gift', params: { ...rest, photoUri: uri } });
  }

  async function pick(source: 'camera' | 'library') {
    setBusy(true);
    const result = await pickGiftPhoto(source);
    setBusy(false);
    if ('uri' in result) setPhotoUri(result.uri);
    else if ('error' in result) Alert.alert('Photo', result.error);
  }

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <SendFlowHeader
            step={4}
            title="Add a personal touch"
            subtitle="A photo makes your gift feel even more personal."
            onBack={() => router.back()}
          />

          <View style={styles.body}>
            {photoUri ? (
              <>
                <View style={styles.frame}>
                  <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
                </View>
                <LuxButton title="Use this photo" chevron onPress={() => advance(photoUri)} />
                <LuxButton
                  title="Choose a different photo"
                  variant="outline"
                  onPress={() => setPhotoUri('')}
                />
              </>
            ) : busy ? (
              <View style={styles.busy}>
                <ActivityIndicator color={Lux.gold} />
                <T style={luxStyles.hint}>Preparing your photo…</T>
              </View>
            ) : (
              <>
                {Platform.OS !== 'web' && (
                  <LuxRow
                    icon="camera-outline"
                    title="Take a Photo"
                    sub="Opens camera"
                    onPress={() => pick('camera')}
                  />
                )}
                <LuxRow
                  icon="images-outline"
                  title="Choose from Library"
                  sub="Pick an existing photo"
                  onPress={() => pick('library')}
                />
                <LuxButton
                  title="Skip for now"
                  variant="outline"
                  onPress={() => advance('')}
                  style={{ marginTop: 10 }}
                />
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingBottom: 40 },
  body:   { paddingHorizontal: 22, gap: 12, paddingTop: 6 },
  // Explicit height: the wrapper sizes the photo, not the image itself.
  frame: {
    height: 300, borderRadius: 18, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(217,180,90,0.7)',
    marginBottom: 6,
  },
  photo: { width: '100%', height: '100%' },
  busy:  { alignItems: 'center', gap: 14, paddingVertical: 60 },
});
