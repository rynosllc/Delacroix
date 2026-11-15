import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';

const BUCKET = 'gift-photos';
const MAX_WIDTH = 1600;

export type PickResult =
  | { uri: string }
  | { canceled: true }
  | { error: string };

// Opens the camera or the photo library and returns a gift-ready JPEG:
// scaled down and re-encoded, which also drops location and other metadata
// the original file may carry.
export async function pickGiftPhoto(source: 'camera' | 'library'): Promise<PickResult> {
  try {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        return { error: 'Camera access is off. You can turn it on for DeLacroix in Settings.' };
      }
    }
    const picked = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (picked.canceled || !picked.assets?.[0]) return { canceled: true };

    const asset = picked.assets[0];
    const ctx = ImageManipulator.manipulate(asset.uri);
    if (asset.width > MAX_WIDTH) ctx.resize({ width: MAX_WIDTH });
    const rendered = await ctx.renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
    return { uri: saved.uri };
  } catch {
    return { error: 'That photo could not be opened. Please try another.' };
  }
}

// Uploads a prepared photo into the sender's own folder and returns its
// storage path (what gets saved on the gift).
export async function uploadGiftPhoto(userId: string, uri: string): Promise<string> {
  const body = await fetch(uri).then(res => res.arrayBuffer());
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

export async function removeGiftPhoto(path: string | null | undefined): Promise<void> {
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
}
