import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, ImageBackground, TextInput, Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Brand } from '@/constants/brand';
import { BottomNavBar } from '@/components/BottomNavBar';

const BG = require('../../../assets/background.png');
const ADD_BUTTON = require('../../../assets/images/nav/add.png');

interface Contact {
  id: string; display_name: string; email: string | null;
  phone: string | null; birthday: string | null; relation: string | null;
}

function daysUntilBirthday(birthday: string | null): number | null {
  if (!birthday) return null;
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [, m, d] = birthday.split('-').map(Number);
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next < todayMid) next = new Date(today.getFullYear() + 1, m - 1, d);
  return Math.ceil((next.getTime() - todayMid.getTime()) / 86400000);
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function ContactSubline({ contact }: { contact: Contact }) {
  const days = daysUntilBirthday(contact.birthday);
  const upcoming = days !== null && days <= 30;
  const base = contact.relation ?? contact.email ?? contact.phone ?? '';
  if (upcoming) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {base ? <Text style={sub.muted}>{base}</Text> : null}
        {base ? <Text style={sub.dot}>·</Text> : null}
        <Text style={sub.bday}>{days === 0 ? 'Today!' : `${days}d`}</Text>
      </View>
    );
  }
  return <Text style={sub.muted}>{base}</Text>;
}

const sub = StyleSheet.create({
  muted: { color: Brand.muted, fontSize: 13 },
  dot:   { color: Brand.muted, fontSize: 13 },
  bday:  { color: Brand.gold,  fontSize: 13, fontWeight: '600' },
});

export default function PeopleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]     = useState('');

  async function fetchContacts() {
    const { data } = await supabase
      .from('recipient_contacts')
      .select('id, display_name, email, phone, birthday, relation')
      .order('display_name', { ascending: true });
    setContacts(data ?? []);
  }

  // Refetch every time the screen gains focus so a just-added contact shows up
  useFocusEffect(
    useCallback(() => { fetchContacts().finally(() => setLoading(false)); }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchContacts();
    setRefreshing(false);
  }, []);

  const filtered = useMemo(() =>
    search.trim()
      ? contacts.filter(c =>
          c.display_name.toLowerCase().includes(search.toLowerCase()))
      : contacts,
    [contacts, search]
  );

  if (loading) {
    return (
      <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Brand.gold} />
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ flex: 1 }}>
        <View style={[styles.content, { paddingTop: insets.top }]}>

          <View style={styles.header}>
            <Text style={styles.title}>Your People</Text>
          </View>

          {/* Search bar */}
          <View style={styles.searchWrap}>
            <TextInput
              style={styles.search}
              placeholder="Search by name…"
              placeholderTextColor={Brand.muted}
              selectionColor={Brand.gold}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            contentContainerStyle={
              filtered.length === 0 ? styles.emptyContainer : styles.listContent
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.gold} />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>
                  {search ? 'No results' : 'No contacts yet'}
                </Text>
                <Text style={styles.emptySub}>
                  {search
                    ? 'Try a different name'
                    : "Add someone to start sending gifts that feel like they're from the heart."}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() => router.push(`/profile/${item.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(item.display_name)}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.display_name}</Text>
                  <ContactSubline contact={item} />
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
          />
        </View>

        {/* FAB — positioned above nav bar */}
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 80 + 16 }]}
          onPress={() => router.push('/contact/new')}
          activeOpacity={0.85}
        >
          <Image source={ADD_BUTTON} style={styles.fabImage} resizeMode="contain" />
        </TouchableOpacity>

        <BottomNavBar />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  content:    { flex: 1 },
  header:     { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  title:      { fontFamily: 'ui-serif', fontSize: 26, color: Brand.gold, letterSpacing: 1 },
  searchWrap: { paddingHorizontal: 20, paddingBottom: 8 },
  search: {
    backgroundColor: 'rgba(36, 51, 39, 0.85)',
    borderWidth: 1, borderColor: Brand.greenBorder,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: Brand.cream,
  },
  listContent:    { paddingBottom: 120 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  empty:          { alignItems: 'center', paddingHorizontal: 40, gap: 12, paddingVertical: 60 },
  emptyTitle:     { color: Brand.cream, fontSize: 18, fontFamily: 'ui-serif' },
  emptySub:       { color: Brand.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  row:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(36, 51, 39, 0.85)',
    borderWidth: 1, borderColor: Brand.greenBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Brand.gold, fontSize: 15, fontWeight: '600' },
  info:    { flex: 1, gap: 3 },
  name:    { color: Brand.cream, fontSize: 16 },
  chevron: { color: Brand.greenBorder, fontSize: 22 },
  sep:     { height: 1, backgroundColor: Brand.greenBorder, marginLeft: 78, opacity: 0.4 },
  fab: {
    position: 'absolute', right: 24,
    width: 62, height: 62,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8,
  },
  fabImage: { width: 62, height: 62 },
});
