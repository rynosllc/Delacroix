import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';

export function useScreenshot() {
  const ref = useRef<ViewShot>(null);
  const [saving, setSaving] = useState(false);

  async function capture() {
    if (saving) return;
    try {
      setSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access in Settings to save screenshots.');
        return;
      }
      const uri = await (ref.current as any).capture();
      await MediaLibrary.saveToLibraryAsync(uri);
    } catch {
      Alert.alert('Error', 'Could not save screenshot.');
    } finally {
      setSaving(false);
    }
  }

  return { ref, capture, saving };
}
