import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
} from 'react-native';
import { doc, onSnapshot, updateDoc, arrayUnion, serverTimestamp, Timestamp, deleteDoc } from 'firebase/firestore';
import { geocodeAddress } from '../../utils/geocode';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sendPasswordResetEmail, getAuth } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import * as ImagePicker from 'expo-image-picker';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { db, storage, firebaseConfig } from '../../firebase/config';
import { VenueDoc, OpeningHours, RootStackParamList, DEFAULT_OPENING_HOURS } from '../../types';
import OpeningHoursEditor from '../../components/OpeningHoursEditor';
import { C, RADIUS } from '../../theme';

const SECONDARY = 'nightly-secondary';

function getSecondaryAuth() {
  const apps = getApps();
  const existing = apps.find((a) => a.name === SECONDARY);
  const app = existing ?? initializeApp(firebaseConfig, SECONDARY);
  return getAuth(app);
}

type Route = RouteProp<RootStackParamList, 'AdminVenueDetail'>;

function formatDate(date: Date): string {
  return date.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminVenueDetailScreen() {
  const { params } = useRoute<Route>();
  const { venueId } = params;
  const navigation = useNavigation();

  const [venue, setVenue] = useState<VenueDoc | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [openingHours, setOpeningHours] = useState<OpeningHours | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      doc(db, 'venues', venueId),
      (snap) => {
        if (!snap.exists()) {
          setLoadError('Stedet ble ikke funnet.');
          return;
        }
        const raw = snap.data();
        const data: VenueDoc = {
          id: snap.id,
          ...raw,
          invitesSentAt: (raw.invitesSentAt ?? []).map((t: Timestamp) => t?.toDate?.() ?? t),
          lastLoginAt: raw.lastLoginAt?.toDate?.() ?? undefined,
        } as VenueDoc;
        setVenue(data);
        setName(data.name);
        setAddress(data.address);
        setDescription(data.description ?? '');
        setPhone(data.phone ?? '');
        setIsActive(data.isActive);
        setOpeningHours(data.openingHours ?? DEFAULT_OPENING_HOURS);
        setImages(data.images ?? []);
      },
      (error) => {
        console.error('Venue snapshot error:', error);
        setLoadError('Kunne ikke laste sted: ' + error.message);
      },
    );
  }, [venueId]);

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Tillatelse nødvendig', 'Tillat tilgang til bilder for å laste opp.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newUris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...newUris].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    Alert.alert('Fjern bilde', 'Er du sikker?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Fjern',
        style: 'destructive',
        onPress: () => setImages((prev) => prev.filter((_, i) => i !== index)),
      },
    ]);
  };

  const uploadNewImages = async (uris: string[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const uri of uris) {
      if (uri.startsWith('http')) {
        urls.push(uri);
        continue;
      }
      const resp = await fetch(uri);
      const blob = await resp.blob();
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const storageRef = ref(storage, `venues/${venueId}/images/${filename}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      urls.push(url);
    }
    return urls;
  };

  const handleSave = async () => {
    if (!openingHours) return;
    setSaving(true);
    try {
      const finalImages = await uploadNewImages(images);
      const addressChanged = address.trim() !== venue?.address;
      const coords = addressChanged ? await geocodeAddress(address.trim()) : null;
      await updateDoc(doc(db, 'venues', venueId), {
        name: name.trim(),
        address: address.trim(),
        description: description.trim(),
        phone: phone.trim(),
        isActive,
        openingHours,
        images: finalImages,
        ...(coords ?? {}),
      });
      Alert.alert('Lagret', 'Endringene er lagret.');
    } catch (err: unknown) {
      Alert.alert('Feil', err instanceof Error ? err.message : 'Ukjent feil');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Slett sted',
      `Er du sikker på at du vil slette "${venue?.name}"? Dette kan ikke angres.`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteDoc(doc(db, 'venues', venueId));
              navigation.goBack();
            } catch {
              Alert.alert('Feil', 'Kunne ikke slette stedet. Prøv igjen.');
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const sendInvite = async () => {
    if (!venue?.ownerEmail) return;
    setSendingInvite(true);
    try {
      const secondaryAuth = getSecondaryAuth();
      await sendPasswordResetEmail(secondaryAuth, venue.ownerEmail);
      await updateDoc(doc(db, 'venues', venueId), {
        invitesSentAt: arrayUnion(serverTimestamp()),
      });
      Alert.alert('Invitasjon sendt', `E-post sendt til ${venue.ownerEmail}.`);
    } catch {
      Alert.alert('Feil', 'Kunne ikke sende e-post. Sjekk at e-postadressen er registrert.');
    } finally {
      setSendingInvite(false);
    }
  };

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Tilbake</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!venue || !openingHours) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.text} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.activeRow}>
        <Text style={styles.activeLabel}>Sted er aktivt</Text>
        <Switch
          value={isActive}
          onValueChange={setIsActive}
          trackColor={{ false: C.border, true: C.statusGreen }}
          thumbColor={C.text}
        />
      </View>

      <Text style={styles.sectionLabel}>Stedinformasjon</Text>
      <TextInput style={styles.input} placeholder="Navn" placeholderTextColor={C.faint} value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Adresse" placeholderTextColor={C.faint} value={address} onChangeText={setAddress} />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Beskrivelse"
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

      <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Bilder ({images.length}/5)</Text>
      <View style={styles.imageGrid}>
        {images.map((uri, i) => (
          <TouchableOpacity key={i} style={styles.imageThumb} onLongPress={() => removeImage(i)}>
            <Image source={{ uri }} style={styles.thumbImg} />
            {i === 0 && (
              <View style={styles.coverBadge}>
                <Text style={styles.coverBadgeText}>Forside</Text>
              </View>
            )}
            <TouchableOpacity style={styles.removeImg} onPress={() => removeImage(i)}>
              <Text style={styles.removeImgText}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
        {images.length < 5 && (
          <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
            <Text style={styles.addImageIcon}>+</Text>
            <Text style={styles.addImageText}>Legg til</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionLabel}>Tilgang</Text>
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>E-post</Text>
        <Text style={styles.infoValue}>{venue.ownerEmail}</Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Status</Text>
        <View style={[
          styles.inviteStatusBadge,
          { backgroundColor: venue.inviteStatus === 'active' ? C.statusGreen + '22' : C.statusYellow + '22',
            borderColor: venue.inviteStatus === 'active' ? C.statusGreen + '66' : C.statusYellow + '66' },
        ]}>
          <View style={[styles.inviteStatusDot, { backgroundColor: venue.inviteStatus === 'active' ? C.statusGreen : C.statusYellow }]} />
          <Text style={[styles.inviteStatusText, { color: venue.inviteStatus === 'active' ? C.statusGreen : C.statusYellow }]}>
            {venue.inviteStatus === 'active' ? 'Aktiv' : 'Venter på innlogging'}
          </Text>
        </View>
      </View>
      {venue.lastLoginAt && (
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Sist innlogget</Text>
          <Text style={styles.infoValue}>{formatDate(venue.lastLoginAt)}</Text>
        </View>
      )}
      {venue.invitesSentAt && venue.invitesSentAt.length > 0 && (
        <View style={styles.inviteHistoryCard}>
          <Text style={styles.inviteHistoryTitle}>Invitasjoner sendt</Text>
          {[...venue.invitesSentAt].reverse().map((ts, i) => (
            <View key={i} style={styles.inviteHistoryRow}>
              <View style={styles.inviteHistoryDot} />
              <Text style={styles.inviteHistoryDate}>{formatDate(ts)}</Text>
            </View>
          ))}
        </View>
      )}
      <TouchableOpacity
        style={[styles.inviteBtn, sendingInvite && styles.btnDisabled]}
        onPress={sendInvite}
        disabled={sendingInvite}
      >
        {sendingInvite ? (
          <ActivityIndicator color={C.text} />
        ) : (
          <Text style={styles.inviteBtnText}>Send invitasjon på nytt</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.btnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.saveBtnText}>Lagre endringer</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.deleteBtn, deleting && styles.btnDisabled]}
        onPress={handleDelete}
        disabled={deleting}
      >
        {deleting ? (
          <ActivityIndicator color={C.statusRed} />
        ) : (
          <Text style={styles.deleteBtnText}>Slett sted</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 16 },
  errorText: { color: C.statusRed, fontSize: 16, textAlign: 'center', paddingHorizontal: 32 },
  backBtn: { backgroundColor: C.card, borderRadius: RADIUS, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: C.border },
  backBtnText: { color: C.text, fontSize: 14 },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.card,
    borderRadius: RADIUS,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 20,
  },
  activeLabel: { fontSize: 16, fontWeight: '600', color: C.text },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.faint,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 12,
  },
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
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  imageThumb: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden' },
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
  removeImg: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImgText: { color: C.text, fontSize: 12, fontWeight: '700' },
  addImageBtn: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: C.card,
  },
  addImageIcon: { fontSize: 22, color: C.faint },
  addImageText: { fontSize: 11, color: C.faint },
  infoCard: {
    backgroundColor: C.card,
    borderRadius: RADIUS,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: { fontSize: 13, color: C.muted, width: 120 },
  infoValue: { fontSize: 15, color: C.text, flex: 1 },
  inviteStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  inviteStatusDot: { width: 7, height: 7, borderRadius: 4 },
  inviteStatusText: { fontSize: 13, fontWeight: '600' },
  inviteHistoryCard: {
    backgroundColor: C.card,
    borderRadius: RADIUS,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    gap: 8,
  },
  inviteHistoryTitle: { fontSize: 12, color: C.muted, fontWeight: '600', marginBottom: 4 },
  inviteHistoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inviteHistoryDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.faint },
  inviteHistoryDate: { fontSize: 13, color: C.muted },
  inviteBtn: {
    backgroundColor: C.card,
    borderRadius: RADIUS,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.accent,
  },
  inviteBtnText: { color: C.accent, fontSize: 15, fontWeight: '700' },
  saveBtn: {
    backgroundColor: C.text,
    borderRadius: RADIUS,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  deleteBtn: {
    borderWidth: 1,
    borderColor: C.statusRed + '66',
    borderRadius: RADIUS,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  deleteBtnText: { color: C.statusRed, fontSize: 15, fontWeight: '600' },
});
