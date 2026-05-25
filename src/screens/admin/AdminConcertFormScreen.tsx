import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import {
  doc, getDoc, setDoc, addDoc, collection, Timestamp,
} from 'firebase/firestore';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { db } from '../../firebase/config';
import { RootStackParamList } from '../../types';
import { C, RADIUS } from '../../theme';

type Route = RouteProp<RootStackParamList, 'AdminConcertForm'>;

const CITIES = ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Kristiansand'];
const GENRES = ['Pop', 'Rock', 'Hip-hop', 'Elektronisk', 'Jazz', 'Metal', 'Klassisk', 'R&B'];

export default function AdminConcertFormScreen() {
  const { params } = useRoute<Route>();
  const navigation = useNavigation();
  const isEdit = !!params?.concertId;

  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('Oslo');
  const [genre, setGenre] = useState('Pop');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('20:00');
  const [ticketUrl, setTicketUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    getDoc(doc(db, 'concerts', params.concertId!)).then((snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      setArtist(d.artist ?? '');
      setTitle(d.title ?? '');
      setVenue(d.venue ?? '');
      setCity(d.city ?? 'Oslo');
      setGenre(d.genre ?? 'Pop');
      setTicketUrl(d.ticketUrl ?? '');
      setImageUrl(d.imageUrl ?? '');
      if (d.date) {
        const dt: Date = d.date instanceof Timestamp ? d.date.toDate() : new Date(d.date);
        setDateStr(dt.toISOString().split('T')[0]);
        setTimeStr(dt.toTimeString().slice(0, 5));
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!artist.trim()) { Alert.alert('Mangler', 'Legg inn artist.'); return; }
    if (!title.trim()) { Alert.alert('Mangler', 'Legg inn tittel.'); return; }
    if (!venue.trim()) { Alert.alert('Mangler', 'Legg inn konsertsted.'); return; }
    if (!dateStr) { Alert.alert('Mangler', 'Legg inn dato (ÅÅÅÅ-MM-DD).'); return; }

    const dateObj = new Date(`${dateStr}T${timeStr || '20:00'}:00`);
    if (isNaN(dateObj.getTime())) { Alert.alert('Ugyldig dato', 'Bruk format ÅÅÅÅ-MM-DD.'); return; }

    setSaving(true);
    try {
      const data = {
        artist: artist.trim(),
        title: title.trim(),
        venue: venue.trim(),
        city,
        genre,
        date: Timestamp.fromDate(dateObj),
        ticketUrl: ticketUrl.trim(),
        imageUrl: imageUrl.trim(),
      };

      if (isEdit) {
        await setDoc(doc(db, 'concerts', params.concertId!), data, { merge: true });
      } else {
        await addDoc(collection(db, 'concerts'), data);
      }
      navigation.goBack();
    } catch (err: unknown) {
      Alert.alert('Feil', err instanceof Error ? err.message : 'Noe gikk galt.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={C.text} size="large" /></View>;
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      <Text style={styles.sectionLabel}>Artist & konsert</Text>
      <TextInput
        style={styles.input}
        placeholder="Artist *"
        placeholderTextColor={C.faint}
        value={artist}
        onChangeText={setArtist}
      />
      <TextInput
        style={styles.input}
        placeholder="Konsertttittel *"
        placeholderTextColor={C.faint}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.sectionLabel}>Sted</Text>
      <TextInput
        style={styles.input}
        placeholder="Konsertsted / venue *"
        placeholderTextColor={C.faint}
        value={venue}
        onChangeText={setVenue}
      />

      <Text style={styles.sectionLabel}>By</Text>
      <View style={styles.chips}>
        {CITIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, city === c && styles.chipActive]}
            onPress={() => setCity(c)}
          >
            <Text style={[styles.chipText, city === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Sjanger</Text>
      <View style={styles.chips}>
        {GENRES.map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.chip, genre === g && styles.chipActive]}
            onPress={() => setGenre(g)}
          >
            <Text style={[styles.chipText, genre === g && styles.chipTextActive]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Dato og tid</Text>
      <View style={styles.dateRow}>
        <TextInput
          style={[styles.input, { flex: 2, marginBottom: 0 }]}
          placeholder="Dato  ÅÅÅÅ-MM-DD *"
          placeholderTextColor={C.faint}
          value={dateStr}
          onChangeText={setDateStr}
          keyboardType="numbers-and-punctuation"
        />
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0, marginLeft: 10 }]}
          placeholder="Tid  TT:MM"
          placeholderTextColor={C.faint}
          value={timeStr}
          onChangeText={setTimeStr}
          keyboardType="numbers-and-punctuation"
        />
      </View>

      <Text style={styles.sectionLabel}>Billett-lenke</Text>
      <TextInput
        style={styles.input}
        placeholder="https://www.ticketmaster.no/..."
        placeholderTextColor={C.faint}
        value={ticketUrl}
        onChangeText={setTicketUrl}
        keyboardType="url"
        autoCapitalize="none"
      />

      <Text style={styles.sectionLabel}>Bilde-URL (valgfritt)</Text>
      <TextInput
        style={styles.input}
        placeholder="https://..."
        placeholderTextColor={C.faint}
        value={imageUrl}
        onChangeText={setImageUrl}
        keyboardType="url"
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.btnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#000" />
          : <Text style={styles.saveBtnText}>{isEdit ? 'Lagre endringer' : 'Legg til konsert'}</Text>
        }
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.faint,
    letterSpacing: 1.5, textTransform: 'uppercase',
    marginTop: 20, marginBottom: 8,
  },
  input: {
    backgroundColor: C.card, color: C.text,
    borderRadius: RADIUS, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
  },
  dateRow: { flexDirection: 'row', marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: C.border, backgroundColor: C.card,
  },
  chipActive: { backgroundColor: C.accent + '22', borderColor: C.accent },
  chipText: { fontSize: 13, color: C.muted, fontWeight: '600' },
  chipTextActive: { color: C.accent },
  saveBtn: {
    backgroundColor: C.accent, borderRadius: RADIUS,
    paddingVertical: 16, alignItems: 'center', marginTop: 28,
  },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
