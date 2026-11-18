import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ImageBackground,
  ActivityIndicator, Alert, Share, ScrollView, Image,
} from 'react-native';
import { removeGiftPhoto } from '@/lib/photos';
import { giftMessage, textGift, shareGift } from '@/lib/share';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { Brand } from '@/constants/brand';
import { Ionicons } from '@expo/vector-icons';
import { Lux, SERIF, LuxButton, LuxBackHeader } from '@/components/lux';

const BG = require('../../../../assets/background.png');

const OCCASION_LABELS: Record<string, string> = {
  birthday:     'Birthday',
  anniversary:  'Anniversary',
  thank_you:    'Thank You',
  just_because: 'Just Because',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: Brand.muted,
  sent:      Brand.muted,
  claimed:   Brand.gold,
  declined:  '#C0392B',
  expired:   Brand.muted,
};

interface GiftDetail {
  id: string;
  sender_id: string;
  template_id: string;
  message_text: string;
  cash_amount: number | null;
  fee_amount: number | null;
  status: string;
  created_at: string;
  scheduled_send_at: string;
  sent_at: string | null;
  claimed_at: string | null;
  expires_at: string | null;
  thank_you_message: string | null;
  claim_token: string;
  photo_path: string | null;
  recipient_contacts: { display_name: string; phone: string | null } | null;
  users: { display_name: string } | null;
}

// What the sender sees: a delivered-but-unclaimed gift is "ready", since
// delivery is the sender texting the link.
const STATUS_LABELS: Record<string, string> = {
  scheduled: 'SCHEDULED',
  sent:      'READY',
  claimed:   'CLAIMED',
  declined:  'DECLINED',
  expired:   'EXPIRED',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function GiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [gift, setGift] = useState<GiftDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('gifts')
      .select('id, sender_id, template_id, message_text, cash_amount, fee_amount, status, created_at, scheduled_send_at, sent_at, claimed_at, expires_at, thank_you_message, claim_token, photo_path, recipient_contacts(display_name, phone), users!gifts_sender_id_fkey(display_name)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        const g = data as unknown as GiftDetail;
        setGift(g);
        setLoading(false);
        // The photo sits in a private bucket. Senders can sign a link for
        // their own folder; recipients get one from the claim lookup.
        if (g?.photo_path) {
          if (g.sender_id === user?.id) {
            supabase.storage
              .from('gift-photos')
              .createSignedUrl(g.photo_path, 3600)
              .then(({ data: signed }) => setPhotoUrl(signed?.signedUrl ?? null));
          } else {
            supabase.functions
              .invoke('get-gift-by-token', { body: { token: g.claim_token } })
              .then(({ data: lookup }) => setPhotoUrl(lookup?.photo_url ?? null));
          }
        }
      });
  }, [id]);

  const isSender = gift && gift.sender_id === user?.id;
  const firstName = (gift?.recipient_contacts?.display_name ?? '').split(' ')[0] || 'them';

  // The text mentions the opening date while the gift is still sealed
  function shareText(): string {
    if (!gift) return '';
    const opensOn = gift.status === 'scheduled' ? new Date(gift.scheduled_send_at) : null;
    return giftMessage(gift.claim_token, opensOn);
  }

  function cancelGift() {
    if (!gift) return;
    Alert.alert(
      'Cancel this gift?',
      `${gift.recipient_contacts?.display_name ?? 'The recipient'} will never know it existed.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel gift', style: 'destructive',
          onPress: async () => {
            setBusy(true);
            const { error } = await supabase.from('gifts').delete().eq('id', gift.id);
            setBusy(false);
            if (error) { Alert.alert('Could not cancel', error.message); return; }
            await removeGiftPhoto(gift.photo_path);
            router.back();
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
        <View style={styles.center}><ActivityIndicator color={Brand.gold} /></View>
      </ImageBackground>
    );
  }

  if (!gift) {
    return (
      <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
        <View style={styles.center}>
          <Text style={styles.missing}>This gift is no longer available.</Text>
          <LuxButton title="Back" variant="outline" onPress={() => router.back()} />
        </View>
      </ImageBackground>
    );
  }

  const statusColor = STATUS_COLORS[gift.status] ?? Brand.muted;

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBleed}>
          <LuxBackHeader
            onBack={() => router.back()}
            right={
              <View style={[styles.badge, { borderColor: statusColor }]}>
                <Text style={[styles.badgeText, { color: statusColor }]}>
                  {isSender ? (STATUS_LABELS[gift.status] ?? gift.status.toUpperCase()) : gift.status.toUpperCase()}
                </Text>
              </View>
            }
          />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.occasion} maxFontSizeMultiplier={1.25}>
            {(OCCASION_LABELS[gift.template_id] ?? gift.template_id).toUpperCase()}
          </Text>
          <Text style={styles.title} maxFontSizeMultiplier={1.25}>
            {isSender
              ? `To ${gift.recipient_contacts?.display_name ?? 'someone special'}`
              : `From ${gift.users?.display_name ?? 'someone special'}`}
          </Text>
          <View style={styles.titleRuleRow}>
            <View style={styles.titleRule} />
            <Ionicons name="heart" size={9} color={Lux.gold} />
            <View style={styles.titleRule} />
          </View>
        </View>

        {photoUrl ? (
          <View style={styles.photoFrame}>
            <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
          </View>
        ) : null}

        {/* Message */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>MESSAGE</Text>
          <Text style={styles.message}>{gift.message_text}</Text>
        </View>

        {/* Cash */}
        {gift.cash_amount ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>CASH GIFT</Text>
            <Text style={styles.cash}>${Number(gift.cash_amount).toFixed(2)}</Text>
            {isSender && gift.fee_amount ? (
              <Text style={styles.feeNote}>
                + ${Number(gift.fee_amount).toFixed(2)} card processing
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Thank-you */}
        {gift.thank_you_message ? (
          <View style={[styles.card, styles.thanksCard]}>
            <Text style={styles.cardLabel}>THEIR THANK-YOU</Text>
            <Text style={styles.message}>{gift.thank_you_message}</Text>
          </View>
        ) : null}

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>TIMELINE</Text>
          <TimelineRow label="Created" value={fmtDate(gift.created_at)} />
          <TimelineRow
            label={gift.status === 'scheduled' ? 'Opens' : 'Ready to open'}
            value={fmtDate(gift.sent_at ?? gift.scheduled_send_at)}
          />
          {gift.claimed_at ? <TimelineRow label="Claimed" value={fmtDate(gift.claimed_at)} /> : null}
          {gift.status === 'sent' && gift.expires_at ? (
            <TimelineRow label="Expires" value={fmtDate(gift.expires_at)} />
          ) : null}
        </View>

        {/* Actions */}
        {isSender && (gift.status === 'sent' || gift.status === 'scheduled') ? (
          <>
            <LuxButton
              title={`Text it to ${firstName}`}
              chevron
              onPress={() => textGift(gift.recipient_contacts?.phone, shareText())}
            />
            <LuxButton
              title="Share another way"
              variant="outline"
              onPress={() => shareGift(shareText())}
            />
          </>
        ) : null}

        {isSender && gift.status === 'scheduled' ? (
          <TouchableOpacity
            style={[styles.dangerBtn, busy && { opacity: 0.6 }]}
            onPress={cancelGift}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy
              ? <ActivityIndicator color={Lux.danger} />
              : <Text style={styles.dangerBtnText} maxFontSizeMultiplier={1.25}>CANCEL GIFT</Text>}
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </ImageBackground>
  );
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.timelineRow}>
      <Text style={styles.timelineLabel}>{label}</Text>
      <Text style={styles.timelineValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  missing: { color: Lux.muted, fontSize: 16, fontStyle: 'italic', fontFamily: SERIF },
  scroll: { paddingHorizontal: 22, paddingBottom: 48, gap: 14 },
  headerBleed: { marginHorizontal: -22 },

  badge: {
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },

  titleBlock: { alignItems: 'center', gap: 8, paddingBottom: 6 },
  occasion: { color: 'rgba(217,180,90,0.8)', fontSize: 11, letterSpacing: 2.5 },
  title:    { color: Lux.cream, fontSize: 28, fontFamily: SERIF, letterSpacing: 0.5, textAlign: 'center' },
  titleRuleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleRule: { width: 46, height: 1, backgroundColor: Lux.line },

  // Explicit height: the wrapper sizes the photo, not the image itself.
  photoFrame: {
    height: 260, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(217,180,90,0.5)',
  },
  photo: { width: '100%', height: '100%' },

  card: {
    backgroundColor: Lux.glass,
    borderWidth: 1, borderColor: Lux.hairline,
    borderRadius: 16, padding: 18, gap: 8,
  },
  thanksCard: { borderColor: 'rgba(217,180,90,0.5)' },
  cardLabel:  { color: 'rgba(217,180,90,0.75)', fontSize: 10, letterSpacing: 2 },
  message:    { color: Lux.cream, fontSize: 18, lineHeight: 26, fontFamily: SERIF },
  cash:       { color: Lux.goldBright, fontSize: 30, fontFamily: SERIF },
  feeNote:    { color: Lux.muted, fontSize: 12 },

  timelineRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  timelineLabel: { color: Lux.muted, fontSize: 13 },
  timelineValue: { color: Lux.cream, fontSize: 13 },

  dangerBtn: {
    height: 54, borderWidth: 1.5, borderColor: Lux.danger, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  dangerBtnText: { color: Lux.danger, fontSize: 13, fontWeight: '600', letterSpacing: 2.5 },
});
