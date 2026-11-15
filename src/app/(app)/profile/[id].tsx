import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Linking, ImageBackground, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNavBar } from '@/components/BottomNavBar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { Brand } from '@/constants/brand';
import { Lux, SERIF, LuxButton, LuxBackHeader, LuxInitials } from '@/components/lux';

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
  const insets = useSafeAreaInsets();

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

  const bg = require('../../../../assets/background.png');

  if (loading || !contact) {
    return (
      <ImageBackground source={bg} style={{ flex: 1 }} resizeMode="cover">
        <View style={styles.centered}><ActivityIndicator color={Brand.gold} /></View>
      </ImageBackground>
    );
  }

  const bd = birthdayInfo(contact.birthday);
  const upcomingBirthday = bd && bd.days !== null && bd.days <= 30;

  return (
    <ImageBackground source={bg} style={{ flex: 1 }} resizeMode="cover">
    <View style={{ flex: 1 }}>
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LuxBackHeader
        onBack={() => router.back()}
        actionLabel="Edit"
        onAction={() => router.push(`/(app)/contact/${id}`)}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Name & relation */}
        <View style={styles.nameBlock}>
          <View style={styles.avatarRing}>
            <LuxInitials name={contact.display_name} size={84} />
          </View>
          <Text style={styles.name} maxFontSizeMultiplier={1.25}>{contact.display_name}</Text>
          {contact.relation ? (
            <Text style={styles.relation} maxFontSizeMultiplier={1.25}>
              {contact.relation.toUpperCase()}
            </Text>
          ) : null}
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
                    {bd.days === 0 ? 'Today!' : bd.days === 1 ? 'Tomorrow' : `${bd.days} days away`}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ) : null}

        <LuxButton
          title="Send a gift"
          chevron
          onPress={() =>
            router.push({
              pathname: '/send/recipient',
              params: { prefilledId: id, prefilledName: contact.display_name },
            })
          }
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </View>
    <BottomNavBar />
    </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 22, gap: 14, paddingBottom: 60 },
  nameBlock: { alignItems: 'center', gap: 6, paddingTop: 4, paddingBottom: 8 },
  avatarRing: {
    padding: 5, borderRadius: 52, marginBottom: 6,
    borderWidth: 1.5, borderColor: Lux.gold,
  },
  name: { color: Lux.cream, fontSize: 28, fontFamily: SERIF, textAlign: 'center' },
  relation: { color: 'rgba(217,180,90,0.8)', fontSize: 11, letterSpacing: 2.5 },
  infoCard: {
    backgroundColor: Lux.glass, borderWidth: 1, borderColor: Lux.hairline,
    borderRadius: 16, overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 15, gap: 12,
  },
  infoSep: { height: 1, backgroundColor: Lux.hairline, marginHorizontal: 18 },
  infoLabel: { color: 'rgba(217,180,90,0.75)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  infoValue: { color: Lux.cream, fontSize: 16, fontFamily: SERIF, flexShrink: 1, textAlign: 'right' },
  countdown: { color: Lux.goldBright, fontSize: 11, letterSpacing: 1.2 },
});
