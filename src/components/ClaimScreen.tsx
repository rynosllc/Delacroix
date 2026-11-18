import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ImageBackground, Image,
  ActivityIndicator, Animated, Easing, Platform, TextInput, Alert, Linking,
  ScrollView, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Lux, SERIF, T, LuxButton, luxStyles } from '@/components/lux';

const BG = require('../../assets/background.png');
const LOCKUP = require('../../assets/images/ui/brand-lockup.png');
const ENVELOPE = require('../../assets/images/ui/envelope.png');

// Shown to web visitors only AFTER they've claimed — the gift itself is
// never gated behind an app download.
const APP_STORE_URL = 'https://apps.apple.com/app/id6785289391';

const NATIVE = Platform.OS !== 'web';

const OCCASION_LABELS: Record<string, string> = {
  birthday:     'a birthday',
  anniversary:  'an anniversary',
  thank_you:    'a thank-you',
  just_because: 'a just-because',
};

interface ClaimGift {
  sender_name: string;
  occasion: string;
  status: string;
  // Present once the gift has opened
  message_text?: string;
  cash_amount?: number | null;
  has_thank_you?: boolean;
  cash_ready?: boolean;
  payout_status?: string;
  photo_url?: string | null;
  // Present while it is still sealed
  opens_at?: string;
}

// Stripe sends the recipient back to this page with payout=return once their
// payout details are in.
function returnedFromPayoutSetup(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('payout') === 'return';
}

export function ClaimScreen({ token }: { token: string | undefined }) {
  const [gift, setGift]       = useState<ClaimGift | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [opened, setOpened]   = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [acting, setActing]   = useState(false);
  const [thanksText, setThanksText] = useState('');
  const [thanksSent, setThanksSent] = useState(false);
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [payoutNote, setPayoutNote] = useState('');

  const breathe      = useRef(new Animated.Value(0)).current;
  const envelopeLift = useRef(new Animated.Value(0)).current;
  const envelopeFade = useRef(new Animated.Value(1)).current;
  const flash        = useRef(new Animated.Value(0)).current;
  const messageFade  = useRef(new Animated.Value(0)).current;
  const messageRise  = useRef(new Animated.Value(0)).current;

  async function load(): Promise<ClaimGift | null> {
    const { data, error } = await supabase.functions.invoke('get-gift-by-token', { body: { token } });
    if (error || !data || data.error) return null;
    return data as ClaimGift;
  }

  useEffect(() => {
    if (!token) {
      // The token arrives a beat after first paint on the web; if it never
      // does, the link is simply incomplete.
      const wait = setTimeout(() => { setNotFound(true); setLoading(false); }, 1500);
      return () => clearTimeout(wait);
    }
    setNotFound(false);
    setLoading(true);
    load()
      .then(g => {
        if (!g) { setNotFound(true); return; }
        setGift(g);
        // Coming back from payout setup: skip the envelope and finish the transfer
        if (returnedFromPayoutSetup() && g.status === 'claimed') {
          setOpened(true);
          setRevealed(true);
          messageFade.setValue(1);
          messageRise.setValue(1);
          if (g.payout_status !== 'paid') completePayout();
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  // A gift whose moment has arrived opens within seconds of being paid for;
  // keep checking briefly so the recipient never has to refresh.
  useEffect(() => {
    if (!gift || gift.status !== 'scheduled' || !gift.opens_at) return;
    if (new Date(gift.opens_at).getTime() > Date.now()) return;
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      const g = await load().catch(() => null);
      if (g && g.status !== 'scheduled') { setGift(g); clearInterval(timer); }
      if (tries >= 30) clearInterval(timer);
    }, 4000);
    return () => clearInterval(timer);
  }, [gift?.status, gift?.opens_at]);

  // The sealed envelope breathes softly until it is opened
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
        Animated.timing(breathe, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

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

  // Opening: the envelope lifts toward you, a wash of gold light blooms from
  // the seal, and the card rises out of it under a fall of gold.
  function openEnvelope() {
    if (opened) return;
    setOpened(true);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(envelopeLift, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE }),
        Animated.timing(flash, { toValue: 1, duration: 620, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }),
      ]),
      Animated.timing(envelopeFade, { toValue: 0, duration: 240, useNativeDriver: NATIVE }),
    ]).start(() => {
      setRevealed(true);
      Animated.parallel([
        Animated.timing(messageFade, { toValue: 1, duration: 520, useNativeDriver: NATIVE }),
        Animated.spring(messageRise, { toValue: 1, friction: 7, tension: 50, useNativeDriver: NATIVE }),
      ]).start();
    });
    // Never leave the gift hidden if an animation is interrupted (a
    // backgrounded tab pauses them): land on the final state regardless.
    setTimeout(() => {
      setRevealed(true);
      messageFade.setValue(1);
      messageRise.setValue(1);
    }, 2200);
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
    const opensAt = gift.opens_at ? new Date(gift.opens_at) : null;
    const stillSealed = !!opensAt && opensAt.getTime() > Date.now();
    return (
      <StatusScreen
        eyebrow={`FROM ${gift.sender_name.toUpperCase()}`}
        title={stillSealed
          ? `Opens ${opensAt!.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`
          : 'Your gift is almost here'}
        sub={stillSealed
          ? 'Something is waiting for you. Come back then — it’s worth the wait.'
          : 'It’s being wrapped right now. This page will open it for you in a moment.'}
        sealed
        waiting={!stillSealed}
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

          {/* Sealed envelope — tap to open */}
          {!revealed && (
            <Animated.View style={[styles.envelopeWrap, { opacity: envelopeFade }]}>
              <Animated.View
                style={[
                  styles.envelopeMotion,
                  {
                    transform: [
                      { scale: Animated.add(
                          breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] }),
                          envelopeLift.interpolate({ inputRange: [0, 1], outputRange: [0, 0.09] }),
                        ) },
                      { translateY: envelopeLift.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.envelope}
                  onPress={openEnvelope}
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityLabel="Open your gift"
                >
                  <Image source={ENVELOPE} style={styles.envelopeImage} resizeMode="cover" />
                </TouchableOpacity>
                {/* Gold light blooming from the wax seal */}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.flash,
                    {
                      opacity: flash.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.8, 0] }),
                      transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [0.3, 5] }) }],
                    },
                  ]}
                />
              </Animated.View>
              {!opened && (
                <LuxButton title="Open your gift" chevron onPress={openEnvelope} style={{ width: '100%' }} />
              )}
            </Animated.View>
          )}

          {/* Revealed message */}
          {revealed && (
            <Animated.View
              style={[
                styles.messageCard,
                {
                  opacity: messageFade,
                  transform: [
                    { translateY: messageRise.interpolate({ inputRange: [0, 1], outputRange: [44, 0] }) },
                    { scale: messageRise.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                  ],
                },
              ]}
            >
              {gift.photo_url ? (
                <View style={styles.photoFrame}>
                  <Image source={{ uri: gift.photo_url }} style={styles.photo} resizeMode="cover" />
                </View>
              ) : (
                <Ionicons name="heart" size={14} color={Lux.gold} />
              )}
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
                        title={`Collect ${cash}`}
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

      {revealed && !returnedFromPayoutSetup() && <GoldShower />}
    </ImageBackground>
  );
}

// One fall of gold hearts and sparks as the gift opens.
const SHOWER_COUNT = 26;

function GoldShower() {
  const { width, height } = Dimensions.get('window');
  const pieces = useRef(
    Array.from({ length: SHOWER_COUNT }, (_, i) => ({
      progress: new Animated.Value(0),
      x: Math.random() * (width || 380),
      sway: (Math.random() - 0.5) * 90,
      size: 11 + Math.random() * 13,
      delay: Math.random() * 900,
      duration: 2400 + Math.random() * 1400,
      opacity: 0.55 + Math.random() * 0.45,
      glyph: i % 3 === 0 ? '✦' : '♥',
    })),
  ).current;
  const [done, setDone] = useState(false);

  useEffect(() => {
    Animated.stagger(
      35,
      pieces.map(p =>
        Animated.timing(p.progress, {
          toValue: 1, duration: p.duration, delay: p.delay,
          easing: Easing.in(Easing.quad), useNativeDriver: NATIVE,
        }),
      ),
    ).start(() => setDone(true));
    const t = setTimeout(() => setDone(true), 6000);
    return () => clearTimeout(t);
  }, []);

  if (done) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute', left: p.x, top: -40,
            fontSize: p.size,
            color: i % 2 === 0 ? Lux.goldBright : Lux.gold,
            opacity: p.progress.interpolate({
              inputRange: [0, 0.1, 0.85, 1], outputRange: [0, p.opacity, p.opacity, 0],
            }),
            transform: [
              { translateY: p.progress.interpolate({ inputRange: [0, 1], outputRange: [0, (height || 800) + 80] }) },
              { translateX: p.progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, p.sway, p.sway * 0.4] }) },
              { rotate: p.progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.sway}deg`] }) },
            ],
          }}
        >
          {p.glyph}
        </Animated.Text>
      ))}
    </View>
  );
}

function StatusScreen({
  title, sub, eyebrow, sealed, waiting,
}: {
  title: string; sub: string; eyebrow?: string; sealed?: boolean; waiting?: boolean;
}) {
  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <View style={styles.center}>
        <View style={styles.statusInner}>
          <Image source={LOCKUP} style={styles.lockup} resizeMode="contain" accessibilityLabel="DeLacroix" />
          {eyebrow ? <Text style={styles.occasion}>{eyebrow}</Text> : null}
          <Text style={styles.statusTitle}>{title}</Text>
          {sealed ? (
            <View style={[styles.envelope, { marginVertical: 8 }]}>
              <Image source={ENVELOPE} style={styles.envelopeImage} resizeMode="cover" />
            </View>
          ) : null}
          <Text style={styles.statusSub}>{sub}</Text>
          {waiting ? <ActivityIndicator color={Lux.gold} style={{ marginTop: 6 }} /> : null}
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg:     { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  statusInner: { width: '100%', maxWidth: 440, alignItems: 'center', gap: 14 },
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

  envelopeWrap: { width: '100%', alignItems: 'center', gap: 20 },
  envelopeMotion: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  // Wrapper carries the size; RN-web ignores aspectRatio on the image itself.
  envelope: {
    width: '100%', aspectRatio: 863 / 384,
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(217,180,90,0.4)',
  },
  envelopeImage: { width: '100%', height: '100%' },
  // A soft-edged disc: the glow around it hides the rim as it expands
  flash: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(246,227,161,0.55)',
    shadowColor: '#F6E3A1', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 26,
  },

  messageCard: {
    width: '100%',
    backgroundColor: Lux.glass,
    borderWidth: 1, borderColor: 'rgba(217,180,90,0.4)',
    borderRadius: 18, padding: 26, gap: 16, alignItems: 'center',
  },
  // Explicit height: the wrapper sizes the photo, not the image itself.
  photoFrame: {
    alignSelf: 'stretch', height: 260, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(217,180,90,0.5)',
  },
  photo: { width: '100%', height: '100%' },
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

  statusTitle: { color: Lux.cream, fontSize: 26, fontFamily: SERIF, textAlign: 'center' },
  statusSub:   { color: Lux.muted, fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 360 },
});
