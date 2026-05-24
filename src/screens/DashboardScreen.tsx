import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  addDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { QueueEntry, VenueQueueStatus, VenueStatus } from '../types';
import { useGuardMode } from '../context/GuardModeContext';
import { C, RADIUS } from '../theme';

function isReminderTime() {
  const day = new Date().getDay(); // 4=Thu, 5=Fri, 6=Sat
  const hour = new Date().getHours();
  return (day === 4 || day === 5 || day === 6) && hour >= 17;
}

async function maybeSendReminderNotification(venueName: string) {
  if (Platform.OS !== 'web' || !('Notification' in window)) return;
  const key = `venue_reminder_${new Date().toDateString()}`;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');
  if (Notification.permission === 'granted') {
    new Notification('Nightly — Husk oppdatering', {
      body: `Sjekk pulsen i ${venueName} i dag — oppdater status for kvelden`,
      icon: '/favicon.ico',
    });
  } else if (Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      new Notification('Nightly — Husk oppdatering', {
        body: `Sjekk pulsen i ${venueName} i dag — oppdater status for kvelden`,
        icon: '/favicon.ico',
      });
    }
  }
}

const DEFAULT_WAIT: Record<VenueQueueStatus, number | null> = {
  lite: null,
  moderat: 15,
  lang: 30,
  fullt: 45,
};

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

const ALL_STATUSES: VenueQueueStatus[] = ['lite', 'moderat', 'lang', 'fullt'];

export default function DashboardScreen() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [venueStatus, setVenueStatus] = useState<VenueStatus | null>(null);
  const [weeklyViews, setWeeklyViews] = useState(0);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showReminderBanner, setShowReminderBanner] = useState(false);
  const [venueName, setVenueName] = useState('');
  const { enterGuardMode } = useGuardMode();
  const venueId = auth.currentUser?.uid ?? '';

  useEffect(() => {
    const q = query(
      collection(db, 'queue'),
      where('venueId', '==', venueId),
      where('status', '==', 'waiting'),
    );
    return onSnapshot(q, (snap) => {
      const entries: QueueEntry[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<QueueEntry, 'id'>),
        addedAt: d.data().addedAt?.toDate?.() ?? new Date(),
      }));
      setQueue(entries);
      setLoading(false);
    });
  }, [venueId]);

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

  useEffect(() => {
    return onSnapshot(doc(db, 'venueStats', venueId), (snap) => {
      if (snap.exists()) setWeeklyViews(snap.data().weeklyViews ?? 0);
    });
  }, [venueId]);

  useEffect(() => {
    if (!venueId) return;
    getDoc(doc(db, 'venues', venueId)).then((snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const name = data.name ?? '';
      setVenueName(name);
      if (!data.onboarded) setShowOnboarding(true);
      if (isReminderTime()) {
        setShowReminderBanner(true);
        maybeSendReminderNotification(name);
      }
    });
  }, [venueId]);

  const setVenueQueueStatus = async (status: VenueQueueStatus, customWait?: number | null) => {
    const estimatedWait = customWait !== undefined ? customWait : DEFAULT_WAIT[status];
    await setDoc(
      doc(db, 'venueStatus', venueId),
      { status, estimatedWait, updatedAt: serverTimestamp() },
      { merge: true },
    );
    await updateDoc(doc(db, 'venues', venueId), {
      queueStatus: status,
      queueEstimate: estimatedWait ?? null,
    });
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
    setVenueQueueStatus(venueStatus.status, newWait === 0 ? null : newWait);
  };

  const admit = (id: string) => updateDoc(doc(db, 'queue', id), { status: 'admitted' });
  const remove = (id: string) => updateDoc(doc(db, 'queue', id), { status: 'removed' });

  const openGuardModal = () => {
    setPin('');
    setPinError('');
    setShowPinModal(true);
  };

  const dismissOnboarding = async () => {
    setShowOnboarding(false);
    await updateDoc(doc(db, 'venues', venueId), { onboarded: true });
  };

  const verifyPin = async () => {
    const snap = await getDoc(doc(db, 'venueSettings', venueId));
    const storedPin = snap.exists() ? (snap.data().guardPin ?? '1234') : '1234';
    if (pin === storedPin) {
      setShowPinModal(false);
      enterGuardMode();
    } else {
      setPinError('Feil PIN-kode');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.text} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Onboarding modal */}
      <Modal visible={showOnboarding} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.onboardingBox}>
            <Text style={styles.onboardingTitle}>Velkommen til Nightly ✦</Text>
            <Text style={styles.onboardingText}>
              Her styrer du hva brukere ser om stedet ditt i sanntid. Jo mer du oppdaterer, jo mer synlig blir du.
            </Text>
            <View style={styles.onboardingSteps}>
              <View style={styles.onboardingStep}>
                <Text style={styles.onboardingStepIcon}>◎</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.onboardingStepTitle}>Oppdater køstatus</Text>
                  <Text style={styles.onboardingStepDesc}>Lite kø, moderat eller fullt — vises direkte på kartet</Text>
                </View>
              </View>
              <View style={styles.onboardingStep}>
                <Text style={styles.onboardingStepIcon}>✦</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.onboardingStepTitle}>Skriv kveldsmelding</Text>
                  <Text style={styles.onboardingStepDesc}>Fortell hva som skjer i kveld — DJ, tema, tilbud</Text>
                </View>
              </View>
              <View style={styles.onboardingStep}>
                <Text style={styles.onboardingStepIcon}>↗</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.onboardingStepTitle}>Få mer synlighet</Text>
                  <Text style={styles.onboardingStepDesc}>Aktive steder vises sterkere i byens puls</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.onboardingBtn} onPress={dismissOnboarding}>
              <Text style={styles.onboardingBtnText}>Kom i gang</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showPinModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Vaktmodus</Text>
            <Text style={styles.modalSub}>Skriv inn PIN-kode</Text>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={(t) => { setPin(t); setPinError(''); }}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              placeholder="••••"
              placeholderTextColor={C.faint}
              autoFocus
            />
            {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
            <TouchableOpacity style={styles.pinConfirmBtn} onPress={verifyPin}>
              <Text style={styles.pinConfirmText}>Fortsett</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPinModal(false)}>
              <Text style={styles.cancelText}>Avbryt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <FlatList
        data={queue}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {showReminderBanner && (
              <TouchableOpacity style={styles.reminderBanner} onPress={() => setShowReminderBanner(false)} activeOpacity={0.85}>
                <Text style={styles.reminderIcon}>🔔</Text>
                <Text style={styles.reminderText}>Husk å oppdatere status og kveldsmelding for i kveld</Text>
                <Text style={styles.reminderClose}>✕</Text>
              </TouchableOpacity>
            )}
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.header}>Kø</Text>
                <Text style={styles.count}>{queue.length} venter</Text>
              </View>
              <TouchableOpacity style={styles.guardBtn} onPress={openGuardModal}>
                <Text style={styles.guardBtnArrow}>→</Text>
                <Text style={styles.guardBtnText}>Vaktmodus</Text>
              </TouchableOpacity>
            </View>

            {weeklyViews > 0 && (
              <View style={styles.viewsCard}>
                <Text style={styles.viewsCount}>{weeklyViews}</Text>
                <Text style={styles.viewsLabel}>har sett stedet ditt denne uken</Text>
              </View>
            )}

            <Text style={styles.sectionLabel}>Stedsstatus</Text>
            <View style={styles.statusGrid}>
              {ALL_STATUSES.map((s) => {
                const isActive = venueStatus?.status === s;
                const color = STATUS_COLORS[s];
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusBtn,
                      isActive && {
                        borderColor: color,
                        borderWidth: 2,
                        shadowColor: color,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.55,
                        shadowRadius: 10,
                        elevation: 8,
                      },
                    ]}
                    onPress={() => setVenueQueueStatus(s)}
                  >
                    <View style={[styles.statusDot, { backgroundColor: color }]} />
                    <Text style={styles.statusBtnText}>{STATUS_LABELS[s]}</Text>
                    {DEFAULT_WAIT[s] !== null && (
                      <Text style={styles.statusDefaultWait}>~{DEFAULT_WAIT[s]} min</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {venueStatus && (
              <View style={styles.currentStatusRow}>
                <View style={[styles.statusIndicator, { backgroundColor: STATUS_COLORS[venueStatus.status] }]} />
                <Text style={styles.currentStatusText}>{STATUS_LABELS[venueStatus.status]}</Text>
                {venueStatus.status !== 'lite' && (
                  <View style={styles.waitAdjust}>
                    <TouchableOpacity style={styles.waitAdjBtn} onPress={() => adjustWait(-5)}>
                      <Text style={styles.waitAdjBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.waitValue}>
                      {venueStatus.estimatedWait ? `~${venueStatus.estimatedWait} min` : 'Ingen estimat'}
                    </Text>
                    <TouchableOpacity style={styles.waitAdjBtn} onPress={() => adjustWait(5)}>
                      <Text style={styles.waitAdjBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.sectionLabel}>Kø nå</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.position}>#{index + 1}</Text>
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>Gruppe på {item.partySize}</Text>
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.admitBtn} onPress={() => admit(item.id)}>
                <Text style={styles.admitText}>Slipp inn</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeBtn} onPress={() => remove(item.id)}>
                <Text style={styles.removeText}>Fjern</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Ingen i køen</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 16 },
  center: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  header: { fontSize: 28, fontWeight: '700', color: C.text, marginBottom: 4 },
  count: { fontSize: 14, color: C.muted, letterSpacing: 0.5 },
  guardBtn: {
    backgroundColor: C.card,
    borderRadius: RADIUS,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: C.accent + '66',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guardBtnArrow: { color: C.accent, fontSize: 15, fontWeight: '700' },
  guardBtnText: { color: C.accent, fontSize: 13, fontWeight: '600' },

  viewsCard: {
    backgroundColor: C.card,
    borderRadius: RADIUS,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  viewsCount: { fontSize: 28, fontWeight: '700', color: C.accent },
  viewsLabel: { fontSize: 13, color: C.muted, flex: 1 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.faint,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  statusBtn: {
    flexBasis: '48%',
    flex: 1,
    backgroundColor: C.card,
    borderRadius: RADIUS,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    gap: 5,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusBtnText: { color: C.text, fontSize: 13, fontWeight: '600' },
  statusDefaultWait: { color: C.faint, fontSize: 11 },

  currentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.card,
    borderRadius: RADIUS,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  statusIndicator: { width: 10, height: 10, borderRadius: 5 },
  currentStatusText: { color: C.text, fontSize: 14, fontWeight: '600', flex: 1 },
  waitAdjust: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  waitAdjBtn: {
    backgroundColor: C.border,
    borderRadius: 8,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitAdjBtnText: { color: C.text, fontSize: 16, fontWeight: '700' },
  waitValue: { color: C.text, fontSize: 12, fontWeight: '600', minWidth: 80, textAlign: 'center' },

  card: {
    backgroundColor: C.card,
    borderRadius: RADIUS,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: C.border,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  position: { fontSize: 18, fontWeight: '700', color: C.faint, width: 30 },
  name: { fontSize: 16, fontWeight: '600', color: C.text },
  meta: { fontSize: 13, color: C.muted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  admitBtn: {
    backgroundColor: C.accent,
    borderRadius: RADIUS,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  admitText: { color: C.text, fontWeight: '700', fontSize: 13 },
  removeBtn: {
    borderRadius: RADIUS,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  removeText: { color: C.muted, fontWeight: '600', fontSize: 13 },

  empty: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { color: C.faint, fontSize: 16 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: C.card,
    borderRadius: RADIUS,
    padding: 28,
    width: 300,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 6 },
  modalSub: { fontSize: 14, color: C.muted, marginBottom: 20 },
  pinInput: {
    backgroundColor: C.bg,
    borderRadius: RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    color: C.text,
    letterSpacing: 8,
    textAlign: 'center',
    width: '100%',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  pinError: { color: C.statusRed, fontSize: 13, marginBottom: 8 },
  pinConfirmBtn: {
    backgroundColor: C.accent,
    borderRadius: RADIUS,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  pinConfirmText: { color: C.text, fontWeight: '700', fontSize: 16 },
  cancelText: { color: C.faint, fontSize: 14 },

  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.accent + '18',
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: C.accent + '44',
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  reminderIcon: { fontSize: 16 },
  reminderText: { flex: 1, color: C.text, fontSize: 13, fontWeight: '500', lineHeight: 18 },
  reminderClose: { color: C.faint, fontSize: 14, fontWeight: '700' },

  onboardingBox: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 28,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: C.accent + '44',
  },
  onboardingTitle: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 12, textAlign: 'center' },
  onboardingText: { fontSize: 14, color: C.muted, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  onboardingSteps: { gap: 16, marginBottom: 28 },
  onboardingStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  onboardingStepIcon: { fontSize: 20, color: C.accent, width: 28, textAlign: 'center', marginTop: 2 },
  onboardingStepTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 3 },
  onboardingStepDesc: { fontSize: 13, color: C.muted, lineHeight: 18 },
  onboardingBtn: {
    backgroundColor: C.accent,
    borderRadius: RADIUS,
    paddingVertical: 16,
    alignItems: 'center',
  },
  onboardingBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
});
