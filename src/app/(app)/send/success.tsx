import { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ImageBackground, Animated, Dimensions, Easing,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Brand } from '@/constants/brand';

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
            <Text style={styles.check}>✓</Text>
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

  plaque: {
    marginTop: 10, paddingHorizontal: 24, paddingVertical: 14,
    backgroundColor: 'rgba(36, 51, 39, 0.9)',
    borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.6)',
    borderRadius: 10, alignItems: 'center', gap: 4,
  },
  plaqueTitle: { color: Brand.gold, fontSize: 18, fontFamily: 'ui-serif', letterSpacing: 2 },
  plaqueSub:   { color: Brand.muted, fontSize: 12, fontStyle: 'italic' },

  doneBtn: {
    height: 56, backgroundColor: '#D4AF37',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  doneBtnText:   { color: '#1B3A2B', fontSize: 16, fontWeight: '700', letterSpacing: 1.5 },
  viewGifts:     { alignItems: 'center', paddingVertical: 16 },
  viewGiftsText: { color: Brand.gold, fontSize: 14 },
});
