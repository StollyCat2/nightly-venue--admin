import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { collection, query, where, limit, onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { QueueStatusLogEntry, VenueQueueStatus } from '../types';
import { C, RADIUS } from '../theme';

const DAYS_NO = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

const STATUS_COLORS: Record<VenueQueueStatus, string> = {
  lite: C.statusGreen,
  moderat: C.statusYellow,
  lang: C.statusOrange,
  fullt: C.statusRed,
};

const STATUS_LABELS: Record<VenueQueueStatus, string> = {
  lite: 'Lite kø',
  moderat: 'Moderat kø',
  lang: 'Lang kø',
  fullt: 'Fullt',
};

type Tab = 'week' | 'month' | 'all';

const TABS: { key: Tab; label: string }[] = [
  { key: 'week', label: 'Denne uken' },
  { key: 'month', label: 'Denne måneden' },
  { key: 'all', label: 'Alt' },
];

interface DayHistory {
  date: string;
  dayLabel: string;
  entries: QueueStatusLogEntry[];
  lastStatus: VenueQueueStatus | null;
}

function dateKey(d: Date) {
  return d.toISOString().split('T')[0];
}

function padTwo(n: number) {
  return String(n).padStart(2, '0');
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function StatisticsScreen() {
  const [loading, setLoading] = useState(true);
  const [weeklyViews, setWeeklyViews] = useState(0);
  const [allEntries, setAllEntries] = useState<QueueStatusLogEntry[]>([]);
  const [tab, setTab] = useState<Tab>('week');
  const venueId = auth.currentUser?.uid ?? '';

  useEffect(() => {
    return onSnapshot(doc(db, 'venueStats', venueId), (snap) => {
      if (snap.exists()) setWeeklyViews(snap.data().weeklyViews ?? 0);
    });
  }, [venueId]);

  useEffect(() => {
    const q = query(
      collection(db, 'queueStatusLog'),
      where('venueId', '==', venueId),
      limit(500),
    );
    return onSnapshot(
      q,
      (snap) => {
        const entries: QueueStatusLogEntry[] = snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<QueueStatusLogEntry, 'id'>),
            timestamp: d.data().timestamp?.toDate?.() ?? new Date(),
          }))
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        setAllEntries(entries);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [venueId]);

  const cutoff = tab === 'week' ? daysAgo(7) : tab === 'month' ? daysAgo(30) : null;
  const logEntries = cutoff ? allEntries.filter((e) => e.timestamp >= cutoff) : allEntries;

  const hasData = weeklyViews > 0 || allEntries.length > 0;

  // Group by date
  const dayMap: Record<string, DayHistory> = {};
  logEntries.forEach((entry) => {
    const key = dateKey(entry.timestamp);
    if (!dayMap[key]) {
      dayMap[key] = {
        date: key,
        dayLabel: DAYS_NO[entry.timestamp.getDay()],
        entries: [],
        lastStatus: null,
      };
    }
    dayMap[key].entries.push(entry);
    dayMap[key].lastStatus = entry.status;
  });
  const dayHistories = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

  const busiestDay = dayHistories.reduce<DayHistory | null>(
    (best, day) => (!best || day.entries.length > best.entries.length ? day : best),
    null,
  );

  const hourCounts: Record<number, number> = {};
  logEntries.forEach((e) => {
    const h = e.timestamp.getHours();
    hourCounts[h] = (hourCounts[h] ?? 0) + 1;
  });
  const peakEntry = Object.entries(hourCounts).reduce<[number, number] | null>(
    (best, [h, c]) => (!best || c > best[1] ? [Number(h), c] : best),
    null,
  );
  const peakLabel = peakEntry ? `${padTwo(peakEntry[0])}–${padTwo(peakEntry[0] + 1)}` : null;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.text} size="large" />
      </View>
    );
  }

  if (!hasData) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🌙</Text>
        <Text style={styles.emptyTitle}>Statistikk bygger seg opp</Text>
        <Text style={styles.emptyBody}>Statistikk vil samle seg over de neste ukene</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Statistikk</Text>

      {/* Period tabs */}
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary cards */}
      <View style={styles.cardRow}>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{tab === 'week' ? weeklyViews : '—'}</Text>
          <Text style={styles.cardLabel}>Visninger{'\n'}denne uken</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{logEntries.length}</Text>
          <Text style={styles.cardLabel}>Status-{'\n'}oppdateringer</Text>
        </View>
      </View>

      <View style={styles.cardRow}>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{busiestDay?.dayLabel ?? '—'}</Text>
          <Text style={styles.cardLabel}>Travleste{'\n'}kveld</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{peakLabel ?? '—'}</Text>
          <Text style={styles.cardLabel}>Topptid</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Køstatus per dag</Text>

      {dayHistories.length === 0 ? (
        <View style={styles.noDataBox}>
          <Text style={styles.noData}>Ingen data for denne perioden</Text>
        </View>
      ) : (
        dayHistories.map((day) => (
          <View key={day.date} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>
                {day.dayLabel} {day.date.slice(5).replace('-', '/')}
              </Text>
              {day.lastStatus && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: STATUS_COLORS[day.lastStatus] + '1a',
                      borderColor: STATUS_COLORS[day.lastStatus] + '66',
                    },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: STATUS_COLORS[day.lastStatus] }]}>
                    {STATUS_LABELS[day.lastStatus]}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.timeline}>
              {day.entries.slice(-8).map((entry) => (
                <View key={entry.id} style={styles.timelineRow}>
                  <View style={[styles.dot, { backgroundColor: STATUS_COLORS[entry.status] }]} />
                  <Text style={styles.timelineTime}>
                    {padTwo(entry.timestamp.getHours())}:{padTwo(entry.timestamp.getMinutes())}
                  </Text>
                  <Text style={styles.timelineStatus}>{STATUS_LABELS[entry.status]}</Text>
                  {entry.estimatedWait !== null && (
                    <Text style={styles.timelineWait}>~{entry.estimatedWait} min</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 },
  center: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 8, textAlign: 'center' },
  emptyBody: { fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 22 },

  header: { fontSize: 28, fontWeight: '700', color: C.text, marginBottom: 20 },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: RADIUS,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS - 4,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: C.accent,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.text },

  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: RADIUS,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardValue: { fontSize: 26, fontWeight: '700', color: C.text, marginBottom: 6 },
  cardLabel: { fontSize: 12, color: C.muted, lineHeight: 17 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.faint,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 12,
  },
  noDataBox: { paddingVertical: 24, alignItems: 'center' },
  noData: { color: C.muted, fontSize: 15 },

  dayCard: {
    backgroundColor: C.card,
    borderRadius: RADIUS,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayTitle: { fontSize: 15, fontWeight: '600', color: C.text },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  timeline: { gap: 8 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  timelineTime: { fontSize: 12, color: C.faint, width: 42 },
  timelineStatus: { fontSize: 13, color: C.muted, flex: 1 },
  timelineWait: { fontSize: 12, color: C.faint },
});
