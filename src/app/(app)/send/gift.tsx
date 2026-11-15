import { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, SafeAreaView,
  ImageBackground, TextInput, ScrollView, Animated,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { isLuckyAmount } from '@/lib/luck';
import { SendFlowHeader } from '@/components/SendFlowHeader';
import { Lux, SERIF, T, LuxButton, luxStyles } from '@/components/lux';

const BG = require('../../../../assets/background.png');

// Same rounding as the create-gift function, so the total shown here is the
// total charged.
function calcFee(amount: number): { fee: number; total: number } {
  const fee  = Math.round((amount * 0.029 + 0.30) * 100) / 100;
  const total = Math.round((amount + fee) * 100) / 100;
  return { fee, total };
}

export default function GiftAmountStep() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    recipientId: string; recipientName: string;
    occasion: string; message: string; photoUri: string;
    giftAmount?: string; returnTo?: string;
  }>();

  const [amountStr, setAmountStr] = useState(params.giftAmount ?? '');
  const amount  = parseFloat(amountStr) || 0;
  const { fee, total } = calcFee(amount);
  const valid   = amount >= 5 && amount <= 2000;

  // Repdigit amounts ($5.55, $77.77…) glitter for a moment
  const lucky = isLuckyAmount(amountStr);
  const sparkle = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!lucky) { sparkle.setValue(0); return; }
    Animated.sequence([
      Animated.timing(sparkle, { toValue: 1, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(sparkle, { toValue: 0.35, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(sparkle, { toValue: 1, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(sparkle, { toValue: 0.35, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(sparkle, { toValue: 1, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [lucky]);

  function advance(withAmount: string) {
    const { returnTo, ...rest } = params;
    if (returnTo === 'review') {
      router.replace({ pathname: '/send/review', params: { ...rest, giftAmount: withAmount } });
      return;
    }
    router.push({ pathname: '/send/review', params: { ...rest, giftAmount: withAmount } });
  }

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SendFlowHeader
            step={5}
            title="Add a cash gift"
            subtitle="Optional — tuck something inside the envelope."
            onBack={() => router.back()}
          />

          <View style={styles.body}>
            <View style={styles.amountCard}>
              <View style={styles.inputWrap}>
                <T style={styles.dollarSign}>$</T>
                <TextInput
                  // Sized to its digits so "$" stays snug against the number
                  style={[styles.amountInput, { width: Math.max(amountStr.length, 1) * 33 + 14 }]}
                  placeholder="0"
                  placeholderTextColor="rgba(217,180,90,0.3)"
                  selectionColor={Lux.gold}
                  value={amountStr}
                  onChangeText={v => setAmountStr(v.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  maxLength={7}
                  maxFontSizeMultiplier={1.1}
                />
              </View>
              <T style={luxStyles.eyebrow}>MINIMUM $5 · MAXIMUM $2,000</T>
            </View>

            {amount > 0 && (
              <View style={styles.feeCard}>
                <View style={styles.feeLine}>
                  <T style={styles.feeLabel}>Gift amount</T>
                  <T style={styles.feeValue}>${amount.toFixed(2)}</T>
                </View>
                <View style={styles.feeLine}>
                  <T style={styles.feeLabel}>Processing fee</T>
                  <T style={styles.feeValue}>${fee.toFixed(2)}</T>
                </View>
                <View style={styles.feeDivider} />
                <View style={styles.feeLine}>
                  <T style={styles.feeLabelBold}>Total charged</T>
                  <View style={styles.feeTotalRow}>
                    {lucky && (
                      <Animated.Text style={[styles.luckySparkle, { opacity: sparkle }]}>
                        ✨
                      </Animated.Text>
                    )}
                    <T style={styles.feeTotal}>${total.toFixed(2)}</T>
                  </View>
                </View>
              </View>
            )}

            <LuxButton
              title="Continue"
              chevron
              onPress={() => advance(amountStr)}
              disabled={!valid}
            />
            <LuxButton
              title="Skip — no cash gift"
              variant="outline"
              onPress={() => advance('')}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingBottom: 40 },
  body:   { paddingHorizontal: 22, gap: 16 },

  amountCard: {
    ...luxStyles.card,
    alignItems: 'center', paddingTop: 10, paddingBottom: 18, gap: 4,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 4, paddingVertical: 6,
  },
  dollarSign:  { color: Lux.gold, fontSize: 34, fontFamily: SERIF },
  amountInput: {
    color: Lux.goldBright, fontSize: 60, fontFamily: SERIF,
    letterSpacing: 1, textAlign: 'left', padding: 0,
  },

  feeCard:      { ...luxStyles.card, padding: 18, gap: 11 },
  feeLine:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feeLabel:     { color: Lux.muted, fontSize: 14 },
  feeLabelBold: { color: Lux.cream, fontSize: 16, fontFamily: SERIF },
  feeValue:     { color: Lux.cream, fontSize: 14 },
  feeTotal:     { color: Lux.goldBright, fontSize: 18, fontFamily: SERIF },
  feeTotalRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  luckySparkle: { fontSize: 13 },
  feeDivider:   { height: 1, backgroundColor: Lux.hairline },
});
