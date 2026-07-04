import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Alert, Linking, Image,
  Dimensions, Modal,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { Brand } from '@/constants/brand';
import { useScreenshot } from '@/hooks/use-screenshot';

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

  const { ref: shotRef, capture, saving: capturingSave } = useScreenshot();
  const [contact, setContact] = useState<Contact | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);

  const fetchContact = useCallback(async () => {
    const { data } = await supabase
      .from('recipient_contacts')
      .select('id, display_name, email, phone, birthday, relation')
      .eq('id', id)
      .single();
    setContact(data ?? null);
  }, [id]);

  const fetchPhotos = useCallback(async () => {
    const { data } = await supabase.storage
      .from('contact-photos')
      .list(`${user!.id}/${id}`, { sortBy: { column: 'created_at', order: 'asc' } });

    if (!data?.length) { setPhotos([]); return; }

    const urls = await Promise.all(
      data.map(async file => {
        const { data: urlData } = await supabase.storage
          .from('contact-photos')
          .createSignedUrl(`${user!.id}/${id}/${file.name}`, 3600);
        return urlData?.signedUrl ?? null;
      })
    );
    setPhotos(urls.filter(Boolean) as string[]);
  }, [id, user]);

  useEffect(() => {
    Promise.all([fetchContact(), fetchPhotos()]).finally(() => setLoading(false));
  }, [fetchContact, fetchPhotos]);

  // ── Birthday helpers ──────────────────────────────────────────────────────

  function birthdayInfo(birthday: string | null): { label: string; days: number | null } | null {
    if (!birthday) return null;
    const [y, m, d] = birthday.split('-').map(Number);
    const today = new Date();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let next = new Date(today.getFullYear(), m - 1, d);
    if (next < todayMid) next = new Date(today.getFullYear() + 1, m - 1, d);
    const days = Math.ceil((next.getTime() - todayMid.getTime()) / 86400000);
    const turningYear = next.getFullYear();
    const age = turningYear - y;
    const month = next.toLocaleString('en-US', { month: 'long' });
    const day = d;
    return { label: `Turning ${age} on ${month} ${day}`, days };
  }

  // ── Photo actions ─────────────────────────────────────────────────────────

  async function handleAddPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access in Settings to add photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingPhoto(true);
    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop() ?? 'jpg';
    const filename = `${Date.now()}.${ext}`;
    const path = `${user!.id}/${id}/${filename}`;

    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    const { error } = await supabase.storage
      .from('contact-photos')
      .upload(path, arrayBuffer, { contentType: asset.mimeType ?? 'image/jpeg' });

    setUploadingPhoto(false);
    if (error) { Alert.alert('Upload failed', error.message); return; }
    await fetchPhotos();
  }

  async function handleDeletePhoto(url: string) {
    // Extract path from signed URL
    const match = url.match(/contact-photos\/([^?]+)/);
    if (!match) return;
    const path = match[1];
    const { error } = await supabase.storage.from('contact-photos').remove([path]);
    if (error) { Alert.alert('Delete failed', error.message); return; }
    setPhotos(prev => prev.filter(p => p !== url));
  }

  function confirmDelete(url: string) {
    Alert.alert('Remove photo', 'Remove this photo from the contact?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => handleDeletePhoto(url) },
    ]);
  }

  // ── Render ────────────────────────────────────────────────────────────────

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
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={capture} disabled={capturingSave} style={styles.saveBtn}>
            {capturingSave
              ? <ActivityIndicator color={Brand.gold} size="small" />
              : <Text style={styles.saveBtnText}>⬇</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/(app)/contact/${id}`)}>
            <Text style={styles.headerEdit}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ViewShot ref={shotRef} options={{ format: 'jpg', quality: 0.95 }} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Name & relation */}
        <View style={styles.nameBlock}>
          <Text style={styles.name}>{contact.display_name}</Text>
          {contact.relation
            ? <Text style={styles.relation}>{contact.relation}</Text>
            : null}
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

        {/* Photos */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <TouchableOpacity onPress={handleAddPhoto} disabled={uploadingPhoto}>
            {uploadingPhoto
              ? <ActivityIndicator color={Brand.gold} size="small" />
              : <Text style={styles.addPhotoBtn}>+ Add</Text>}
          </TouchableOpacity>
        </View>

        {photos.length === 0 ? (
          <Text style={styles.noPhotos}>No photos yet</Text>
        ) : (
          <View style={styles.photoGrid}>
            {photos.map(url => (
              <TouchableOpacity
                key={url}
                onPress={() => setFullscreenPhoto(url)}
                onLongPress={() => confirmDelete(url)}
                delayLongPress={500}
              >
                <Image source={{ uri: url }} style={styles.photoThumb} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Send Gift */}
        <TouchableOpacity
          style={styles.giftButton}
          onPress={() => router.push('/(app)/gift-coming-soon')}
          activeOpacity={0.85}
        >
          <Text style={styles.giftButtonText}>Send a Gift</Text>
        </TouchableOpacity>
      </ScrollView>
      </ViewShot>

      {/* Fullscreen photo viewer */}
      <Modal visible={!!fullscreenPhoto} transparent animationType="fade" onRequestClose={() => setFullscreenPhoto(null)}>
        <TouchableOpacity style={styles.fullscreenOverlay} activeOpacity={1} onPress={() => setFullscreenPhoto(null)}>
          {fullscreenPhoto && (
            <Image source={{ uri: fullscreenPhoto }} style={styles.fullscreenImage} resizeMode="contain" />
          )}
        </TouchableOpacity>
      </Modal>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  saveBtn: { width: 28, alignItems: 'center' },
  saveBtnText: { color: Brand.muted, fontSize: 16 },
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
  addPhotoBtn: { color: Brand.gold, fontSize: 14, fontWeight: '600' },
  noPhotos: { color: Brand.muted, fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  photoThumb: {
    width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 6,
    backgroundColor: Brand.greenMid,
  },
  giftButton: {
    backgroundColor: Brand.gold, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 16,
  },
  giftButtonText: { color: Brand.green, fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  fullscreenOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center',
  },
  fullscreenImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.2 },
});
