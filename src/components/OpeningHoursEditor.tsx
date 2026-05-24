import React from 'react';
import { View, Text, TextInput, Switch, StyleSheet } from 'react-native';
import { OpeningHours, DayHours } from '../types';
import { C, RADIUS } from '../theme';

const DAY_LABELS: Record<keyof OpeningHours, string> = {
  mon: 'Mandag',
  tue: 'Tirsdag',
  wed: 'Onsdag',
  thu: 'Torsdag',
  fri: 'Fredag',
  sat: 'Lørdag',
  sun: 'Søndag',
};

const DAYS = Object.keys(DAY_LABELS) as (keyof OpeningHours)[];

interface Props {
  value: OpeningHours;
  onChange: (hours: OpeningHours) => void;
}

export default function OpeningHoursEditor({ value, onChange }: Props) {
  const updateDay = (day: keyof OpeningHours, patch: Partial<DayHours>) => {
    onChange({ ...value, [day]: { ...value[day], ...patch } });
  };

  return (
    <View style={styles.container}>
      {DAYS.map((day) => {
        const h = value[day];
        return (
          <View key={day} style={styles.row}>
            <View style={styles.labelRow}>
              <Text style={styles.dayLabel}>{DAY_LABELS[day]}</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>{h.closed ? 'Stengt' : 'Åpen'}</Text>
                <Switch
                  value={!h.closed}
                  onValueChange={(v) => updateDay(day, { closed: !v })}
                  trackColor={{ false: C.border, true: C.accent }}
                  thumbColor={C.text}
                />
              </View>
            </View>
            {!h.closed && (
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Text style={styles.timeFieldLabel}>Åpner</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={h.open}
                    onChangeText={(t) => updateDay(day, { open: t })}
                    placeholder="22:00"
                    placeholderTextColor={C.faint}
                    maxLength={5}
                  />
                </View>
                <Text style={styles.timeSep}>–</Text>
                <View style={styles.timeField}>
                  <Text style={styles.timeFieldLabel}>Stenger</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={h.close}
                    onChangeText={(t) => updateDay(day, { close: t })}
                    placeholder="03:00"
                    placeholderTextColor={C.faint}
                    maxLength={5}
                  />
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  row: {
    backgroundColor: C.card,
    borderRadius: RADIUS,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayLabel: { fontSize: 15, fontWeight: '600', color: C.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { fontSize: 13, color: C.muted },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  timeField: { flex: 1 },
  timeFieldLabel: { fontSize: 11, color: C.faint, marginBottom: 4, letterSpacing: 0.5 },
  timeInput: {
    backgroundColor: C.bg,
    color: C.text,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: C.border,
    textAlign: 'center',
  },
  timeSep: { fontSize: 18, color: C.muted, marginTop: 18 },
});
