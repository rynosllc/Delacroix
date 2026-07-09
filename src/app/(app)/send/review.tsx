import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ImageBackground, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { Brand } from '@/constants/brand';
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

  const hasPhoto  = !!params.photoUri;
  const amount    = parseFloat(params.giftAmount) || 0;
  const hasGift   = amount >= 5;
  const msgPreview = params.message?.length > 80
    ? params.message.slice(0, 80) + '…'
    : params.message;

  function editStep(pathname: string) {
    router.push({ pathname: pathname as any, params });
  }

  async function handleSend() {
    if (!user) return;
    if (!params.recipientId || !params.occasion || !params.message) {
      Alert.alert('Missing details', 'Please complete all steps before sending.');
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
      scheduled_send_at: new Date().toISOString(),
    });

    setSending(false);
    if (error) {
      Alert.alert('Could not send gift', error.message);
      return;
    }
    router.replace({
      pathname: '/send/success',
      params: { recipientName: params.recipientName },
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
              value={hasGift ? `$${amount.toFixed(2)}` : 'No cash gift'}
              onEdit={() => editStep('/send/gift')}
            />
          </View>

          {/* REPLACE WITH CUSTOM ASSET LATER */}
          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={sending}
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
  sendBtn: {
    height: 56, backgroundColor: '#D4AF37',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: '#1B3A2B', fontSize: 17, fontWeight: '700', letterSpacing: 1.5 },
});
