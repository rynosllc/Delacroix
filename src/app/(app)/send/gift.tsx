import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ImageBackground, TextInput, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Brand } from '@/constants/brand';
import { SendFlowHeader } from '@/components/SendFlowHeader';

const BG = require('../../../../assets/background.png');

function calcFee(amount: number): { fee: number; total: number } {
  const fee  = Math.ceil((amount * 0.029 + 0.30) * 100) / 100;
  const total = Math.round((amount + fee) * 100) / 100;
  return { fee, total };
}

export default function GiftAmountStep() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    recipientId: string; recipientName: string;
    occasion: string; message: string; photoUri: string;
  }>();

  const [amountStr, setAmountStr] = useState('');
  const amount  = parseFloat(amountStr) || 0;
  const { fee, total } = calcFee(amount);
  const valid   = amount >= 5;

  function advance(withAmount: string) {
    router.push({ pathname: '/send/review', params: { ...params, giftAmount: withAmount } });
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
            onBack={() => router.back()}
          />

          <View style={styles.inputWrap}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor="rgba(212,175,55,0.3)"
              selectionColor={Brand.gold}
              value={amountStr}
              onChangeText={v => setAmountStr(v.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              maxLength={7}
            />
          </View>
          <Text style={styles.minNote}>Minimum $5.00</Text>

          {amount > 0 && (
            <View style={styles.feeCard}>
              <View style={styles.feeLine}>
                <Text style={styles.feeLabel}>Gift amount</Text>
                <Text style={styles.feeValue}>${amount.toFixed(2)}</Text>
              </View>
              <View style={styles.feeLine}>
                <Text style={styles.feeLabel}>Processing fee</Text>
                <Text style={styles.feeValue}>${fee.toFixed(2)}</Text>
              </View>
              <View style={styles.feeDivider} />
              <View style={styles.feeLine}>
                <Text style={styles.feeLabelBold}>Total charged</Text>
                <Text style={styles.feeTotal}>${total.toFixed(2)}</Text>
              </View>
            </View>
          )}

          {/* REPLACE WITH CUSTOM ASSET LATER */}
          <TouchableOpacity
            style={[styles.continueBtn, !valid && styles.btnDisabled]}
            onPress={() => advance(amountStr)}
            disabled={!valid}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
          </TouchableOpacity>

          {/* REPLACE WITH CUSTOM ASSET LATER */}
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => advance('')}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip — no cash gift</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 4, paddingVertical: 16,
  },
  dollarSign:  { color: Brand.gold, fontSize: 36, fontWeight: '300' },
  amountInput: {
    color: Brand.gold, fontSize: 60, fontFamily: 'ui-serif',
    letterSpacing: 1, minWidth: 120, textAlign: 'center',
  },
  minNote: { color: Brand.muted, fontSize: 12, textAlign: 'center', marginTop: -8 },

  feeCard: {
    backgroundColor: 'rgba(36, 51, 39, 0.85)',
    borderWidth: 1, borderColor: Brand.greenBorder,
    borderRadius: 12, padding: 16, gap: 10,
  },
  feeLine:      { flexDirection: 'row', justifyContent: 'space-between' },
  feeLabel:     { color: Brand.muted, fontSize: 14 },
  feeLabelBold: { color: Brand.cream, fontSize: 15, fontWeight: '600' },
  feeValue:     { color: Brand.cream, fontSize: 14 },
  feeTotal:     { color: Brand.gold,  fontSize: 16, fontWeight: '700' },
  feeDivider:   { height: 1, backgroundColor: Brand.greenBorder },

  continueBtn: {
    height: 56, backgroundColor: '#D4AF37',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled:     { opacity: 0.4 },
  continueBtnText: { color: '#1B3A2B', fontSize: 16, fontWeight: '700', letterSpacing: 1.5 },
  skipBtn: {
    height: 52, borderWidth: 1.5, borderColor: '#D4AF37',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  skipText: { color: Brand.gold, fontSize: 15, fontWeight: '600' },
});
