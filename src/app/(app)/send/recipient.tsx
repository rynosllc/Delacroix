import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, ImageBackground, TextInput, Image,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Brand } from '@/constants/brand';
import { SendFlowHeader } from '@/components/SendFlowHeader';

const BG = require('../../../../assets/background.png');
const ADD_BUTTON = require('../../../../assets/images/nav/add.png');

interface Contact {
  id: string; display_name: string; relation: string | null; email: string | null;
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function RecipientStep() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prefilledId?: string; prefilledName?: string }>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  // Refetch every time the screen gains focus so a just-added contact shows up
  useFocusEffect(
    useCallback(() => {
      supabase
        .from('recipient_contacts')
        .select('id, display_name, relation, email')
        .order('display_name', { ascending: true })
        .then(({ data }) => { setContacts(data ?? []); setLoading(false); });
    }, [])
  );

  const filtered = search.trim()
    ? contacts.filter(c => c.display_name.toLowerCase().includes(search.toLowerCase()))
    : contacts;

  function select(contact: Contact) {
    router.push({
      pathname: '/send/occasion',
      params: { recipientId: contact.id, recipientName: contact.display_name },
    });
  }

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <SendFlowHeader
          step={1}
          title="Who are you gifting?"
          onBack={() => router.push('/')}
        />

        <TextInput
          style={styles.search}
          placeholder="Search contacts…"
          placeholderTextColor={Brand.muted}
          selectionColor={Brand.gold}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={Brand.gold} /></View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.empty}>No contacts found</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => select(item)} activeOpacity={0.7}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(item.display_name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.display_name}</Text>
                  {item.relation && <Text style={styles.sub}>{item.relation}</Text>}
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            ListFooterComponent={
              <TouchableOpacity
                style={styles.addNew}
                onPress={() => router.push('/contact/new')}
                activeOpacity={0.7}
              >
                <Image source={ADD_BUTTON} style={styles.addNewIcon} resizeMode="contain" />
                <Text style={styles.addNewText}>Add new person</Text>
              </TouchableOpacity>
            }
          />
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  search: {
    marginHorizontal: 20, marginBottom: 8,
    backgroundColor: 'rgba(36, 51, 39, 0.85)',
    borderWidth: 1, borderColor: Brand.greenBorder,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: Brand.cream,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { paddingBottom: 40 },
  empty:  { color: Brand.muted, textAlign: 'center', marginTop: 40, fontStyle: 'italic' },
  row:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(36, 51, 39, 0.85)',
    borderWidth: 1, borderColor: Brand.greenBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Brand.gold, fontSize: 15, fontWeight: '600' },
  name:    { color: Brand.cream, fontSize: 16 },
  sub:     { color: Brand.muted, fontSize: 13, marginTop: 1 },
  chevron: { color: Brand.greenBorder, fontSize: 22 },
  sep:     { height: 1, backgroundColor: Brand.greenBorder, marginLeft: 78, opacity: 0.4 },
  addNew: {
    margin: 20, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderTopWidth: 1, borderTopColor: Brand.greenBorder,
  },
  addNewIcon: { width: 26, height: 26 },
  addNewText: { color: Brand.gold, fontSize: 15 },
});
