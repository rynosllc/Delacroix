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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Lux, SERIF, LuxTitle, LuxInitials } from '@/components/lux';

const BG = require('../../../assets/background.png');

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

          <LuxTitle>Your People</LuxTitle>

          {/* Search bar */}
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={17} color={Lux.gold} />
            <TextInput
              style={styles.search}
              placeholder="Search by name"
              placeholderTextColor={Lux.faint}
              maxFontSizeMultiplier={1.25}
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
                <LuxInitials name={item.display_name} />
                <View style={styles.rowDivider} />
                <View style={styles.info}>
                  <Text style={styles.name} maxFontSizeMultiplier={1.25} numberOfLines={1}>
                    {item.display_name}
                  </Text>
                  <ContactSubline contact={item} />
                </View>
                <Ionicons name="chevron-forward" size={16} color={Lux.gold} />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        </View>

        {/* FAB — positioned above nav bar */}
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 100 }]}
          onPress={() => router.push('/contact/new')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Add a person"
        >
          <LinearGradient
            colors={['#F6E3A1', '#DDBB5C', '#B98F38']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.fabFace}
          >
            <Ionicons name="add" size={30} color={Lux.ink} />
          </LinearGradient>
        </TouchableOpacity>

        <BottomNavBar />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  content:    { flex: 1 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 22, marginBottom: 14, height: 48,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1, borderColor: 'rgba(217,180,90,0.38)',
    borderRadius: 14, paddingHorizontal: 16,
  },
  search: { flex: 1, height: '100%', fontSize: 16, color: Lux.cream },
  listContent:    { paddingHorizontal: 22, paddingBottom: 120 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  empty:          { alignItems: 'center', paddingHorizontal: 40, gap: 12, paddingVertical: 60 },
  emptyTitle:     { color: Lux.cream, fontSize: 20, fontFamily: SERIF },
  emptySub:       { color: Lux.muted, fontSize: 14, textAlign: 'center', lineHeight: 21, fontStyle: 'italic', fontFamily: SERIF },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Lux.glass,
    borderWidth: 1, borderColor: Lux.hairline,
    borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, minHeight: 62,
  },
  rowDivider: { width: 1, height: 30, backgroundColor: 'rgba(217,180,90,0.55)' },
  info:    { flex: 1, gap: 3 },
  name:    { color: Lux.cream, fontSize: 17, fontFamily: SERIF },
  fab: {
    position: 'absolute', right: 24,
    width: 58, height: 58, borderRadius: 29,
    shadowColor: '#E9C766', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  fabFace: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FBEBB5',
  },
});
