import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ImageBackground, TextInput, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Brand } from '@/constants/brand';
import { SendFlowHeader } from '@/components/SendFlowHeader';

const BG = require('../../../../assets/background.png');

const AI_PROMPTS = [
  "What makes them special?",
  "What do you want them to feel?",
  "Share a memory together",
] as const;

const SAMPLE_MESSAGE =
  "Thinking of you today and every day. You bring so much warmth and light to everyone around you — I hope this small gift carries all the love and gratitude I have for you. 💛";

export default function MessageStep() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    recipientId: string; recipientName: string; occasion: string;
  }>();

  const [tab, setTab] = useState<'self' | 'ai'>('self');
  const [message, setMessage] = useState('');
  const [aiAnswers, setAiAnswers] = useState<Record<string, string>>({});
  const [generated, setGenerated] = useState('');

  function handleGenerate() {
    // AI not connected yet — show sample message
    setGenerated(SAMPLE_MESSAGE);
    setMessage(SAMPLE_MESSAGE);
  }

  function onNext() {
    const finalMsg = message.trim() || generated.trim();
    router.push({
      pathname: '/send/photo',
      params: { ...params, message: finalMsg },
    });
  }

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SendFlowHeader
            step={3}
            title="Your message"
            onBack={() => router.back()}
          />

          {/* Tab toggle */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'self' && styles.tabBtnActive]}
              onPress={() => setTab('self')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabLabel, tab === 'self' && styles.tabLabelActive]}>
                Write it myself
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'ai' && styles.tabBtnActive]}
              onPress={() => setTab('ai')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabLabel, tab === 'ai' && styles.tabLabelActive]}>
                Help me write it
              </Text>
            </TouchableOpacity>
          </View>

          {tab === 'self' ? (
            <TextInput
              style={styles.textArea}
              placeholder="Write your personal message here…"
              placeholderTextColor={Brand.muted}
              selectionColor={Brand.gold}
              multiline
              numberOfLines={6}
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
            />
          ) : (
            <View style={styles.aiSection}>
              <Text style={styles.aiHint}>Answer a few prompts and we'll craft a message:</Text>
              {AI_PROMPTS.map(prompt => (
                <View key={prompt} style={styles.aiPromptBlock}>
                  {/* REPLACE WITH CUSTOM ASSET LATER */}
                  <Text style={styles.aiPromptLabel}>{prompt}</Text>
                  <TextInput
                    style={styles.aiInput}
                    placeholder="Your answer…"
                    placeholderTextColor={Brand.muted}
                    selectionColor={Brand.gold}
                    value={aiAnswers[prompt] ?? ''}
                    onChangeText={v => setAiAnswers(p => ({ ...p, [prompt]: v }))}
                  />
                </View>
              ))}

              {/* REPLACE WITH CUSTOM ASSET LATER */}
              <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} activeOpacity={0.85}>
                <Text style={styles.generateBtnText}>Generate Message</Text>
              </TouchableOpacity>

              {generated ? (
                <View style={styles.generatedCard}>
                  <Text style={styles.generatedLabel}>YOUR MESSAGE</Text>
                  <TextInput
                    style={styles.generatedText}
                    multiline
                    value={message || generated}
                    onChangeText={setMessage}
                    selectionColor={Brand.gold}
                    textAlignVertical="top"
                  />
                </View>
              ) : null}
            </View>
          )}

          {/* REPLACE WITH CUSTOM ASSET LATER */}
          <TouchableOpacity
            style={[styles.nextBtn, !(message || generated) && styles.nextBtnDisabled]}
            onPress={onNext}
            disabled={!message && !generated}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>Next</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(36, 51, 39, 0.7)',
    borderRadius: 10, padding: 4, gap: 4,
  },
  tabBtn:        { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  tabBtnActive:  { backgroundColor: 'rgba(212, 175, 55, 0.15)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.4)' },
  tabLabel:      { color: Brand.muted, fontSize: 13, fontWeight: '600' },
  tabLabelActive:{ color: Brand.gold },

  textArea: {
    backgroundColor: 'rgba(36, 51, 39, 0.85)',
    borderWidth: 1, borderColor: Brand.greenBorder,
    borderRadius: 12, padding: 16, fontSize: 16,
    color: Brand.cream, minHeight: 140,
  },

  aiSection:     { gap: 16 },
  aiHint:        { color: Brand.muted, fontSize: 13, fontStyle: 'italic' },
  aiPromptBlock: { gap: 6 },
  aiPromptLabel: { color: Brand.gold, fontSize: 13, fontWeight: '600' },
  aiInput: {
    backgroundColor: 'rgba(36, 51, 39, 0.85)',
    borderWidth: 1, borderColor: Brand.greenBorder,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: Brand.cream,
  },
  generateBtn: {
    height: 52, backgroundColor: '#D4AF37',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  generateBtnText: { color: '#1B3A2B', fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  generatedCard: {
    backgroundColor: 'rgba(36, 51, 39, 0.85)',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.4)',
    borderRadius: 12, padding: 16, gap: 8,
  },
  generatedLabel: { color: 'rgba(212,175,55,0.55)', fontSize: 10, letterSpacing: 1.5 },
  generatedText:  { color: Brand.cream, fontSize: 15, lineHeight: 22, minHeight: 80 },

  nextBtn:         { height: 56, backgroundColor: '#D4AF37', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText:     { color: '#1B3A2B', fontSize: 16, fontWeight: '700', letterSpacing: 1.5 },
});
