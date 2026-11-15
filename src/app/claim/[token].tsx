import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ImageBackground, Image,
  ActivityIndicator, Animated, Platform, TextInput, Alert, Linking, ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Lux, SERIF, T, LuxButton, luxStyles } from '@/components/lux';

const BG = require('../../../assets/background.png');
const LOCKUP = require('../../../assets/images/ui/brand-lockup.png');
const ENVELOPE = require('../../../assets/images/ui/envelope.png');

// Shown to web visitors only AFTER they've claimed — the gift itself is
// never gated behind an app download.
const APP_STORE_URL = 'https://apps.apple.com/app/id6785289391';

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
  cash_ready?: boolean;
  payout_status?: string;
}

// Stripe sends the recipient back to this page with ?payout=return once their
// payout details are in.
function returnedFromPayoutSetup(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('payout') === 'return';
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
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [payoutNote, setPayoutNote] = useState('');

  const envelopeFade = useRef(new Animated.Value(1)).current;
  const messageFade  = useRef(new Animated.Value(0)).current;
  const messageRise  = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (!token) return;
    supabase.functions
      .invoke('get-gift-by-token', { body: { token } })
      .then(({ data, error }) => {
        if (error || !data || data.error) { setNotFound(true); return; }
        const g = data as ClaimGift;
        setGift(g);
        // Coming back from payout setup: skip the envelope and finish the transfer
        if (returnedFromPayoutSetup() && g.status === 'claimed') {
          setOpened(true);
          messageFade.setValue(1);
          messageRise.setValue(0);
          if (g.payout_status !== 'paid') completePayout();
        }
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

  // Cash is paid out through Stripe: the first tap opens Stripe's secure
  // payout setup; on return the transfer is released.
  async function startPayout() {
    setPayoutBusy(true);
    setPayoutNote('');
    const { data, error } = await supabase.functions.invoke('claim-page', {
      body: { token, action: 'setup_payout' },
    });
    setPayoutBusy(false);
    if (error || !data?.url) {
      // The server explains itself (payment still clearing, already paid out…)
      let reason = '';
      try { reason = (await (error as any)?.context?.json?.())?.error ?? ''; } catch { /* no body */ }
      if (/already paid/i.test(reason)) {
        setGift(g => (g ? { ...g, payout_status: 'paid' } : g));
        return;
      }
      setPayoutNote(reason || 'We couldn’t start your payout just now. Please try again in a moment.');
      return;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.href = data.url;
    else Linking.openURL(data.url);
  }

  async function completePayout() {
    setPayoutBusy(true);
    const { data, error } = await supabase.functions.invoke('claim-page', {
      body: { token, action: 'complete_payout' },
    });
    setPayoutBusy(false);
    if (error || !data?.ok) {
      setPayoutNote('Your payout details aren’t finished yet — tap below to continue.');
      return;
    }
    setPayoutNote('');
    setGift(g => (g ? { ...g, payout_status: 'paid' } : g));
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
        <View style={styles.center}><ActivityIndicator color={Lux.gold} /></View>
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

  const cash = gift.cash_amount ? `$${Number(gift.cash_amount).toFixed(2)}` : '';
  const paidOut = gift.payout_status === 'paid';

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>

          <Image source={LOCKUP} style={styles.lockup} resizeMode="contain" accessibilityLabel="DeLacroix" />

          <T style={styles.occasion}>
            {`FOR ${(OCCASION_LABELS[gift.occasion] ?? gift.occasion).toUpperCase()} MOMENT`}
          </T>
          <T style={styles.headline}>{gift.sender_name} sent you a gift</T>
          <View style={styles.ruleRow}>
            <View style={styles.rule} />
            <Ionicons name="heart" size={9} color={Lux.gold} />
            <View style={styles.rule} />
          </View>

          {/* Envelope — tap to open */}
          {!opened && (
            <Animated.View style={[styles.envelopeWrap, { opacity: envelopeFade }]}>
              <TouchableOpacity
                style={styles.envelope}
                onPress={openEnvelope}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Open your gift"
              >
                <Image source={ENVELOPE} style={styles.envelopeImage} resizeMode="cover" />
              </TouchableOpacity>
              <LuxButton title="Open your gift" chevron onPress={openEnvelope} style={{ width: '100%' }} />
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
              <Ionicons name="heart" size={14} color={Lux.gold} />
              <T style={styles.messageText}>{gift.message_text}</T>
              <T style={styles.messageFrom}>— {gift.sender_name}</T>

              {gift.cash_amount ? (
                <View style={styles.cashPlate}>
                  <T style={luxStyles.eyebrow}>TUCKED INSIDE</T>
                  <T style={styles.cashAmount}>{cash}</T>
                </View>
              ) : null}

              {gift.status === 'sent' && (
                <View style={styles.actionBlock}>
                  <LuxButton
                    title="Claim your gift"
                    onPress={handleClaim}
                    loading={acting}
                    style={{ width: '100%' }}
                  />
                  <TouchableOpacity onPress={handleDecline} disabled={acting} activeOpacity={0.7}>
                    <T style={styles.declineText}>Politely decline</T>
                  </TouchableOpacity>
                </View>
              )}

              {/* Cash payout */}
              {gift.status === 'claimed' && gift.cash_amount ? (
                <View style={styles.actionBlock}>
                  {paidOut ? (
                    <T style={styles.doneNote}>
                      {cash} is on its way to your bank. It usually arrives in 1–2 business days.
                    </T>
                  ) : (
                    <>
                      <LuxButton
                        title={`Collect your ${cash}`}
                        onPress={startPayout}
                        loading={payoutBusy}
                        style={{ width: '100%' }}
                      />
                      <T style={styles.fineNote}>
                        {payoutNote || 'Paid securely to your bank through Stripe.'}
                      </T>
                    </>
                  )}
                </View>
              ) : null}

              {gift.status === 'claimed' && !gift.has_thank_you && !thanksSent && (
                <View style={styles.actionBlock}>
                  <T style={styles.thanksPrompt}>Send {gift.sender_name} a thank-you?</T>
                  <TextInput
                    style={styles.thanksInput}
                    placeholder="Write a short thank-you…"
                    placeholderTextColor={Lux.faint}
                    selectionColor={Lux.gold}
                    multiline
                    value={thanksText}
                    onChangeText={setThanksText}
                    textAlignVertical="top"
                    maxFontSizeMultiplier={1.25}
                  />
                  <LuxButton
                    title="Send thank-you"
                    variant="outline"
                    onPress={handleThankYou}
                    loading={acting}
                    disabled={!thanksText.trim()}
                    style={{ width: '100%' }}
                  />
                </View>
              )}

              {gift.status === 'claimed' && (gift.has_thank_you || thanksSent) && (
                <T style={styles.doneNote}>
                  Your thank-you is on its way to {gift.sender_name}.
                </T>
              )}

              {gift.status === 'claimed' && Platform.OS === 'web' && (
                <View style={styles.downloadBlock}>
                  <T style={styles.fineNote}>Send gifts of your own, from the heart.</T>
                  <LuxButton
                    title="Download DeLacroix"
                    variant="outline"
                    onPress={() => Linking.openURL(APP_STORE_URL)}
                    style={{ width: '100%' }}
                  />
                </View>
              )}
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

function StatusScreen({ title, sub }: { title: string; sub: string }) {
  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <View style={styles.center}>
        <Image source={LOCKUP} style={styles.lockup} resizeMode="contain" accessibilityLabel="DeLacroix" />
        <Text style={styles.statusTitle}>{title}</Text>
        <Text style={styles.statusSub}>{sub}</Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg:     { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  page:   { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingVertical: 40 },
  container: {
    width: '100%', maxWidth: 440,
    alignItems: 'center', gap: 12,
  },

  lockup: { width: 236, height: 190, marginBottom: 6 },
  occasion: { color: 'rgba(217,180,90,0.8)', fontSize: 11, letterSpacing: 2.5 },
  headline: { color: Lux.cream, fontSize: 28, fontFamily: SERIF, textAlign: 'center', letterSpacing: 0.5 },
  ruleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  rule:     { width: 46, height: 1, backgroundColor: Lux.line },

  envelopeWrap: { width: '100%', alignItems: 'center', gap: 18 },
  // Wrapper carries the size; RN-web ignores aspectRatio on the image itself.
  envelope: {
    width: '100%', aspectRatio: 863 / 384,
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(217,180,90,0.4)',
  },
  envelopeImage: { width: '100%', height: '100%' },

  messageCard: {
    width: '100%',
    backgroundColor: Lux.glass,
    borderWidth: 1, borderColor: 'rgba(217,180,90,0.4)',
    borderRadius: 18, padding: 26, gap: 16, alignItems: 'center',
  },
  messageText: {
    color: Lux.cream, fontSize: 19, lineHeight: 29,
    textAlign: 'center', fontFamily: SERIF,
  },
  messageFrom: { color: Lux.gold, fontSize: 15, fontStyle: 'italic', fontFamily: SERIF },

  cashPlate: {
    alignItems: 'center', gap: 4, alignSelf: 'stretch',
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: Lux.hairline,
    backgroundColor: 'rgba(217,180,90,0.07)',
  },
  cashAmount: { color: Lux.goldBright, fontSize: 34, fontFamily: SERIF },

  actionBlock: { alignItems: 'center', gap: 12, marginTop: 4, width: '100%' },
  declineText: { color: 'rgba(217,180,90,0.75)', fontSize: 13, textDecorationLine: 'underline' },
  fineNote:    { color: Lux.muted, fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 19 },
  doneNote:    { color: Lux.cream, fontSize: 15, fontStyle: 'italic', textAlign: 'center', lineHeight: 22, fontFamily: SERIF },

  thanksPrompt: { color: Lux.muted, fontSize: 15, fontFamily: SERIF, fontStyle: 'italic' },
  thanksInput: {
    ...luxStyles.input,
    width: '100%', minHeight: 96, fontSize: 16, fontFamily: SERIF,
  },

  downloadBlock: {
    width: '100%', alignItems: 'center', gap: 12,
    marginTop: 14, paddingTop: 18,
    borderTopWidth: 1, borderTopColor: Lux.hairline,
  },

  statusTitle: { color: Lux.cream, fontSize: 24, fontFamily: SERIF, textAlign: 'center' },
  statusSub:   { color: Lux.muted, fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 360 },
});
