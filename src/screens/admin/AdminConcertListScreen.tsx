import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { collection, onSnapshot, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { db } from '../../firebase/config';
import { RootStackParamList } from '../../types';
import { C, RADIUS } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Concert {
  id: string;
  title: string;
  artist: string;
  venue: string;
  city: string;
  date: Date;
  genre: string;
  ticketUrl?: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('nb-NO', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

const GENRE_COLORS: Record<string, string> = {
  Pop: '#ff6eb4', Rock: '#ff8c42', Metal: '#9b59ff',
  'Hip-hop': '#ffd60a', Elektronisk: '#00d4ff',
  Jazz: '#39ff14', Klassisk: '#c77dff', 'R&B': '#ff4d6d',
};

export default function AdminConcertListScreen() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<Nav>();

  useEffect(() => {
    return onSnapshot(collection(db, 'concerts'), (snap) => {
      const docs = snap.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          ...raw,
          date: raw.date instanceof Timestamp ? raw.date.toDate() : new Date(raw.date),
        } as Concert;
      });
      docs.sort((a, b) => a.date.getTime() - b.date.getTime());
      setConcerts(docs);
      setLoading(false);
    });
  }, []);

  const handleDelete = (concert: Concert) => {
    Alert.alert(
      'Slett konsert',
      `Slett "${concert.artist} — ${concert.title}"?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett', style: 'destructive',
          onPress: () => deleteDoc(doc(db, 'concerts', concert.id)),
        },
      ],
    );
  };

  const isPast = (date: Date) => date < new Date();

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={C.text} size="large" /></View>;
  }

  return (
    <FlatList
      style={styles.list}
      data={concerts}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
      ListHeaderComponent={
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.header}>Konserter</Text>
            <Text style={styles.headerSub}>{concerts.filter(c => !isPast(c.date)).length} kommende</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AdminConcertForm', {})}
          >
            <Text style={styles.addBtnText}>+ Ny konsert</Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item }) => {
        const past = isPast(item.date);
        const genreColor = GENRE_COLORS[item.genre] ?? C.accent;
        return (
          <View style={[styles.card, past && styles.cardPast]}>
            <View style={styles.cardTop}>
              <View style={styles.cardInfo}>
                <View style={styles.cardMeta}>
                  <View style={[styles.genreDot, { backgroundColor: genreColor }]} />
                  <Text style={[styles.genre, { color: genreColor }]}>{item.genre}</Text>
                  {past && <View style={styles.pastBadge}><Text style={styles.pastBadgeText}>Avholdt</Text></View>}
                </View>
                <Text style={styles.artist}>{item.artist}</Text>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>📍 {item.venue}, {item.city}</Text>
                <Text style={styles.date}>🗓 {formatDate(item.date)}</Text>
                {item.ticketUrl && (
                  <Text style={styles.ticketLink} numberOfLines={1}>🔗 {item.ticketUrl}</Text>
                )}
              </View>
            </View>
            <View style={styles.cardFooter}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => navigation.navigate('AdminConcertForm', { concertId: item.id })}
              >
                <Text style={styles.editBtnText}>Rediger</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item)}
              >
                <Text style={styles.deleteBtnText}>Slett</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Ingen konserter ennå</Text>
          <Text style={styles.emptyHint}>Trykk «+ Ny konsert» for å legge til</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  header: { fontSize: 28, fontWeight: '700', color: C.text },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  addBtn: { backgroundColor: C.accent, borderRadius: RADIUS, paddingHorizontal: 16, paddingVertical: 10 },
  addBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  card: {
    backgroundColor: C.card, borderRadius: RADIUS,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.border,
  },
  cardPast: { opacity: 0.5 },
  cardTop: { marginBottom: 12 },
  cardInfo: { gap: 3 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  genreDot: { width: 7, height: 7, borderRadius: 4 },
  genre: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  pastBadge: {
    marginLeft: 6, backgroundColor: C.border,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  pastBadgeText: { fontSize: 10, color: C.muted, fontWeight: '600' },
  artist: { fontSize: 12, color: C.muted, fontWeight: '600' },
  title: { fontSize: 17, fontWeight: '700', color: C.text },
  meta: { fontSize: 13, color: C.muted },
  date: { fontSize: 13, color: C.muted },
  ticketLink: { fontSize: 11, color: C.faint, marginTop: 2 },
  cardFooter: { flexDirection: 'row', gap: 8 },
  editBtn: {
    flex: 1, backgroundColor: C.accent + '18',
    borderRadius: 10, paddingVertical: 9, alignItems: 'center',
    borderWidth: 1, borderColor: C.accent + '44',
  },
  editBtnText: { fontSize: 13, color: C.accent, fontWeight: '700' },
  deleteBtn: {
    backgroundColor: 'rgba(255,34,68,0.08)',
    borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,34,68,0.25)',
  },
  deleteBtnText: { fontSize: 13, color: '#ff4466', fontWeight: '600' },
  empty: { paddingTop: 60, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 18, color: C.muted },
  emptyHint: { fontSize: 13, color: C.faint },
});
