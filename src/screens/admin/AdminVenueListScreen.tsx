import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
  ScrollView,
} from 'react-native';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { db } from '../../firebase/config';
import { VenueDoc, RootStackParamList } from '../../types';
import { C, RADIUS } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_COLORS: Record<string, string> = {
  lite: C.statusGreen,
  moderat: C.statusYellow,
  lang: C.statusOrange,
  fullt: C.statusRed,
};

const STATUS_LABELS: Record<string, string> = {
  lite: 'Lite kø',
  moderat: 'Moderat kø',
  lang: 'Lang kø',
  fullt: 'Fullt',
};

const CITIES = ['Alle', 'Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Kristiansand'];

export default function AdminVenueListScreen() {
  const [venues, setVenues] = useState<VenueDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('Alle');
  const navigation = useNavigation<Nav>();

  useEffect(() => {
    return onSnapshot(collection(db, 'venues'), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as VenueDoc));
      docs.sort((a, b) => a.name.localeCompare(b.name));
      setVenues(docs);
      setLoading(false);
    });
  }, []);

  const filtered = selectedCity === 'Alle'
    ? venues
    : venues.filter((v) => v.address?.toLowerCase().includes(selectedCity.toLowerCase()));

  const toggleActive = (venueId: string, current: boolean) => {
    updateDoc(doc(db, 'venues', venueId), { isActive: !current });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.text} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={filtered}
      keyExtractor={(v) => v.id}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
      ListHeaderComponent={
        <>
          <View style={styles.headerRow}>
            <Text style={styles.header}>Steder</Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => navigation.navigate('AdminCreateVenue')}
            >
              <Text style={styles.createBtnText}>+ Nytt sted</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {CITIES.map((city) => (
              <TouchableOpacity
                key={city}
                style={[styles.chip, selectedCity === city && styles.chipActive]}
                onPress={() => setSelectedCity(city)}
              >
                <Text style={[styles.chipText, selectedCity === city && styles.chipTextActive]}>
                  {city}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.countLabel}>
            {filtered.length} {filtered.length === 1 ? 'sted' : 'steder'}
            {selectedCity !== 'Alle' ? ` i ${selectedCity}` : ' totalt'}
          </Text>
        </>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          {/* Top row: info + active toggle (separate touchable) */}
          <View style={styles.cardTop}>
            <View style={styles.cardInfo}>
              <Text style={styles.venueName}>{item.name}</Text>
              <Text style={styles.venueAddress}>{item.address}</Text>
              <Text style={styles.venueEmail}>{item.ownerEmail}</Text>
            </View>
            <TouchableOpacity style={styles.activeSwitch} onPress={() => toggleActive(item.id, item.isActive)} activeOpacity={0.7}>
              <Text style={styles.switchLabel}>{item.isActive ? 'Aktiv' : 'Inaktiv'}</Text>
              <Switch
                value={item.isActive}
                onValueChange={() => toggleActive(item.id, item.isActive)}
                trackColor={{ false: C.border, true: C.statusGreen }}
                thumbColor={C.text}
                pointerEvents="none"
              />
            </TouchableOpacity>
          </View>

          {/* Status badge */}
          {item.queueStatus && (
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.queueStatus] ?? C.faint }]} />
              <Text style={styles.statusText}>{STATUS_LABELS[item.queueStatus] ?? item.queueStatus}</Text>
            </View>
          )}

          {/* Footer: invite status + edit button */}
          <View style={styles.cardFooter}>
            <View style={[
              styles.inviteBadge,
              {
                backgroundColor: item.inviteStatus === 'active' ? C.statusGreen + '22' : C.statusYellow + '22',
                borderColor: item.inviteStatus === 'active' ? C.statusGreen + '55' : C.statusYellow + '55',
              },
            ]}>
              <View style={[styles.inviteDot, { backgroundColor: item.inviteStatus === 'active' ? C.statusGreen : C.statusYellow }]} />
              <Text style={[styles.inviteBadgeText, { color: item.inviteStatus === 'active' ? C.statusGreen : C.statusYellow }]}>
                {item.inviteStatus === 'active' ? 'Aktiv' : 'Venter'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('AdminVenueDetail', { venueId: item.id })}
            >
              <Text style={styles.editBtnText}>Rediger →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Ingen steder ennå</Text>
          <Text style={styles.emptyHint}>Trykk «+ Nytt sted» for å legge til</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  header: { fontSize: 28, fontWeight: '700', color: C.text },
  createBtn: {
    backgroundColor: C.accent,
    borderRadius: RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  createBtnText: { color: C.text, fontWeight: '700', fontSize: 14 },
  card: {
    backgroundColor: C.card,
    borderRadius: RADIUS,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardInfo: { flex: 1, marginRight: 12 },
  venueName: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 3 },
  venueAddress: { fontSize: 13, color: C.muted, marginBottom: 2 },
  venueEmail: { fontSize: 12, color: C.faint },
  activeSwitch: { alignItems: 'center', gap: 4 },
  switchLabel: { fontSize: 11, color: C.muted },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, color: C.muted },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  inviteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  inviteDot: { width: 6, height: 6, borderRadius: 3 },
  inviteBadgeText: { fontSize: 11, fontWeight: '700' },
  editBtn: {
    backgroundColor: C.accent + '18',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.accent + '44',
  },
  editBtnText: { fontSize: 12, color: C.accent, fontWeight: '700' },
  filterRow: { gap: 8, paddingBottom: 16 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    borderColor: C.border, backgroundColor: C.card,
  },
  chipActive: { backgroundColor: C.accent + '22', borderColor: C.accent + '88' },
  chipText: { fontSize: 13, fontWeight: '600', color: C.muted },
  chipTextActive: { color: C.accent },
  countLabel: { fontSize: 12, color: C.faint, marginBottom: 12 },
  empty: { paddingTop: 60, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 18, color: C.muted },
  emptyHint: { fontSize: 13, color: C.faint },
});
