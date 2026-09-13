import { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ImageBackground, ScrollView, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { Brand } from '@/constants/brand';
import { isLuckyAmount } from '@/lib/luck';
import { SendFlowHeader } from '@/components/SendFlowHeader';

const BG = require('../../../../assets/background.png');

const OCCASION_LABELS: Record<string, string> = {
  birthday:     'Birthday',
  anniversary:  'Anniversary',
  thank_you:    'Thank You',
  just_because: 'Just Because',
};

function calcFee(amount: number): number {
  return Math.ceil((amount * 0.029 + 0.30) * 100) / 100;
}

export default function ReviewStep() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    recipientId: string; recipientName: string; occasion: string;
    message: string; messageSource: string; photoUri: string; giftAmount: string;
  }>();
  const [sending, setSending] = useState(false);

  // Delivery scheduling — "Send now" (default) or a future date at 9:00 AM local
  const [sendMode, setSendMode] = useState<'now' | 'date'>('now');
  const [sdMonth, setSdMonth] = useState('');
  const [sdDay, setSdDay]     = useState('');
  const [sdYear, setSdYear]   = useState('');
  const sdDayRef  = useRef<TextInput>(null);
  const sdYearRef = useRef<TextInput>(null);

  function scheduledDate(): Date | null {
    if (sendMode === 'now') return new Date();
    if (sdYear.length !== 4 || !sdMonth || !sdDay) return null;
    const d = new Date(
      Number(sdYear), Number(sdMonth) - 1, Number(sdDay), 9, 0, 0,
    );
    if (
      isNaN(d.getTime()) ||
      d.getMonth() !== Number(sdMonth) - 1 ||
      d.getDate() !== Number(sdDay)
    ) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) return null;
    // A date of today whose 9:00 AM already passed sends immediately
    return d.getTime() < Date.now() ? new Date() : d;
  }

  const scheduleValid = scheduledDate() !== null;

  const hasPhoto  = !!params.photoUri;
  const amount    = parseFloat(params.giftAmount) || 0;
  const hasGift   = amount >= 5;
  const msgPreview = params.message?.length > 80
    ? params.message.slice(0, 80) + '…'
    : params.message;

  // Edit swaps this screen for the step being edited; that step's Next swaps
  // back to review with merged params — the stack never grows, and Back from
  // review always returns to the normal flow.
  function editStep(pathname: string) {
    router.replace({ pathname: pathname as any, params: { ...params, returnTo: 'review' } });
  }

  async function handleSend() {
    if (!user) return;
    if (!params.recipientId || !params.occasion || !params.message) {
      Alert.alert('Missing details', 'Please complete all steps before sending.');
      return;
    }
    const sendAt = scheduledDate();
    if (!sendAt) {
      Alert.alert('Invalid date', 'Please enter a valid delivery date (today or later).');
      return;
    }
    setSending(true);

    // Payment (Stripe) is wired in a later phase — cash_amount is
    // recorded on the row but nothing is charged yet.
    const { error } = await supabase.from('gifts').insert({
      sender_id: user.id,
      recipient_contact_id: params.recipientId,
      template_id: params.occasion,
      message_text: params.message,
      message_source: params.messageSource === 'ai_generated' ? 'ai_generated' : 'manual',
      cash_amount: hasGift ? amount : null,
      fee_amount: hasGift ? calcFee(amount) : null,
      status: 'scheduled',
      scheduled_send_at: sendAt.toISOString(),
    });

    if (error) {
      setSending(false);
      Alert.alert('Could not send gift', error.message);
      return;
    }

    // The hundredth gift ever sent earns a once-in-a-lifetime moment
    const { count } = await supabase
      .from('gifts')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', user.id);

    setSending(false);
    router.replace({
      pathname: '/send/success',
      params: {
        recipientName: params.recipientName,
        ...(count === 100 ? { centieme: '1' } : {}),
      },
    });
  }

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <SendFlowHeader
            step={6}
            title="Review your gift"
            onBack={() => router.back()}
          />

          <View style={styles.card}>
            <SummaryRow
              label="TO"
              value={params.recipientName || '—'}
              onEdit={() => editStep('/send/recipient')}
            />
            <View style={styles.rowSep} />
            <SummaryRow
              label="OCCASION"
              value={OCCASION_LABELS[params.occasion] || params.occasion || '—'}
              onEdit={() => editStep('/send/occasion')}
            />
            <View style={styles.rowSep} />
            <SummaryRow
              label="MESSAGE"
              value={msgPreview || '—'}
              onEdit={() => editStep('/send/message')}
              multiline
            />
            <View style={styles.rowSep} />
            <SummaryRow
              label="PHOTO"
              value={hasPhoto ? 'Photo attached' : 'No photo'}
              onEdit={() => editStep('/send/photo')}
            />
            <View style={styles.rowSep} />
            <SummaryRow
              label="GIFT"
              value={
                hasGift
                  ? `$${amount.toFixed(2)}${isLuckyAmount(params.giftAmount) ? ' ✨' : ''}`
                  : 'No cash gift'
              }
              onEdit={() => editStep('/send/gift')}
            />
          </View>

          {/* Delivery timing */}
          <View style={styles.deliveryCard}>
            <Text style={styles.deliveryLabel}>DELIVERY</Text>
            <View style={styles.deliveryToggle}>
              <TouchableOpacity
                style={[styles.deliveryOpt, sendMode === 'now' && styles.deliveryOptActive]}
                onPress={() => setSendMode('now')}
                activeOpacity={0.7}
              >
                <Text style={[styles.deliveryOptText, sendMode === 'now' && styles.deliveryOptTextActive]}>
                  Send now
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deliveryOpt, sendMode === 'date' && styles.deliveryOptActive]}
                onPress={() => setSendMode('date')}
                activeOpacity={0.7}
              >
                <Text style={[styles.deliveryOptText, sendMode === 'date' && styles.deliveryOptTextActive]}>
                  Send on a date
                </Text>
              </TouchableOpacity>
            </View>

            {sendMode === 'date' && (
              <View style={styles.dateRow}>
                <TextInput
                  style={[styles.dateInput, styles.dateSegment]}
                  placeholder="MM"
                  placeholderTextColor={Brand.muted}
                  selectionColor={Brand.gold}
                  value={sdMonth}
                  onChangeText={v => {
                    const n = v.replace(/\D/g, '').slice(0, 2);
                    setSdMonth(n);
                    if (n.length === 2) sdDayRef.current?.focus();
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  returnKeyType="next"
                />
                <Text style={styles.dateSep}>/</Text>
                <TextInput
                  ref={sdDayRef}
                  style={[styles.dateInput, styles.dateSegment]}
                  placeholder="DD"
                  placeholderTextColor={Brand.muted}
                  selectionColor={Brand.gold}
                  value={sdDay}
                  onChangeText={v => {
                    const n = v.replace(/\D/g, '').slice(0, 2);
                    setSdDay(n);
                    if (n.length === 2) sdYearRef.current?.focus();
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  returnKeyType="next"
                />
                <Text style={styles.dateSep}>/</Text>
                <TextInput
                  ref={sdYearRef}
                  style={[styles.dateInput, styles.dateYear]}
                  placeholder="YYYY"
                  placeholderTextColor={Brand.muted}
                  selectionColor={Brand.gold}
                  value={sdYear}
                  onChangeText={v => setSdYear(v.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  maxLength={4}
                  returnKeyType="done"
                />
                <Text style={styles.dateHint}>delivered at 9:00 AM</Text>
              </View>
            )}
          </View>

          {/* REPLACE WITH CUSTOM ASSET LATER */}
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (sending || !scheduleValid) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={sending || !scheduleValid}
            activeOpacity={0.85}
          >
            {sending
              ? <ActivityIndicator color="#1B3A2B" />
              : <Text style={styles.sendBtnText}>Send with Love ♥</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

function SummaryRow({
  label, value, onEdit, multiline,
}: {
  label: string; value: string; onEdit: () => void; multiline?: boolean;
}) {
  return (
    <View style={sumStyles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={sumStyles.label}>{label}</Text>
        <Text style={sumStyles.value} numberOfLines={multiline ? 3 : 1}>{value}</Text>
      </View>
      <TouchableOpacity onPress={onEdit} activeOpacity={0.7}>
        <Text style={sumStyles.edit}>Edit</Text>
      </TouchableOpacity>
    </View>
  );
}

const sumStyles = StyleSheet.create({
  row:   { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  label: { color: 'rgba(212,175,55,0.55)', fontSize: 10, letterSpacing: 1.5 },
  value: { color: Brand.cream, fontSize: 15, lineHeight: 21 },
  edit:  { color: Brand.gold, fontSize: 13, fontWeight: '600', paddingTop: 18 },
});

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { padding: 20, gap: 20, paddingBottom: 40 },
  card: {
    backgroundColor: 'rgba(36, 51, 39, 0.85)',
    borderWidth: 1, borderColor: Brand.greenBorder,
    borderRadius: 14, overflow: 'hidden',
  },
  rowSep:  { height: 1, backgroundColor: Brand.greenBorder, marginHorizontal: 16 },

  deliveryCard: {
    backgroundColor: 'rgba(36, 51, 39, 0.85)',
    borderWidth: 1, borderColor: Brand.greenBorder,
    borderRadius: 14, padding: 16, gap: 12,
  },
  deliveryLabel: { color: 'rgba(212,175,55,0.55)', fontSize: 10, letterSpacing: 1.5 },
  deliveryToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(28, 43, 30, 0.7)',
    borderRadius: 10, padding: 4, gap: 4,
  },
  deliveryOpt:       { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  deliveryOptActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.4)',
  },
  deliveryOptText:       { color: Brand.muted, fontSize: 13, fontWeight: '600' },
  deliveryOptTextActive: { color: Brand.gold },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateInput: {
    backgroundColor: 'rgba(28, 43, 30, 0.7)',
    borderWidth: 1, borderColor: Brand.greenBorder,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9,
    fontSize: 15, color: Brand.cream, textAlign: 'center',
  },
  dateSegment: { width: 52 },
  dateYear:    { width: 72 },
  dateSep:     { color: Brand.muted, fontSize: 16 },
  dateHint:    { color: Brand.muted, fontSize: 11, fontStyle: 'italic', flex: 1, textAlign: 'right' },
  sendBtn: {
    height: 56, backgroundColor: '#D4AF37',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: '#1B3A2B', fontSize: 17, fontWeight: '700', letterSpacing: 1.5 },
});
