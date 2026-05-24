import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { C, RADIUS } from '../theme';

export default function EveningMessageScreen() {
  const [message, setMessage] = useState('');
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const venueId = auth.currentUser?.uid ?? '';
  const docRef = doc(db, 'eveningMessages', venueId);

  useEffect(() => {
    getDoc(docRef).then((snap) => {
      if (snap.exists()) {
        setMessage(snap.data().message ?? '');
        setActive(snap.data().active ?? false);
      }
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    await setDoc(docRef, { venueId, message, active, updatedAt: serverTimestamp() });
    await updateDoc(doc(db, 'venues', venueId), {
      eveningMessage: active ? message : null,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.text} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.header}>Kveldsmelding</Text>
        <Text style={styles.description}>
          Denne meldingen vises til gjester som blar gjennom stedet ditt i Nightly-appen i kveld.
        </Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Vis melding til gjester</Text>
          <Switch
            value={active}
            onValueChange={setActive}
            trackColor={{ false: C.border, true: C.accent }}
            thumbColor={C.text}
          />
        </View>

        <TextInput
          style={[styles.textarea, !active && styles.disabled]}
          placeholder="F.eks. I kveld har vi DJ-sett fra kl. 23:00. Dresscode gjelder."
          placeholderTextColor={C.faint}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          value={message}
          onChangeText={setMessage}
          editable={active}
          maxLength={280}
        />
        <Text style={styles.charCount}>{message.length}/280</Text>

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={save}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>{saved ? 'Lagret!' : 'Lagre melding'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 16 },
  center: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 28, fontWeight: '700', color: C.text, marginBottom: 8 },
  description: { fontSize: 14, color: C.muted, marginBottom: 28, lineHeight: 21 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: C.card,
    padding: 16,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: C.border,
  },
  toggleLabel: { color: C.text, fontSize: 16 },
  textarea: {
    backgroundColor: C.card,
    borderRadius: RADIUS,
    padding: 16,
    color: C.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 140,
    borderWidth: 1,
    borderColor: C.border,
  },
  disabled: { opacity: 0.35 },
  charCount: { color: C.faint, fontSize: 12, textAlign: 'right', marginTop: 6, marginBottom: 24 },
  button: {
    backgroundColor: C.text,
    borderRadius: RADIUS,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
