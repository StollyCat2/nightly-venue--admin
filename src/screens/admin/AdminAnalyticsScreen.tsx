import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import {
  collection, query, where, getDocs, Timestamp, orderBy, limit,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { C, RADIUS } from '../../theme';

interface CityCount { city: string; count: number; }
interface VenueStat { id: string; name: string; views: number; clicks: number; }

function StatCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue} numberOfLines={1}>
        <Text style={{ color: color ?? C.accent }}>{value}</Text>
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

export default function AdminAnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState(0);
  const [totalVenues, setTotalVenues] = useState(0);
  const [activeVenues, setActiveVenues] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState(0);
  const [goingOutToday, setGoingOutToday] = useState(0);
  const [cityBreakdown, setCityBreakdown] = useState<CityCount[]>([]);
  const [topVenues, setTopVenues] = useState<VenueStat[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const cutoff = Timestamp.fromDate(new Date(Date.now() - 30 * 60 * 1000));

    Promise.all([
      // Active users — userPings in last 30 min
      getDocs(query(
        collection(db, 'userPings'),
        where('expiresAt', '>', cutoff),
      )).then((s) => setActiveUsers(s.size)),

      // Venues
      getDocs(collection(db, 'venues')).then((s) => {
        setTotalVenues(s.size);
        setActiveVenues(s.docs.filter((d) => d.data().isActive).length);
      }),

      // Upcoming events
      getDocs(query(
        collection(db, 'concerts'),
        where('date', '>=', Timestamp.fromDate(new Date())),
      )).then((s) => setUpcomingEvents(s.size)),

      // Going out today across all cities
      getDocs(collection(db, 'cityCounters')).then((s) => {
        let total = 0;
        const breakdown: CityCount[] = [];
        s.docs.forEach((d) => {
          const data = d.data();
          if (data.date === today && data.count > 0) {
            total += data.count;
            breakdown.push({ city: d.id, count: data.count });
          }
        });
        breakdown.sort((a, b) => b.count - a.count);
        setGoingOutToday(total);
        setCityBreakdown(breakdown);
      }),

      // Top venues by views
      getDocs(query(
        collection(db, 'venueStats'),
        orderBy('views', 'desc'),
        limit(5),
      )).then(async (s) => {
        const stats = await Promise.all(s.docs.map(async (d) => {
          const venueSnap = await getDocs(query(
            collection(db, 'venues'),
            where('__name__', '==', d.id),
          ));
          const name = venueSnap.docs[0]?.data()?.name ?? d.id;
          return { id: d.id, name, views: d.data().views ?? 0, clicks: d.data().clicks ?? 0 };
        }));
        setTopVenues(stats);
      }).catch(() => {}),

    ]).finally(() => setLoading(false));
  }, []);

  const CITY_NAMES: Record<string, string> = {
    oslo: 'Oslo', bergen: 'Bergen', trondheim: 'Trondheim',
    stavanger: 'Stavanger', kristiansand: 'Kristiansand',
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>App-statistikk</Text>
      <Text style={styles.pageSubtitle}>Kun synlig for admin</Text>

      {/* Top stats grid */}
      <View style={styles.grid}>
        <StatCard label="Aktive nå" value={activeUsers} sub="siste 30 min" color={C.statusGreen} />
        <StatCard label="Ut i kveld" value={goingOutToday} sub="i dag totalt" color={C.accent} />
        <StatCard label="Aktive steder" value={`${activeVenues}/${totalVenues}`} sub="totalt registrert" />
        <StatCard label="Kommende eventer" value={upcomingEvents} sub="konserter + festivaler" />
      </View>

      {/* Going out by city */}
      {cityBreakdown.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Ut i kveld — per by</Text>
          <View style={styles.card}>
            {cityBreakdown.map((c, i) => (
              <View key={c.city} style={[styles.cityRow, i < cityBreakdown.length - 1 && styles.cityRowBorder]}>
                <Text style={styles.cityName}>{CITY_NAMES[c.city] ?? c.city}</Text>
                <View style={styles.cityBarWrap}>
                  <View style={[
                    styles.cityBar,
                    { width: `${Math.round((c.count / cityBreakdown[0].count) * 100)}%` as any },
                  ]} />
                </View>
                <Text style={styles.cityCount}>{c.count}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Top venues */}
      {topVenues.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Topp steder — visninger</Text>
          <View style={styles.card}>
            {topVenues.map((v, i) => (
              <View key={v.id} style={[styles.venueRow, i < topVenues.length - 1 && styles.cityRowBorder]}>
                <Text style={styles.venueRank}>{i + 1}</Text>
                <Text style={styles.venueName} numberOfLines={1}>{v.name}</Text>
                <View style={styles.venueMeta}>
                  <Text style={styles.venueMetaText}>{v.views} vis.</Text>
                  <Text style={styles.venueMetaDot}>·</Text>
                  <Text style={styles.venueMetaText}>{v.clicks} klikk</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Firebase Analytics note */}
      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Dypere analyse</Text>
        <Text style={styles.noteText}>
          Detaljert statistikk — daglige aktive brukere, sesjonslengde, skjermvisninger og mer — er tilgjengelig i Firebase Analytics Console.
        </Text>
        <Text style={styles.noteUrl}>console.firebase.google.com → nightly-app-f3722 → Analytics</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 28, fontWeight: '800', color: C.text, marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: C.faint, marginBottom: 24 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  statCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: C.card, borderRadius: RADIUS,
    borderWidth: 1, borderColor: C.border,
    padding: 16,
  },
  statValue: { fontSize: 32, fontWeight: '900', marginBottom: 4 },
  statLabel: { fontSize: 13, color: C.text, fontWeight: '600' },
  statSub: { fontSize: 11, color: C.faint, marginTop: 2 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.faint,
    letterSpacing: 1.5, textTransform: 'uppercase',
    marginBottom: 10,
  },
  card: {
    backgroundColor: C.card, borderRadius: RADIUS,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 24, overflow: 'hidden',
  },

  cityRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  cityRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  cityName: { fontSize: 14, color: C.text, fontWeight: '600', width: 110 },
  cityBarWrap: { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  cityBar: { height: '100%', backgroundColor: C.accent, borderRadius: 3 },
  cityCount: { fontSize: 14, fontWeight: '700', color: C.accent, width: 36, textAlign: 'right' },

  venueRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  venueRank: { fontSize: 16, fontWeight: '800', color: C.faint, width: 24 },
  venueName: { flex: 1, fontSize: 14, color: C.text, fontWeight: '600' },
  venueMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  venueMetaText: { fontSize: 12, color: C.muted },
  venueMetaDot: { fontSize: 12, color: C.faint },

  noteCard: {
    backgroundColor: C.card, borderRadius: RADIUS,
    borderWidth: 1, borderColor: C.border,
    padding: 16, gap: 6,
  },
  noteTitle: { fontSize: 13, fontWeight: '700', color: C.text },
  noteText: { fontSize: 13, color: C.muted, lineHeight: 20 },
  noteUrl: { fontSize: 11, color: C.accent, marginTop: 4 },
});
