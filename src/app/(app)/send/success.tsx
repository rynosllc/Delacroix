import { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ImageBackground, Animated, Dimensions, Easing,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '@/constants/brand';
import { Lux, SERIF, LuxButton } from '@/components/lux';

const BG = require('../../../../assets/background.png');

export default function SendSuccessScreen() {
  const router = useRouter();
  const { recipientName, centieme } = useLocalSearchParams<{
    recipientName: string; centieme?: string;
  }>();
  const isCentieme = centieme === '1';

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <View style={styles.body}>
          <View style={styles.checkCircle}>
            <View style={styles.checkInner}>
              <Ionicons name="checkmark" size={46} color={Lux.goldBright} />
            </View>
          </View>
          <Text style={styles.title}>Your gift is on its way</Text>
          {recipientName ? (
            <Text style={styles.subtitle}>
              {recipientName} will receive it with love.
            </Text>
          ) : null}

          {isCentieme && (
            <View style={styles.plaque}>
              <Text style={styles.plaqueTitle}>Centième cadeau</Text>
              <Text style={styles.plaqueSub}>
                One hundred gifts, all from the heart.
              </Text>
            </View>
          )}
        </View>

        <LuxButton title="Done" onPress={() => router.replace('/')} />
        <LuxButton
          title="View your gifts"
          variant="outline"
          onPress={() => router.replace('/gifts')}
          style={{ marginTop: 12, marginBottom: 8 }}
        />

        {isCentieme && <HeartRain />}
      </SafeAreaView>
    </ImageBackground>
  );
}

// One-shot golden heart confetti for the hundredth gift.
const HEART_COUNT = 24;

function HeartRain() {
  const { width, height } = Dimensions.get('window');
  const hearts = useRef(
    Array.from({ length: HEART_COUNT }, (_, i) => ({
      progress: new Animated.Value(0),
      x: Math.random() * width,
      sway: (Math.random() - 0.5) * 90,
      size: 12 + Math.random() * 14,
      delay: Math.random() * 1200,
      duration: 2600 + Math.random() * 1400,
      opacity: 0.5 + Math.random() * 0.5,
    })),
  ).current;

  useEffect(() => {
    Animated.stagger(
      40,
      hearts.map(h =>
        Animated.timing(h.progress, {
          toValue: 1,
          duration: h.duration,
          delay: h.delay,
          easing: Easing.in(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ),
    ).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {hearts.map((h, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute',
            left: h.x,
            top: -40,
            fontSize: h.size,
            color: i % 3 === 0 ? '#E8C97A' : Brand.gold,
            opacity: h.progress.interpolate({
              inputRange: [0, 0.1, 0.85, 1],
              outputRange: [0, h.opacity, h.opacity, 0],
            }),
            transform: [
              {
                translateY: h.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, height + 80],
                }),
              },
              {
                translateX: h.progress.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, h.sway, h.sway * 0.4],
                }),
              },
              {
                rotate: h.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', `${h.sway}deg`],
                }),
              },
            ],
          }}
        >
          ♥
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 22 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  checkCircle: {
    width: 108, height: 108, borderRadius: 54,
    borderWidth: 1.5, borderColor: Lux.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  checkInner: {
    width: 92, height: 92, borderRadius: 46,
    borderWidth: 1, borderColor: 'rgba(217,180,90,0.35)',
    backgroundColor: 'rgba(217,180,90,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  title:    { color: Lux.cream, fontSize: 28, fontFamily: SERIF, letterSpacing: 0.5, textAlign: 'center' },
  subtitle: { color: Lux.muted, fontSize: 15, fontStyle: 'italic', textAlign: 'center', fontFamily: SERIF },

  plaque: {
    marginTop: 10, paddingHorizontal: 24, paddingVertical: 14,
    backgroundColor: Lux.glass,
    borderWidth: 1, borderColor: 'rgba(217,180,90,0.6)',
    borderRadius: 12, alignItems: 'center', gap: 4,
  },
  plaqueTitle: { color: Lux.goldBright, fontSize: 19, fontFamily: SERIF, letterSpacing: 2 },
  plaqueSub:   { color: Lux.muted, fontSize: 12, fontStyle: 'italic' },
});
