import React, { useState } from 'react';
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
import { doc, setDoc } from 'firebase/firestore';
import { geocodeAddress } from '../../utils/geocode';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { db, storage, firebaseConfig } from '../../firebase/config';
import { OpeningHours, DEFAULT_OPENING_HOURS } from '../../types';
import OpeningHoursEditor from '../../components/OpeningHoursEditor';
import { C, RADIUS } from '../../theme';

const SECONDARY = 'nightly-secondary';

function getSecondaryAuth() {
  const apps = getApps();
  const existing = apps.find((a) => a.name === SECONDARY);
  const app = existing ?? initializeApp(firebaseConfig, SECONDARY);
  return getAuth(app);
}

function friendlyError(msg: string): string {
  if (msg.includes('email-already-in-use')) return 'Denne e-postadressen er allerede registrert.';
  if (msg.includes('invalid-email')) return 'Ugyldig e-postadresse.';
  if (msg.includes('network-request-failed')) return 'Nettverksfeil. Sjekk internettforbindelsen.';
  if (msg.includes('permission-denied')) return 'Tilgang nektet. Sjekk Firestore-regler.';
  return msg;
}

export default function AdminCreateVenueScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [openingHours, setOpeningHours] = useState<OpeningHours>(DEFAULT_OPENING_HOURS);
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Navn er obligatorisk.';
    if (!address.trim()) errs.address = 'Adresse er obligatorisk.';
    if (!ownerEmail.trim()) errs.ownerEmail = 'E-post er obligatorisk.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail.trim()))
      errs.ownerEmail = 'Ugyldig e-postadresse.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setGeneralError('Tillat tilgang til bilder i innstillingene for å laste opp.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (venueId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const uri of images) {
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

  const handleCreate = async () => {
    setGeneralError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const secondaryAuth = getSecondaryAuth();
      const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
      const credential = await createUserWithEmailAndPassword(
        secondaryAuth,
        ownerEmail.trim(),
        tempPassword,
      );
      const venueId = credential.user.uid;

      await sendPasswordResetEmail(secondaryAuth, ownerEmail.trim());
      await firebaseSignOut(secondaryAuth);

      const imageUrls = await uploadImages(venueId);
      const coords = await geocodeAddress(address.trim());

      // Note: serverTimestamp() cannot be used inside array literals.
      // Use a plain Date for the initial invite timestamp.
      await setDoc(doc(db, 'venues', venueId), {
        name: name.trim(),
        address: address.trim(),
        description: description.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        phone: phone.trim(),
        openingHours,
        images: imageUrls,
        isActive: true,
        inviteStatus: 'pending',
        invitesSentAt: [new Date()],
        views: 0,
        clicks: 0,
        ...(coords ?? {}),
      });

      navigation.goBack();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGeneralError(friendlyError(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.sectionLabel}>Stedinformasjon</Text>

      <TextInput
        style={[styles.input, fieldErrors.name ? styles.inputError : null]}
        placeholder="Navn på stedet *"
        placeholderTextColor={C.faint}
        value={name}
        onChangeText={(t) => { setName(t); setFieldErrors((e) => ({ ...e, name: '' })); }}
      />
      {fieldErrors.name ? <Text style={styles.fieldError}>{fieldErrors.name}</Text> : null}

      <TextInput
        style={[styles.input, fieldErrors.address ? styles.inputError : null]}
        placeholder="Adresse *"
        placeholderTextColor={C.faint}
        value={address}
        onChangeText={(t) => { setAddress(t); setFieldErrors((e) => ({ ...e, address: '' })); }}
      />
      {fieldErrors.address ? <Text style={styles.fieldError}>{fieldErrors.address}</Text> : null}

      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Beskrivelse (valgfritt)"
        placeholderTextColor={C.faint}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      <TextInput
        style={styles.input}
        placeholder="Telefonnummer (valgfritt)"
        placeholderTextColor={C.faint}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Text style={styles.sectionLabel}>Eiers e-post (innlogging) *</Text>
      <TextInput
        style={[styles.input, fieldErrors.ownerEmail ? styles.inputError : null]}
        placeholder="sted@example.com"
        placeholderTextColor={C.faint}
        value={ownerEmail}
        onChangeText={(t) => { setOwnerEmail(t); setFieldErrors((e) => ({ ...e, ownerEmail: '' })); }}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      {fieldErrors.ownerEmail ? <Text style={styles.fieldError}>{fieldErrors.ownerEmail}</Text> : null}

      <Text style={styles.sectionLabel}>Åpningstider</Text>
      <OpeningHoursEditor value={openingHours} onChange={setOpeningHours} />

      <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
        Bilder ({images.length}/5) — valgfritt
      </Text>
      <View style={styles.imageGrid}>
        {images.map((uri, i) => (
          <View key={i} style={styles.imageThumb}>
            <Image source={{ uri }} style={styles.thumbImg} />
            {i === 0 && (
              <View style={styles.coverBadge}>
                <Text style={styles.coverBadgeText}>Forside</Text>
              </View>
            )}
            <TouchableOpacity style={styles.removeImg} onPress={() => removeImage(i)}>
              <Text style={styles.removeImgText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        {images.length < 5 && (
          <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
            <Text style={styles.addImageIcon}>+</Text>
            <Text style={styles.addImageText}>Legg til</Text>
          </TouchableOpacity>
        )}
      </View>

      {generalError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{generalError}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleCreate}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.saveBtnText}>Opprett sted og send invitasjon</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 48 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.faint,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 20,
  },
  input: {
    backgroundColor: C.card,
    color: C.text,
    borderRadius: RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  inputError: {
    borderColor: C.statusRed,
  },
  fieldError: {
    color: C.statusRed,
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  multiline: { height: 100, marginBottom: 10 },
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
  errorBanner: {
    backgroundColor: C.statusRed + '22',
    borderWidth: 1,
    borderColor: C.statusRed + '66',
    borderRadius: RADIUS,
    padding: 14,
    marginTop: 16,
  },
  errorBannerText: { color: C.statusRed, fontSize: 14, lineHeight: 20 },
  saveBtn: {
    backgroundColor: C.text,
    borderRadius: RADIUS,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
