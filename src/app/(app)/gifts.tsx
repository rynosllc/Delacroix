import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ImageBackground,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { Brand } from '@/constants/brand';
import { BottomNavBar } from '@/components/BottomNavBar';

const BG = require('../../../assets/background.png');

const TABS = ['SENT', 'RECEIVED', 'SCHEDULED'] as const;
type Tab = typeof TABS[number];

const EMPTY_STATES: Record<Tab, { icon: string; text: string }> = {
  SENT:      { icon: '🎁', text: 'Your sent gifts will appear here' },
  RECEIVED:  { icon: '💝', text: 'Gifts you claim while signed in will appear here' },
  SCHEDULED: { icon: '📅', text: 'Gifts waiting for their moment will appear here' },
};

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

interface GiftRow {
  id: string;
  sender_id: string;
  template_id: string;
  cash_amount: number | null;
  status: string;
  created_at: string;
  scheduled_send_at: string;
  thank_you_message: string | null;
  recipient_contacts: { display_name: string } | null;
  users: { display_name: string } | null;
}

export default function GiftsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('SENT');
  const [gifts, setGifts] = useState<GiftRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // RLS returns the union of gifts I sent and gifts I claimed; the tabs
  // slice that client-side.
  async function fetchGifts() {
    const { data } = await supabase
      .from('gifts')
      .select('id, sender_id, template_id, cash_amount, status, created_at, scheduled_send_at, thank_you_message, recipient_contacts(display_name), users!gifts_sender_id_fkey(display_name)')
      .order('created_at', { ascending: false });
    setGifts((data as unknown as GiftRow[]) ?? []);
  }

  // Refetch every time the screen gains focus so a just-sent gift shows up
  useFocusEffect(
    useCallback(() => {
      fetchGifts().finally(() => setLoading(false));
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGifts();
    setRefreshing(false);
  }, []);

  const mine = user?.id;
  const visible = gifts.filter(g => {
    if (activeTab === 'SENT') return g.sender_id === mine;
    if (activeTab === 'RECEIVED') return g.sender_id !== mine;
    return g.sender_id === mine && g.status === 'scheduled';
  });

  const { icon, text } = EMPTY_STATES[activeTab];

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ flex: 1 }}>
        <View style={[styles.content, { paddingTop: insets.top }]}>

          <View style={styles.header}>
            <Text style={styles.title}>Your Gifts</Text>
          </View>

          {/* Tab bar */}
          <View style={styles.tabBar}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab}
                style={styles.tabBtn}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                  {tab}
                </Text>
                {activeTab === tab && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={Brand.gold} />
            </View>
          ) : visible.length > 0 ? (
            <FlatList
              data={visible}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.gold} />
              }
              renderItem={({ item }) => {
                const received = item.sender_id !== mine;
                const counterparty = received
                  ? `From ${item.users?.display_name ?? 'someone'}`
                  : item.recipient_contacts?.display_name ?? 'Unknown recipient';
                return (
                  <TouchableOpacity
                    style={styles.giftCard}
                    onPress={() => router.push({ pathname: '/gift/[id]', params: { id: item.id } })}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={styles.giftRecipient}>{counterparty}</Text>
                      <Text style={styles.giftMeta}>
                        {OCCASION_LABELS[item.template_id] ?? item.template_id}
                        {item.cash_amount ? `  ·  $${Number(item.cash_amount).toFixed(2)}` : ''}
                      </Text>
                      {/* A thank-you in French earns a quiet wax seal */}
                      {!received && /merci/i.test(item.thank_you_message ?? '') && (
                        <View style={styles.merciRow}>
                          <View style={styles.merciSeal}>
                            <Text style={styles.merciSealHeart}>♥</Text>
                          </View>
                          <Text style={styles.merciText}>Merci mille fois</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.badge, { borderColor: STATUS_COLORS[item.status] ?? Brand.muted }]}>
                      <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] ?? Brand.muted }]}>
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{icon}</Text>
              <Text style={styles.emptyText}>{text}</Text>
            </View>
          )}

        </View>
        <BottomNavBar />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  header:  { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title:   { fontFamily: 'ui-serif', fontSize: 26, color: Brand.gold, letterSpacing: 1 },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: Brand.greenBorder,
    marginHorizontal: 20, marginBottom: 8,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabLabel:       { color: Brand.muted,  fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  tabLabelActive: { color: Brand.gold },
  tabUnderline: {
    position: 'absolute', bottom: 0, left: '15%', right: '15%',
    height: 2, backgroundColor: Brand.gold, borderRadius: 1,
  },

  list: { padding: 20, paddingTop: 12, paddingBottom: 40 },
  giftCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(36, 51, 39, 0.85)',
    borderWidth: 1, borderColor: Brand.greenBorder,
    borderRadius: 12, padding: 16,
  },
  giftRecipient: { color: Brand.cream, fontSize: 16 },
  giftMeta:      { color: Brand.muted, fontSize: 13 },
  merciRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  merciSeal: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#7A2230',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  merciSealHeart: { color: '#E8C97A', fontSize: 8, lineHeight: 10 },
  merciText:      { color: 'rgba(212,175,55,0.75)', fontSize: 11, fontStyle: 'italic' },
  badge: {
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  chevron:   { color: Brand.greenBorder, fontSize: 22 },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 40 },
  emptyIcon:  { fontSize: 44, opacity: 0.45 },
  emptyText:  { color: Brand.muted, fontSize: 14, textAlign: 'center', lineHeight: 20, fontStyle: 'italic' },
});
