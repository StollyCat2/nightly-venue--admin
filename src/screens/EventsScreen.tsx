import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { auth, db } from '../firebase/config';
import { Event, RootStackParamList } from '../types';
import { C, RADIUS } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Events'>;

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<Nav>();
  const venueId = auth.currentUser?.uid ?? '';

  useEffect(() => {
    const q = query(collection(db, 'events'), where('venueId', '==', venueId));
    return onSnapshot(q, (snap) => {
      const data: Event[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Event, 'id'>),
        date: d.data().date?.toDate?.() ?? new Date(),
      }));
      data.sort((a, b) => b.date.getTime() - a.date.getTime());
      setEvents(data);
      setLoading(false);
    });
  }, [venueId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.text} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Arrangementer</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('EventDetail', { eventId: 'new' })}
        >
          <Text style={styles.addBtnText}>+ Legg til</Text>
        </TouchableOpacity>
      </View>

      {events.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Ingen arrangementer ennå</Text>
          <Text style={styles.emptySubtext}>Legg til ditt første arrangement for å vise det i Nightly-appen</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  <Text style={styles.eventDate}>
                    {item.date.toLocaleDateString('nb-NO', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
                <View style={[
                  styles.badge,
                  item.published ? styles.badgePublished : styles.badgeDraft,
                ]}>
                  <Text style={[
                    styles.badgeText,
                    item.published ? styles.badgeTextPublished : styles.badgeTextDraft,
                  ]}>
                    {item.published ? 'Live' : 'Utkast'}
                  </Text>
                </View>
              </View>
              {item.description ? (
                <Text style={styles.eventDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 16 },
  center: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  header: { fontSize: 28, fontWeight: '700', color: C.text },
  addBtn: {
    backgroundColor: C.accent,
    borderRadius: RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  addBtnText: { color: C.text, fontWeight: '700', fontSize: 14 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 24 },
  emptyText: { color: C.text, fontSize: 18, fontWeight: '600' },
  emptySubtext: { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: C.card,
    borderRadius: RADIUS,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1 },
  eventTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 4 },
  eventDate: { fontSize: 13, color: C.muted },
  eventDescription: { fontSize: 13, color: C.faint, marginTop: 10, lineHeight: 18 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 10, borderWidth: 1 },
  badgePublished: { backgroundColor: C.statusGreen + '22', borderColor: C.statusGreen },
  badgeDraft: { backgroundColor: C.border, borderColor: C.faint },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeTextPublished: { color: C.statusGreen },
  badgeTextDraft: { color: C.muted },
});
