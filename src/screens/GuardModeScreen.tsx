import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import {
  doc,
  setDoc,
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { VenueQueueStatus, VenueStatus } from '../types';
import { useGuardMode } from '../context/GuardModeContext';
import { C, RADIUS } from '../theme';

const STATUS_LABELS: Record<VenueQueueStatus, string> = {
  lite: 'Lite kø',
  moderat: 'Moderat kø',
  lang: 'Lang kø',
  fullt: 'Fullt',
};

const STATUS_COLORS: Record<VenueQueueStatus, string> = {
  lite: C.statusGreen,
  moderat: C.statusYellow,
  lang: C.statusOrange,
  fullt: C.statusRed,
};

const DEFAULT_WAIT: Record<VenueQueueStatus, number | null> = {
  lite: null,
  moderat: 15,
  lang: 30,
  fullt: 45,
};

const ALL_STATUSES: VenueQueueStatus[] = ['lite', 'moderat', 'lang', 'fullt'];

export default function GuardModeScreen() {
  const [venueStatus, setVenueStatus] = useState<VenueStatus | null>(null);
  const { exitGuardMode } = useGuardMode();
  const venueId = auth.currentUser?.uid ?? '';

  useEffect(() => {
    return onSnapshot(doc(db, 'venueStatus', venueId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setVenueStatus({
          status: data.status,
          estimatedWait: data.estimatedWait ?? null,
          updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
        });
      }
    });
  }, [venueId]);

  const setStatus = async (status: VenueQueueStatus, customWait?: number | null) => {
    const estimatedWait = customWait !== undefined ? customWait : DEFAULT_WAIT[status];
    await setDoc(
      doc(db, 'venueStatus', venueId),
      { status, estimatedWait, updatedAt: serverTimestamp() },
      { merge: true },
    );
    await addDoc(collection(db, 'queueStatusLog'), {
      venueId,
      status,
      estimatedWait,
      timestamp: serverTimestamp(),
    });
  };

  const adjustWait = (delta: number) => {
    if (!venueStatus) return;
    const current = venueStatus.estimatedWait ?? 0;
    const newWait = Math.max(0, current + delta);
    setStatus(venueStatus.status, newWait === 0 ? null : newWait);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={exitGuardMode} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backLabel}>Hjem</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Vaktmodus</Text>
        <View style={styles.topRight} />
      </View>

      <View style={styles.body}>
        <Text style={styles.subtitle}>Velg nåværende tilstand</Text>

        <View style={styles.grid}>
          {ALL_STATUSES.map((s) => {
            const isActive = venueStatus?.status === s;
            const color = STATUS_COLORS[s];
            return (
              <TouchableOpacity
                key={s}
                style={[
                  styles.button,
                  { borderColor: isActive ? color : C.border },
                  isActive && {
                    backgroundColor: color + '22',
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.65,
                    shadowRadius: 16,
                    elevation: 12,
                  },
                ]}
                onPress={() => setStatus(s)}
                activeOpacity={0.75}
              >
                <View style={[styles.dot, { backgroundColor: isActive ? color : C.faint }]} />
                <Text style={[styles.buttonLabel, isActive && { color }]}>
                  {STATUS_LABELS[s]}
                </Text>
                {DEFAULT_WAIT[s] !== null && (
                  <Text style={[styles.buttonWait, isActive && { color: color + 'aa' }]}>
                    ~{DEFAULT_WAIT[s]} min
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {venueStatus && venueStatus.status !== 'lite' && (
          <View style={styles.waitRow}>
            <TouchableOpacity style={styles.waitAdjBtn} onPress={() => adjustWait(-5)}>
              <Text style={styles.waitAdjText}>−5 min</Text>
            </TouchableOpacity>
            <Text style={styles.waitDisplay}>
              {venueStatus.estimatedWait ? `~${venueStatus.estimatedWait} min` : 'Ingen estimat'}
            </Text>
            <TouchableOpacity style={styles.waitAdjBtn} onPress={() => adjustWait(5)}>
              <Text style={styles.waitAdjText}>+5 min</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingRight: 16,
  },
  backArrow: { fontSize: 22, color: C.accent, lineHeight: 26 },
  backLabel: { fontSize: 16, color: C.accent, fontWeight: '600' },
  topTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  topRight: { width: 80 },

  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  subtitle: { fontSize: 15, color: C.muted, textAlign: 'center', marginBottom: 32 },

  grid: { gap: 12, marginBottom: 32 },
  button: {
    borderWidth: 2,
    borderRadius: RADIUS,
    paddingVertical: 28,
    alignItems: 'center',
    backgroundColor: C.card,
    gap: 8,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  buttonLabel: { fontSize: 24, fontWeight: '700', color: C.text },
  buttonWait: { fontSize: 15, color: C.faint },

  waitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  waitAdjBtn: {
    backgroundColor: C.card,
    borderRadius: RADIUS,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  waitAdjText: { color: C.text, fontSize: 15, fontWeight: '600' },
  waitDisplay: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    minWidth: 130,
    textAlign: 'center',
  },
});
