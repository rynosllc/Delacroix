import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { Brand } from '@/constants/brand';

interface Contact {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  relation: string | null;
}

export default function AddressBookScreen() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchContacts() {
    const { data } = await supabase
      .from('recipient_contacts')
      .select('id, display_name, email, phone, birthday, relation')
      .order('display_name', { ascending: true });
    setContacts(data ?? []);
  }

  useEffect(() => {
    fetchContacts().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchContacts();
    setRefreshing(false);
  }, []);

  function daysUntilBirthday(birthday: string | null): number | null {
    if (!birthday) return null;
    const today = new Date();
    const [, m, d] = birthday.split('-').map(Number);
    let next = new Date(today.getFullYear(), m - 1, d);
    if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
    const diff = Math.ceil((next.getTime() - today.setHours(0, 0, 0, 0)) / 86400000);
    return diff;
  }

  function initials(name: string) {
    return name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Brand.gold} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.wordmark}>DeLacroix</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Your People</Text>

      <FlatList
        data={contacts}
        keyExtractor={item => item.id}
        contentContainerStyle={contacts.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Brand.gold}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No contacts yet</Text>
            <Text style={styles.emptySubtitle}>
              Add someone to start sending gifts that feel like they're from the heart.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => router.push(`/(app)/contact/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(item.display_name)}</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{item.display_name}</Text>
              <ContactSubline contact={item} />
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(app)/contact/new')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function ContactSubline({ contact }: { contact: Contact }) {
  const days = daysUntilBirthday(contact.birthday);
  const upcomingBirthday = days !== null && days <= 30;

  const base = contact.relation ?? contact.email ?? contact.phone ?? '';

  if (upcomingBirthday) {
    const countdown = days === 0 ? 'Today!' : `${days}d`;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {base ? <Text style={sublineStyles.muted}>{base}</Text> : null}
        {base ? <Text style={sublineStyles.dot}>·</Text> : null}
        <Text style={sublineStyles.birthday}>{countdown}</Text>
      </View>
    );
  }

  return <Text style={sublineStyles.muted}>{base}</Text>;
}

const sublineStyles = StyleSheet.create({
  muted: { color: Brand.muted, fontSize: 13 },
  dot: { color: Brand.muted, fontSize: 13 },
  birthday: { color: Brand.gold, fontSize: 13, fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.green,
  },
  centered: {
    flex: 1,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  wordmark: {
    fontFamily: 'ui-serif',
    fontSize: 20,
    color: Brand.gold,
    letterSpacing: 1.5,
  },
  signOutText: {
    color: Brand.muted,
    fontSize: 13,
  },
  sectionTitle: {
    color: Brand.muted,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    color: Brand.cream,
    fontSize: 18,
    fontFamily: 'ui-serif',
  },
  emptySubtitle: {
    color: Brand.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.greenMid,
    borderWidth: 1,
    borderColor: Brand.greenBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Brand.gold,
    fontSize: 15,
    fontWeight: '600',
  },
  contactInfo: {
    flex: 1,
    gap: 3,
  },
  contactName: {
    color: Brand.cream,
    fontSize: 16,
  },
  contactSub: {
    color: Brand.muted,
    fontSize: 13,
  },
  chevron: {
    color: Brand.greenBorder,
    fontSize: 22,
  },
  separator: {
    height: 1,
    backgroundColor: Brand.greenBorder,
    marginLeft: 78,
    opacity: 0.4,
  },
  fab: {
    position: 'absolute',
    bottom: 36,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    color: Brand.green,
    fontSize: 28,
    lineHeight: 32,
  },
});
