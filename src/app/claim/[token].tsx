import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ImageBackground,
  ActivityIndicator, Animated, Platform, TextInput, Alert,
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
  has_thank_you: boolean;
}

export default function ClaimScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();

  const [gift, setGift]       = useState<ClaimGift | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [opened, setOpened]   = useState(false);
  const [acting, setActing]   = useState(false);
  const [thanksText, setThanksText] = useState('');
  const [thanksSent, setThanksSent] = useState(false);

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

  // POSTs to the public claim-page function; invoke() carries the signed-in
  // user's JWT when there is one, which links claimed_user_id server-side.
  async function claimAction(action: 'claim' | 'decline' | 'thank_you', extra?: object) {
    setActing(true);
    const { data, error } = await supabase.functions.invoke('claim-page', {
      body: { token, action, ...extra },
    });
    setActing(false);
    if (error || data?.error) {
      Alert.alert('Something went wrong', data?.error ?? 'Please try again.');
      return false;
    }
    return true;
  }

  async function handleClaim() {
    if (await claimAction('claim')) {
      setGift(g => (g ? { ...g, status: 'claimed' } : g));
    }
  }

  function handleDecline() {
    Alert.alert('Politely decline?', 'The sender will see the gift was declined.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive',
        onPress: async () => {
          if (await claimAction('decline')) {
            setGift(g => (g ? { ...g, status: 'declined' } : g));
          }
        },
      },
    ]);
  }

  async function handleThankYou() {
    const msg = thanksText.trim();
    if (!msg) return;
    if (await claimAction('thank_you', { thank_you_message: msg })) {
      setThanksSent(true);
    }
  }

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
      <StatusScreen
        title="This gift link isn't valid"
        sub="The link may be incorrect or the gift may no longer be available."
      />
    );
  }

  if (gift.status === 'scheduled') {
    return (
      <StatusScreen
        title="Your gift is on its way"
        sub="It hasn't been delivered quite yet — check back soon."
      />
    );
  }
  if (gift.status === 'declined') {
    return (
      <StatusScreen
        title="This gift was declined"
        sub="No further action is needed."
      />
    );
  }
  if (gift.status === 'expired') {
    return (
      <StatusScreen
        title="This gift has expired"
        sub="Gifts can be claimed for 30 days after delivery. Ask your sender to send a new one."
      />
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
                <Text style={styles.cashText}>
                  They also sent you{' '}
                  <Text style={styles.cashAmount}>
                    ${Number(gift.cash_amount).toFixed(2)}
                  </Text>
                </Text>
              ) : null}

              {gift.status === 'sent' && (
                <View style={styles.cashBlock}>
                  {/* REPLACE WITH CUSTOM ASSET LATER — Stripe payout comes next phase */}
                  <TouchableOpacity
                    style={[styles.claimBtn, acting && { opacity: 0.6 }]}
                    onPress={handleClaim}
                    disabled={acting}
                    activeOpacity={0.85}
                  >
                    {acting
                      ? <ActivityIndicator color="#1B3A2B" />
                      : <Text style={styles.claimBtnText}>Claim your gift</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDecline} disabled={acting} activeOpacity={0.7}>
                    <Text style={styles.declineText}>Politely decline</Text>
                  </TouchableOpacity>
                </View>
              )}

              {gift.status === 'claimed' && !gift.has_thank_you && !thanksSent && (
                <View style={styles.cashBlock}>
                  <Text style={styles.thanksPrompt}>
                    Send {gift.sender_name} a thank-you?
                  </Text>
                  <TextInput
                    style={styles.thanksInput}
                    placeholder="Write a short thank-you…"
                    placeholderTextColor={Brand.muted}
                    selectionColor={Brand.gold}
                    multiline
                    value={thanksText}
                    onChangeText={setThanksText}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[styles.claimBtn, (acting || !thanksText.trim()) && { opacity: 0.6 }]}
                    onPress={handleThankYou}
                    disabled={acting || !thanksText.trim()}
                    activeOpacity={0.85}
                  >
                    {acting
                      ? <ActivityIndicator color="#1B3A2B" />
                      : <Text style={styles.claimBtnText}>Send thank-you</Text>}
                  </TouchableOpacity>
                </View>
              )}

              {gift.status === 'claimed' && (gift.has_thank_you || thanksSent) && (
                <Text style={styles.thanksDone}>
                  Your thank-you is on its way to {gift.sender_name}. ✓
                </Text>
              )}
            </Animated.View>
          )}

          <Text style={styles.footer}>it's from the heart</Text>
        </View>
      </View>
    </ImageBackground>
  );
}

function StatusScreen({ title, sub }: { title: string; sub: string }) {
  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <View style={styles.center}>
        <Text style={styles.wordmark}>DeLacroix</Text>
        <Text style={styles.notFoundTitle}>{title}</Text>
        <Text style={styles.notFoundSub}>{sub}</Text>
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
  declineText:  { color: 'rgba(212,175,55,0.65)', fontSize: 13, textDecorationLine: 'underline' },

  thanksPrompt: { color: Brand.muted, fontSize: 14 },
  thanksInput: {
    width: '100%',
    backgroundColor: 'rgba(28, 43, 30, 0.7)',
    borderWidth: 1, borderColor: Brand.greenBorder,
    borderRadius: 10, padding: 12, fontSize: 15,
    color: Brand.cream, minHeight: 90,
  },
  thanksDone: { color: Brand.muted, fontSize: 14, fontStyle: 'italic', marginTop: 8 },

  notFoundTitle: { color: Brand.cream, fontSize: 20, fontFamily: 'ui-serif', textAlign: 'center' },
  notFoundSub:   { color: Brand.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  footer: { color: 'rgba(212,175,55,0.45)', fontSize: 12, fontStyle: 'italic', letterSpacing: 1, marginTop: 28 },
});
