import { useState } from 'react';
import {
  View, TouchableOpacity, StyleSheet,
  SafeAreaView, ImageBackground, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SendFlowHeader } from '@/components/SendFlowHeader';
import { Lux, T } from '@/components/lux';

const BG = require('../../../../assets/background.png');

type MciName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const OCCASIONS: { key: string; label: string; icon: MciName }[] = [
  { key: 'birthday',     label: 'Birthday',     icon: 'cake-variant-outline' },
  { key: 'anniversary',  label: 'Anniversary',  icon: 'ring' },
  { key: 'thank_you',    label: 'Thank You',    icon: 'flower-tulip-outline' },
  { key: 'just_because', label: 'Just Because', icon: 'heart-outline' },
];

export default function OccasionStep() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    recipientId: string; recipientName: string; occasion?: string; returnTo?: string;
  }>();
  const [selected, setSelected] = useState<string | null>(params.occasion ?? null);

  // Tapping a card is the whole interaction: it lights up, then moves on.
  function choose(key: string) {
    setSelected(key);
    const { returnTo, ...rest } = params;
    setTimeout(() => {
      if (returnTo === 'review') {
        router.replace({ pathname: '/send/review', params: { ...rest, occasion: key } });
        return;
      }
      router.push({ pathname: '/send/message', params: { ...rest, occasion: key } });
    }, 160);
  }

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <SendFlowHeader
          step={2}
          title="Choose your occasion"
          subtitle={params.recipientName ? `For ${params.recipientName}` : undefined}
          onBack={() => router.back()}
        />

        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {OCCASIONS.map(occ => {
            const active = selected === occ.key;
            return (
              <TouchableOpacity
                key={occ.key}
                style={[styles.card, active && styles.cardActive]}
                onPress={() => choose(occ.key)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={occ.label}
                accessibilityState={{ selected: active }}
              >
                <View style={[styles.cardInset, active && styles.cardInsetActive]} pointerEvents="none" />
                <MaterialCommunityIcons
                  name={occ.icon}
                  size={44}
                  color={active ? Lux.goldBright : Lux.gold}
                />
                <View style={styles.labelRow}>
                  <T style={[styles.cardLabel, active && styles.cardLabelActive]}>
                    {occ.label.toUpperCase()}
                  </T>
                  <Ionicons name="chevron-forward" size={13} color={Lux.gold} />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14,
    paddingHorizontal: 22, paddingTop: 10, paddingBottom: 24,
    justifyContent: 'center',
  },
  card: {
    width: '47%', height: 150,
    borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(217,180,90,0.7)',
    backgroundColor: 'rgba(10,26,16,0.72)',
    alignItems: 'center', justifyContent: 'center', gap: 14,
  },
  cardActive: {
    borderColor: Lux.goldBright,
    backgroundColor: 'rgba(217,180,90,0.12)',
  },
  // A second, fainter line just inside the frame — the doubled gold edge
  // from the home buttons.
  cardInset: {
    position: 'absolute', left: 4, right: 4, top: 4, bottom: 4,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(217,180,90,0.22)',
  },
  cardInsetActive: { borderColor: 'rgba(242,213,122,0.5)' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardLabel: { color: Lux.cream, fontSize: 12.5, fontWeight: '600', letterSpacing: 2 },
  cardLabelActive: { color: Lux.goldBright },
});
