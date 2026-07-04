import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Alert, Linking, Image,
  Dimensions, Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { Brand } from '@/constants/brand';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_SIZE = Math.floor((SCREEN_WIDTH - 40 - 8) / 3);

interface Contact {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  relation: string | null;
}

export default function ContactProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);

  const fetchContact = useCallback(async () => {
    const { data } = await supabase
      .from('recipient_contacts')
      .select('id, display_name, email, phone, birthday, relation')
      .eq('id', id)
      .single();
    setContact(data ?? null);
  }, [id]);

  useEffect(() => {
    fetchContact().finally(() => setLoading(false));
  }, [fetchContact]);

  function birthdayInfo(birthday: string | null): { label: string; days: number | null } | null {
    if (!birthday) return null;
    const [y, m, d] = birthday.split('-').map(Number);
    const today = new Date();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let next = new Date(today.getFullYear(), m - 1, d);
    if (next < todayMid) next = new Date(today.getFullYear() + 1, m - 1, d);
    const days = Math.ceil((next.getTime() - todayMid.getTime()) / 86400000);
    const age = next.getFullYear() - y;
    const month = next.toLocaleString('en-US', { month: 'long' });
    return { label: `Turning ${age} on ${month} ${d}`, days };
  }

  if (loading || !contact) {
    return <View style={styles.centered}><ActivityIndicator color={Brand.gold} /></View>;
  }

  const bd = birthdayInfo(contact.birthday);
  const upcomingBirthday = bd && bd.days !== null && bd.days <= 30;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerBack}>‹ Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push(`/(app)/contact/${id}`)}>
          <Text style={styles.headerEdit}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Name & relation */}
        <View style={styles.nameBlock}>
          <Text style={styles.name}>{contact.display_name}</Text>
          {contact.relation ? <Text style={styles.relation}>{contact.relation}</Text> : null}
        </View>

        {/* Contact info */}
        <View style={styles.infoCard}>
          {contact.phone ? (
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => Linking.openURL(`tel:${contact.phone}`)}
            >
              <Text style={styles.infoLabel}>PHONE</Text>
              <Text style={styles.infoValue}>{contact.phone}</Text>
            </TouchableOpacity>
          ) : null}
          {contact.phone && contact.email ? <View style={styles.infoSep} /> : null}
          {contact.email ? (
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => Linking.openURL(`mailto:${contact.email}`)}
            >
              <Text style={styles.infoLabel}>EMAIL</Text>
              <Text style={styles.infoValue}>{contact.email}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Birthday */}
        {bd ? (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>BIRTHDAY</Text>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text style={styles.infoValue}>{bd.label}</Text>
                {upcomingBirthday && (
                  <Text style={styles.countdown}>
                    {bd.days === 0 ? 'Today! 🎂' : `${bd.days} days away`}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ) : null}

        {/* Photos — placeholder until EAS build with expo-image-picker */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Photos</Text>
        </View>
        <View style={styles.photosPlaceholder}>
          <Text style={styles.photosPlaceholderText}>Photos available after next build</Text>
        </View>

        {/* Send Gift */}
        <TouchableOpacity
          style={styles.giftButton}
          onPress={() => router.push('/(app)/gift-coming-soon')}
          activeOpacity={0.85}
        >
          <Text style={styles.giftButtonText}>Send a Gift</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.green },
  centered: { flex: 1, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Brand.greenBorder,
  },
  headerBack: { color: Brand.gold, fontSize: 17 },
  headerEdit: { color: Brand.gold, fontSize: 17 },
  scroll: { padding: 20, gap: 16, paddingBottom: 60 },
  nameBlock: { gap: 4, paddingBottom: 4 },
  name: { color: Brand.cream, fontSize: 28, fontFamily: 'ui-serif' },
  relation: { color: Brand.muted, fontSize: 15 },
  infoCard: {
    backgroundColor: Brand.greenMid, borderWidth: 1, borderColor: Brand.greenBorder,
    borderRadius: 12, overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  infoSep: { height: 1, backgroundColor: Brand.greenBorder, marginHorizontal: 16 },
  infoLabel: { color: Brand.muted, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  infoValue: { color: Brand.cream, fontSize: 15 },
  countdown: { color: Brand.gold, fontSize: 12, fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 8,
  },
  sectionTitle: { color: Brand.muted, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' },
  photosPlaceholder: {
    backgroundColor: Brand.greenMid, borderWidth: 1, borderColor: Brand.greenBorder,
    borderRadius: 12, paddingVertical: 28, alignItems: 'center',
  },
  photosPlaceholderText: { color: Brand.muted, fontSize: 13 },
  giftButton: {
    backgroundColor: Brand.gold, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  giftButtonText: { color: Brand.green, fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
});
