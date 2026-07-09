import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ImageBackground,
  ActivityIndicator, Animated, Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Brand } from '@/constants/brand';

const BG = require('../../../assets/background.png');

const OCCASION_LABELS: Record<string, string> = {
  birthday:     'a birthday',
  anniversary:  'an anniversary',
  thank_you:    'a thank-you',
  just_because: 'a just-because',
};

interface ClaimGift {
  sender_name: string;
  occasion: string;
  message_text: string;
  cash_amount: number | null;
  status: string;
}

export default function ClaimScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();

  const [gift, setGift]       = useState<ClaimGift | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [opened, setOpened]   = useState(false);

  const envelopeFade = useRef(new Animated.Value(1)).current;
  const messageFade  = useRef(new Animated.Value(0)).current;
  const messageRise  = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (!token) return;
    supabase.functions
      .invoke('get-gift-by-token', { body: { token } })
      .then(({ data, error }) => {
        if (error || !data || data.error) setNotFound(true);
        else setGift(data as ClaimGift);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  function openEnvelope() {
    if (opened) return;
    setOpened(true);
    Animated.sequence([
      Animated.timing(envelopeFade, { toValue: 0, duration: 400, useNativeDriver: Platform.OS !== 'web' }),
      Animated.parallel([
        Animated.timing(messageFade, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(messageRise, { toValue: 0, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ]).start();
  }

  if (loading) {
    return (
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        <View style={styles.center}><ActivityIndicator color={Brand.gold} /></View>
      </ImageBackground>
    );
  }

  if (notFound || !gift) {
    return (
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        <View style={styles.center}>
          <Text style={styles.wordmark}>DeLacroix</Text>
          <Text style={styles.notFoundTitle}>This gift link isn't valid</Text>
          <Text style={styles.notFoundSub}>
            The link may be incorrect or the gift may no longer be available.
          </Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <View style={styles.page}>
        <View style={styles.container}>

          <Text style={styles.wordmark}>DeLacroix</Text>

          <Text style={styles.headline}>
            {gift.sender_name} sent you a gift
          </Text>
          <Text style={styles.occasion}>
            for {OCCASION_LABELS[gift.occasion] ?? gift.occasion} moment
          </Text>

          {/* Envelope — tap to open. REPLACE WITH CUSTOM ASSET LATER */}
          {!opened && (
            <Animated.View style={{ opacity: envelopeFade }}>
              <TouchableOpacity
                style={styles.envelope}
                onPress={openEnvelope}
                activeOpacity={0.8}
              >
                <Text style={styles.envelopeIcon}>✉️</Text>
                <Text style={styles.envelopeHint}>Tap to open</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Revealed message */}
          {opened && (
            <Animated.View
              style={[
                styles.messageCard,
                { opacity: messageFade, transform: [{ translateY: messageRise }] },
              ]}
            >
              <View style={styles.messageDividerTop} />
              <Text style={styles.messageText}>{gift.message_text}</Text>
              <Text style={styles.messageFrom}>— {gift.sender_name}</Text>

              {gift.cash_amount ? (
                <View style={styles.cashBlock}>
                  <Text style={styles.cashText}>
                    They also sent you{' '}
                    <Text style={styles.cashAmount}>
                      ${Number(gift.cash_amount).toFixed(2)}
                    </Text>
                  </Text>
                  {/* REPLACE WITH CUSTOM ASSET LATER — Stripe payout comes next phase */}
                  <TouchableOpacity style={styles.claimBtn} activeOpacity={0.85}>
                    <Text style={styles.claimBtnText}>Claim your gift</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </Animated.View>
          )}

          <Text style={styles.footer}>it's from the heart</Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg:     { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  page:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  container: {
    width: '100%', maxWidth: 480,
    alignItems: 'center', gap: 12,
  },

  wordmark: { fontFamily: 'ui-serif', fontSize: 26, color: Brand.gold, letterSpacing: 2.5, marginBottom: 18 },
  headline: { color: Brand.cream, fontSize: 26, fontFamily: 'ui-serif', textAlign: 'center', letterSpacing: 0.5 },
  occasion: { color: 'rgba(212,175,55,0.7)', fontSize: 14, fontStyle: 'italic', marginBottom: 24 },

  envelope: {
    width: 260, height: 180,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderWidth: 1.5, borderColor: 'rgba(212, 175, 55, 0.5)',
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  envelopeIcon: { fontSize: 56 },
  envelopeHint: { color: Brand.gold, fontSize: 13, letterSpacing: 1 },

  messageCard: {
    width: '100%',
    backgroundColor: 'rgba(36, 51, 39, 0.9)',
    borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.45)',
    borderRadius: 16, padding: 28, gap: 16, alignItems: 'center',
  },
  messageDividerTop: { width: 40, height: 1, backgroundColor: 'rgba(212,175,55,0.5)' },
  messageText: {
    color: Brand.cream, fontSize: 17, lineHeight: 27,
    textAlign: 'center', fontFamily: 'ui-serif',
  },
  messageFrom: { color: Brand.gold, fontSize: 14, fontStyle: 'italic' },

  cashBlock:  { alignItems: 'center', gap: 14, marginTop: 8, width: '100%' },
  cashText:   { color: Brand.cream, fontSize: 15 },
  cashAmount: { color: Brand.gold, fontWeight: '700', fontSize: 17 },
  claimBtn: {
    height: 52, width: '100%', maxWidth: 300,
    backgroundColor: '#D4AF37', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  claimBtnText: { color: '#1B3A2B', fontSize: 15, fontWeight: '700', letterSpacing: 1 },

  notFoundTitle: { color: Brand.cream, fontSize: 20, fontFamily: 'ui-serif', textAlign: 'center' },
  notFoundSub:   { color: Brand.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  footer: { color: 'rgba(212,175,55,0.45)', fontSize: 12, fontStyle: 'italic', letterSpacing: 1, marginTop: 28 },
});
