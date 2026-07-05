import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ImageBackground, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Brand } from '@/constants/brand';
import { SendFlowHeader } from '@/components/SendFlowHeader';

const BG = require('../../../../assets/background.png');

const OCCASIONS = [
  { key: 'birthday',    label: 'Birthday',     icon: '🎂' },
  { key: 'anniversary', label: 'Anniversary',  icon: '💍' },
  { key: 'thank_you',   label: 'Thank You',    icon: '🌸' },
  { key: 'just_because',label: 'Just Because', icon: '💛' },
] as const;

export default function OccasionStep() {
  const router = useRouter();
  const params = useLocalSearchParams<{ recipientId: string; recipientName: string }>();
  const [selected, setSelected] = useState<string | null>(null);

  function onNext() {
    if (!selected) return;
    router.push({
      pathname: '/send/message',
      params: { ...params, occasion: selected },
    });
  }

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <SendFlowHeader
          step={2}
          title="Choose your occasion"
          onBack={() => router.back()}
        />

        {params.recipientName ? (
          <Text style={styles.forLabel}>For {params.recipientName}</Text>
        ) : null}

        <ScrollView contentContainerStyle={styles.grid}>
          {OCCASIONS.map(occ => (
            // REPLACE WITH CUSTOM ASSET LATER
            <TouchableOpacity
              key={occ.key}
              style={[styles.card, selected === occ.key && styles.cardActive]}
              onPress={() => setSelected(occ.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.cardIcon}>{occ.icon}</Text>
              <Text style={[styles.cardLabel, selected === occ.key && styles.cardLabelActive]}>
                {occ.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* REPLACE WITH CUSTOM ASSET LATER */}
        <TouchableOpacity
          style={[styles.nextBtn, !selected && styles.nextBtnDisabled]}
          onPress={onNext}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>Next</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1 },
  forLabel:   { color: Brand.muted, fontSize: 13, textAlign: 'center', marginBottom: 16 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14,
    paddingHorizontal: 20, paddingBottom: 24,
  },
  card: {
    width: '47%', aspectRatio: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.3)',
    borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  cardActive:      { backgroundColor: 'rgba(212, 175, 55, 0.18)', borderColor: Brand.gold },
  cardIcon:        { fontSize: 36 },
  cardLabel:       { color: Brand.muted, fontSize: 14, fontWeight: '600', letterSpacing: 0.5 },
  cardLabelActive: { color: Brand.gold },
  nextBtn: {
    margin: 20, height: 56, backgroundColor: '#D4AF37',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText:     { color: '#1B3A2B', fontSize: 16, fontWeight: '700', letterSpacing: 1.5 },
});
