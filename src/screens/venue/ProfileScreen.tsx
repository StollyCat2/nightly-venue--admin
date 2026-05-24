import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { VenueDoc, OpeningHours, DEFAULT_OPENING_HOURS } from '../../types';
import OpeningHoursEditor from '../../components/OpeningHoursEditor';
import { C, RADIUS } from '../../theme';

export default function ProfileScreen() {
  const venueId = auth.currentUser?.uid ?? '';
  const [venue, setVenue] = useState<VenueDoc | null>(null);
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [openingHours, setOpeningHours] = useState<OpeningHours | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [savingPin, setSavingPin] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    return onSnapshot(doc(db, 'venues', venueId), (snap) => {
      if (!snap.exists()) return;
      const data = { id: snap.id, ...snap.data() } as VenueDoc;
      setVenue(data);
      setDescription(data.description ?? '');
      setPhone(data.phone ?? '');
      setOpeningHours(data.openingHours ?? DEFAULT_OPENING_HOURS);
    });
  }, [venueId]);

  const handleSave = async () => {
    if (!openingHours) return;
    setSaving(true);
    setSaveSuccess(false);
    setSaveError('');
    try {
      await updateDoc(doc(db, 'venues', venueId), {
        description: description.trim(),
        phone: phone.trim(),
        openingHours,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Ukjent feil');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePin = async () => {
    setPinError('');
    setPinSuccess(false);
    if (pin.length < 4) {
      setPinError('PIN-koden må være minst 4 siffer.');
      return;
    }
    if (!/^\d+$/.test(pin)) {
      setPinError('PIN-koden kan bare inneholde tall.');
      return;
    }
    if (pin !== pinConfirm) {
      setPinError('PIN-kodene er ikke like.');
      return;
    }
    setSavingPin(true);
    try {
      await setDoc(
        doc(db, 'venueSettings', venueId),
        { guardPin: pin },
        { merge: true },
      );
      setPin('');
      setPinConfirm('');
      setPinSuccess(true);
      setTimeout(() => setPinSuccess(false), 3000);
    } catch (err: unknown) {
      setPinError(err instanceof Error ? err.message : 'Ukjent feil');
    } finally {
      setSavingPin(false);
    }
  };

  if (!venue || !openingHours) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.text} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionLabel}>Stedsinformasjon (kun admin kan endre)</Text>
      <View style={styles.readonlyCard}>
        <View style={styles.readonlyRow}>
          <Text style={styles.readonlyLabel}>Navn</Text>
          <Text style={styles.readonlyValue}>{venue.name}</Text>
        </View>
        <View style={[styles.readonlyRow, styles.readonlyRowBorder]}>
          <Text style={styles.readonlyLabel}>Adresse</Text>
          <Text style={styles.readonlyValue}>{venue.address}</Text>
        </View>
      </View>

      {venue.images && venue.images.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Bilder (kun admin kan endre)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
            {venue.images.map((uri, i) => (
              <View key={i} style={styles.imageThumb}>
                <Image source={{ uri }} style={styles.thumbImg} />
                {i === 0 && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Forside</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </>
      )}

      <Text style={styles.sectionLabel}>Rediger profil</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Beskrivelse av stedet"
        placeholderTextColor={C.faint}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      <TextInput
        style={styles.input}
        placeholder="Telefonnummer"
        placeholderTextColor={C.faint}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Text style={styles.sectionLabel}>Åpningstider</Text>
      <OpeningHoursEditor value={openingHours} onChange={setOpeningHours} />

      {saveError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{saveError}</Text>
        </View>
      ) : null}
      {saveSuccess ? (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>Profilen er oppdatert.</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.btnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>Lagre endringer</Text>}
      </TouchableOpacity>

      <Text style={[styles.sectionLabel, { marginTop: 36 }]}>Vaktmodus PIN</Text>
      <Text style={styles.pinHint}>
        PIN-koden brukes for å låse skjermen i vaktmodus. Standard er 1234.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Ny PIN-kode (min. 4 siffer)"
        placeholderTextColor={C.faint}
        value={pin}
        onChangeText={(t) => { setPin(t.replace(/\D/g, '')); setPinError(''); }}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
      />
      <TextInput
        style={styles.input}
        placeholder="Bekreft PIN-kode"
        placeholderTextColor={C.faint}
        value={pinConfirm}
        onChangeText={(t) => { setPinConfirm(t.replace(/\D/g, '')); setPinError(''); }}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
      />
      {pinError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{pinError}</Text>
        </View>
      ) : null}
      {pinSuccess ? (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>PIN-koden er oppdatert.</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.pinBtn, savingPin && styles.btnDisabled]}
        onPress={handleSavePin}
        disabled={savingPin}
      >
        {savingPin ? <ActivityIndicator color={C.text} /> : <Text style={styles.pinBtnText}>Lagre PIN-kode</Text>}
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.faint,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 20,
  },
  readonlyCard: {
    backgroundColor: C.card,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  readonlyRow: { flexDirection: 'row', padding: 14, alignItems: 'center', gap: 12 },
  readonlyRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  readonlyLabel: { fontSize: 13, color: C.muted, width: 70 },
  readonlyValue: { fontSize: 15, color: C.text, flex: 1 },
  imagesScroll: { marginBottom: 8 },
  imageThumb: { width: 120, height: 90, borderRadius: 12, overflow: 'hidden', marginRight: 10 },
  thumbImg: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 3,
    alignItems: 'center',
  },
  coverBadgeText: { color: C.accent, fontSize: 10, fontWeight: '700' },
  input: {
    backgroundColor: C.card,
    color: C.text,
    borderRadius: RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  multiline: { height: 100 },
  pinHint: { fontSize: 13, color: C.muted, marginBottom: 12, lineHeight: 18 },
  errorBanner: {
    backgroundColor: C.statusRed + '22',
    borderWidth: 1,
    borderColor: C.statusRed + '66',
    borderRadius: RADIUS,
    padding: 12,
    marginBottom: 10,
  },
  errorBannerText: { color: C.statusRed, fontSize: 13 },
  successBanner: {
    backgroundColor: C.statusGreen + '22',
    borderWidth: 1,
    borderColor: C.statusGreen + '66',
    borderRadius: RADIUS,
    padding: 12,
    marginBottom: 10,
  },
  successBannerText: { color: C.statusGreen, fontSize: 13 },
  saveBtn: {
    backgroundColor: C.text,
    borderRadius: RADIUS,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  pinBtn: {
    backgroundColor: C.card,
    borderRadius: RADIUS,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  pinBtnText: { color: C.text, fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
