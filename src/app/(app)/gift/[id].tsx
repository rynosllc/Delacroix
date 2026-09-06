import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ImageBackground,
  ActivityIndicator, Alert, Share, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { Brand } from '@/constants/brand';

const BG = require('../../../../assets/background.png');
const CLAIM_BASE = 'https://delacroix.expo.app/claim/';

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
  recipient_contacts: { display_name: string } | null;
  users: { display_name: string } | null;
}

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

  useEffect(() => {
    if (!id) return;
    supabase
      .from('gifts')
      .select('id, sender_id, template_id, message_text, cash_amount, fee_amount, status, created_at, scheduled_send_at, sent_at, claimed_at, expires_at, thank_you_message, claim_token, recipient_contacts(display_name), users!gifts_sender_id_fkey(display_name)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setGift(data as unknown as GiftDetail);
        setLoading(false);
      });
  }, [id]);

  const isSender = gift && gift.sender_id === user?.id;
  const claimUrl = gift ? `${CLAIM_BASE}${gift.claim_token}` : '';

  async function shareClaimLink() {
    if (!gift) return;
    await Share.share({
      message: `Open your DeLacroix gift here:\n${claimUrl}`,
    }).catch(() => {});
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
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.backLink}>‹ Back</Text>
          </TouchableOpacity>
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
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.backLink}>‹ Back</Text>
          </TouchableOpacity>
          <View style={[styles.badge, { borderColor: statusColor }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {gift.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>
          {isSender
            ? `To ${gift.recipient_contacts?.display_name ?? 'someone special'}`
            : `From ${gift.users?.display_name ?? 'someone special'}`}
        </Text>
        <Text style={styles.occasion}>
          {OCCASION_LABELS[gift.template_id] ?? gift.template_id}
        </Text>

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
                + ${Number(gift.fee_amount).toFixed(2)} processing fee
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
            label={gift.status === 'scheduled' ? 'Delivers' : 'Delivered'}
            value={fmtDate(gift.sent_at ?? gift.scheduled_send_at)}
          />
          {gift.claimed_at ? <TimelineRow label="Claimed" value={fmtDate(gift.claimed_at)} /> : null}
          {gift.status === 'sent' && gift.expires_at ? (
            <TimelineRow label="Expires" value={fmtDate(gift.expires_at)} />
          ) : null}
        </View>

        {/* Actions */}
        {isSender && gift.status === 'sent' ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={shareClaimLink} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Share Claim Link</Text>
          </TouchableOpacity>
        ) : null}

        {isSender && gift.status === 'scheduled' ? (
          <TouchableOpacity
            style={[styles.dangerBtn, busy && { opacity: 0.6 }]}
            onPress={cancelGift}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy
              ? <ActivityIndicator color="#C0392B" />
              : <Text style={styles.dangerBtnText}>Cancel Gift</Text>}
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
  missing: { color: Brand.muted, fontSize: 15, fontStyle: 'italic' },
  scroll: { padding: 20, paddingBottom: 48, gap: 14 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backLink:  { color: Brand.gold, fontSize: 16 },
  badge: {
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  title:    { color: Brand.cream, fontSize: 24, fontFamily: 'ui-serif', letterSpacing: 0.5 },
  occasion: { color: 'rgba(212,175,55,0.7)', fontSize: 14, fontStyle: 'italic', marginTop: -8 },

  card: {
    backgroundColor: 'rgba(36, 51, 39, 0.85)',
    borderWidth: 1, borderColor: Brand.greenBorder,
    borderRadius: 12, padding: 16, gap: 8,
  },
  thanksCard: { borderColor: 'rgba(212,175,55,0.45)' },
  cardLabel:  { color: 'rgba(212,175,55,0.55)', fontSize: 10, letterSpacing: 1.5 },
  message:    { color: Brand.cream, fontSize: 15, lineHeight: 22 },
  cash:       { color: Brand.gold, fontSize: 24, fontWeight: '700' },
  feeNote:    { color: Brand.muted, fontSize: 12 },

  timelineRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  timelineLabel: { color: Brand.muted, fontSize: 13 },
  timelineValue: { color: Brand.cream, fontSize: 13 },

  primaryBtn: {
    height: 52, backgroundColor: '#D4AF37', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { color: '#1B3A2B', fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  dangerBtn: {
    height: 52, borderWidth: 1.5, borderColor: '#C0392B', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  dangerBtnText: { color: '#C0392B', fontSize: 15, fontWeight: '600', letterSpacing: 0.5 },
});
