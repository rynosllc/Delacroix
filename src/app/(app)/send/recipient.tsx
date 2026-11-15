import { useCallback, useEffect, useState } from 'react';
import {
  View, FlatList, StyleSheet,
  SafeAreaView, ActivityIndicator, ImageBackground, TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { SendFlowHeader } from '@/components/SendFlowHeader';
import { Lux, T, LuxRow, LuxButton, luxStyles } from '@/components/lux';

const BG = require('../../../../assets/background.png');

interface Contact {
  id: string; display_name: string; relation: string | null; email: string | null;
}

export default function RecipientStep() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    prefilledId?: string; prefilledName?: string; returnTo?: string;
  }>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  // "Send Gift" shortcuts (home moment card, contact profile) preselect the
  // recipient — skip straight to the occasion step.
  useEffect(() => {
    if (params.prefilledId && params.prefilledName) {
      router.replace({
        pathname: '/send/occasion',
        params: { recipientId: params.prefilledId, recipientName: params.prefilledName },
      });
    }
  }, [params.prefilledId]);

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
    const { returnTo, prefilledId, prefilledName, ...rest } = params;
    if (returnTo === 'review') {
      router.replace({
        pathname: '/send/review',
        params: { ...rest, recipientId: contact.id, recipientName: contact.display_name },
      });
      return;
    }
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
          onBack={() => router.back()}
        />

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={17} color={Lux.gold} />
          <TextInput
            style={styles.search}
            placeholder="Search your people"
            placeholderTextColor={Lux.faint}
            selectionColor={Lux.gold}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            maxFontSizeMultiplier={1.25}
          />
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={Lux.gold} /></View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <T style={[luxStyles.hint, { marginVertical: 28 }]}>
                {search ? 'No one by that name yet' : 'Add your first person to begin'}
              </T>
            }
            renderItem={({ item }) => (
              <LuxRow
                title={item.display_name}
                sub={item.relation ?? undefined}
                initialsOf={item.display_name}
                onPress={() => select(item)}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListFooterComponent={
              <LuxButton
                title="Add new person"
                variant="outline"
                onPress={() => router.push('/contact/new')}
                style={{ marginTop: 18 }}
              />
            }
          />
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  searchWrap: {
    ...luxStyles.input,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 22, marginBottom: 14, paddingVertical: 0, height: 48,
  },
  search: { flex: 1, fontSize: 16, color: Lux.cream, height: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { paddingHorizontal: 22, paddingBottom: 40 },
});
