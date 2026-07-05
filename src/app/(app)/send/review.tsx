import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ImageBackground, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Brand } from '@/constants/brand';
import { SendFlowHeader } from '@/components/SendFlowHeader';

const BG = require('../../../../assets/background.png');

const OCCASION_LABELS: Record<string, string> = {
  birthday:     'Birthday',
  anniversary:  'Anniversary',
  thank_you:    'Thank You',
  just_because: 'Just Because',
};

export default function ReviewStep() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    recipientId: string; recipientName: string; occasion: string;
    message: string; photoUri: string; giftAmount: string;
  }>();

  const hasPhoto  = !!params.photoUri;
  const hasGift   = !!params.giftAmount && parseFloat(params.giftAmount) >= 5;
  const msgPreview = params.message?.length > 80
    ? params.message.slice(0, 80) + '…'
    : params.message;

  function editStep(pathname: string) {
    router.push({ pathname: pathname as any, params });
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
              value={hasGift ? `$${parseFloat(params.giftAmount).toFixed(2)}` : 'No cash gift'}
              onEdit={() => editStep('/send/gift')}
            />
          </View>

          {/* REPLACE WITH CUSTOM ASSET LATER */}
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={() => {
              // Not connected to Stripe yet — placeholder
              router.push('/');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.sendBtnText}>Send with Love ♥</Text>
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
  sendBtnText: { color: '#1B3A2B', fontSize: 17, fontWeight: '700', letterSpacing: 1.5 },
});
