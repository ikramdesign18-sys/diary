import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EntryCard } from "@/components/EntryCard";
import { EmptyState } from "@/components/EmptyState";
import { useDiary } from "@/context/DiaryContext";
import { useColors } from "@/hooks/useColors";
import { MOODS } from "@/constants/moods";
import type { Entry } from "@/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { diaries, getAllEntries } = useDiary();
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    getAllEntries().then(setAllEntries);
  }, [diaries]);

  const entriesByDate = allEntries.reduce((acc, e) => {
    const d = e.date.slice(0, 10);
    if (!acc[d]) acc[d] = [];
    acc[d].push(e);
    return acc;
  }, {} as Record<string, Entry[]>);

  const getDiaryTitle = (id: string) => diaries.find(d => d.id === id)?.title;

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );

  const selectedEntries = selectedDate ? (entriesByDate[selectedDate] ?? []) : [];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
  };

  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 88 }}>
        <View style={[styles.header, { paddingTop: topPad + 16 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Calendar</Text>
        </View>

        <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={[styles.navBtn, { backgroundColor: colors.secondary }]}>
              <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
            <Text style={[styles.monthLabel, { color: colors.foreground }]}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={[styles.navBtn, { backgroundColor: colors.secondary }]}>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={styles.dayHeaders}>
            {DAYS.map(d => (
              <Text key={d} style={[styles.dayHeader, { color: colors.mutedForeground }]}>{d}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={i} style={styles.cell} />;
              const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const hasEntries = !!entriesByDate[dateStr];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const moodEntry = entriesByDate[dateStr]?.[0];
              const mood = moodEntry ? MOODS.find(m => m.label === moodEntry.mood) : null;
              const dotColor = mood ? (colors as any)[mood.accentKey] : colors.primary;

              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.cell,
                    isSelected && { backgroundColor: colors.primary, borderRadius: 10 },
                    isToday && !isSelected && { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 10 },
                  ]}
                  onPress={() => setSelectedDate(isSelected ? null : dateStr)}
                >
                  <Text style={[
                    styles.dayNum,
                    { color: isSelected ? colors.primaryForeground : isToday ? colors.primary : colors.foreground },
                  ]}>
                    {day}
                  </Text>
                  {hasEntries && (
                    <View style={[styles.dot, { backgroundColor: isSelected ? colors.primaryForeground : dotColor }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {selectedDate && (
          <View style={styles.section}>
            <Text style={[styles.selectedLabel, { color: colors.mutedForeground }]}>
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </Text>
            {selectedEntries.length === 0 ? (
              <Text style={[styles.noEntries, { color: colors.mutedForeground }]}>No entries on this day.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {selectedEntries.map(entry => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    diaryTitle={getDiaryTitle(entry.diaryId)}
                    onPress={() => router.push(`/diary/${entry.diaryId}/entry/${entry.id}`)}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {!selectedDate && allEntries.length === 0 && (
          <View style={styles.section}>
            <EmptyState icon="calendar" title="No memories yet" subtitle="Write diary entries to see them on your calendar." />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.6 },
  calendarCard: {
    marginHorizontal: 24, borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 24,
    shadowColor: "#2C1810", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  monthNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  navBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  monthLabel: { fontSize: 17, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  dayHeaders: { flexDirection: "row", marginBottom: 8 },
  dayHeader: { flex: 1, textAlign: "center", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100/7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", paddingVertical: 2 },
  dayNum: { fontSize: 14, fontFamily: "Inter_400Regular" },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },
  section: { paddingHorizontal: 24, gap: 12 },
  selectedLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 4 },
  noEntries: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 16 },
});
