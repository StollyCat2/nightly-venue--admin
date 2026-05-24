import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  collection,
  Timestamp,
} from 'firebase/firestore';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { auth, db } from '../firebase/config';
import { RootStackParamList } from '../types';
import { C, RADIUS } from '../theme';

type RouteT = RouteProp<RootStackParamList, 'EventDetail'>;

export default function EventDetailScreen() {
  const route = useRoute<RouteT>();
  const navigation = useNavigation();
  const { eventId } = route.params;
  const isNew = eventId === 'new';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const venueId = auth.currentUser?.uid ?? '';

  useEffect(() => {
    if (isNew) return;
    getDoc(doc(db, 'events', eventId)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTitle(data.title ?? '');
        setDescription(data.description ?? '');
        setPublished(data.published ?? false);
        const d: Date = data.date?.toDate?.() ?? new Date();
        setDateStr(d.toISOString().split('T')[0]);
      }
      setLoading(false);
    });
  }, [eventId]);

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('Tittel mangler', 'Skriv inn en tittel for arrangementet.');
      return;
    }
    setSaving(true);
    const date = dateStr ? Timestamp.fromDate(new Date(dateStr)) : Timestamp.now();
    const payload = { venueId, title, description, published, date };
    try {
      if (isNew) {
        await addDoc(collection(db, 'events'), payload);
      } else {
        await setDoc(doc(db, 'events', eventId), payload, { merge: true });
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Feil', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Slett arrangement', 'Dette kan ikke angres.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Slett',
        style: 'destructive',
        onPress: async () => {
          await deleteDoc(doc(db, 'events', eventId));
          navigation.goBack();
        },
      },
    ]);
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
        <Text style={styles.header}>{isNew ? 'Nytt arrangement' : 'Rediger arrangement'}</Text>

        <Text style={styles.label}>Tittel</Text>
        <TextInput
          style={styles.input}
          placeholder="Navn på arrangementet"
          placeholderTextColor={C.faint}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Dato (ÅÅÅÅ-MM-DD)</Text>
        <TextInput
          style={styles.input}
          placeholder="2025-12-31"
          placeholderTextColor={C.faint}
          value={dateStr}
          onChangeText={setDateStr}
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.label}>Beskrivelse</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Fortell gjestene hva de kan forvente..."
          placeholderTextColor={C.faint}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
        />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Publiser i Nightly-appen</Text>
          <Switch
            value={published}
            onValueChange={setPublished}
            trackColor={{ false: C.border, true: C.accent }}
            thumbColor={C.text}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={save} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>{isNew ? 'Opprett arrangement' : 'Lagre endringer'}</Text>
          )}
        </TouchableOpacity>

        {!isNew && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteText}>Slett arrangement</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 16 },
  center: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 28, fontWeight: '700', color: C.text, marginBottom: 28 },
  label: {
    fontSize: 11,
    color: C.muted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  input: {
    backgroundColor: C.card,
    borderRadius: RADIUS,
    padding: 15,
    color: C.text,
    fontSize: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  textarea: { minHeight: 120 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.card,
    padding: 16,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 28,
  },
  toggleLabel: { color: C.text, fontSize: 16 },
  button: {
    backgroundColor: C.text,
    borderRadius: RADIUS,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: { color: '#000', fontSize: 16, fontWeight: '700' },
  deleteBtn: { paddingVertical: 14, alignItems: 'center' },
  deleteText: { color: C.statusRed, fontSize: 15, fontWeight: '500' },
});
