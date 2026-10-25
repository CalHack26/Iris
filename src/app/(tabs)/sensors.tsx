import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import ChevronLeft from '@/assets/icons/chevron-left.svg';
import ChevronRightMuted from '@/assets/icons/chevron-right-muted.svg';
import ChevronRight from '@/assets/icons/chevron-right.svg';
import { Card } from '@/components/Card';
import { SegmentedControl } from '@/components/Controls';
import { LineChart } from '@/components/LineChart';
import { PageIntro } from '@/components/PageIntro';
import { Screen, Section } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { SENSOR_END, sensorSeries, SENSORS, type SensorRange } from '@/data/seed';
import { dateRange, dayMonth } from '@/lib/format';
import { bucketReadings, endOfToday } from '@/lib/sensors';
import type { SensorKind } from '@/lib/types';
import { useSomaStore } from '@/store/useSomaStore';
import { colors } from '@/theme/tokens';

const DAY_MS = 86_400_000;
const PERIOD_DAYS: Record<SensorRange, number> = { day: 1, week: 7, month: 30 };
const KINDS: SensorKind[] = ['heartRate', 'temperature', 'respiratory'];

export default function SensorData() {
  const [period, setPeriod] = useState<SensorRange>('week');
  const [offset, setOffset] = useState(0);
  const readings = useSomaStore((s) => s.readings);

  // Live wearable data runs up to today; without it the mock series ends on the design's date.
  const anchor = readings.length ? endOfToday() : SENSOR_END;
  const end = new Date(anchor.getTime() - offset * PERIOD_DAYS[period] * DAY_MS);
  const start = new Date(end.getTime() - (PERIOD_DAYS[period] - 1) * DAY_MS);
  const rangeLabel = period === 'day' ? `${dayMonth(end)} ${end.getFullYear()}` : dateRange(start, end);
  const mid = new Date((start.getTime() + end.getTime()) / 2);
  const axis = period === 'day' ? ['00:00', '12:00', '23:00'] : [dayMonth(start), dayMonth(mid), dayMonth(end)];

  return (
    <Screen activeTopBarItem="sensors">
      <Section index={1}>
        <PageIntro eyebrow="Indications only | Not diagnosis" title="Wearable sensor data" subtitle="Recent trends" />
      </Section>

      <Section index={2} gap={12}>
        <SegmentedControl
          value={period}
          onChange={(p) => {
            setPeriod(p);
            setOffset(0);
          }}
          options={[
            { key: 'day', label: 'Day' },
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' },
          ]}
        />
        <View style={styles.between}>
          <Txt size={13} weight="semibold" lh={1.45}>
            {rangeLabel}
          </Txt>
          <View style={styles.dateControls}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous period" hitSlop={10} onPress={() => setOffset(offset + 1)}>
              <ChevronLeft />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next period"
              accessibilityState={{ disabled: offset === 0 }}
              disabled={offset === 0}
              hitSlop={10}
              onPress={() => setOffset(offset - 1)}>
              {offset === 0 ? <ChevronRightMuted /> : <ChevronRight />}
            </Pressable>
          </View>
        </View>
      </Section>

      <Section index={3}>
        {KINDS.map((kind) => {
          const meta = SENSORS[kind];
          const live = bucketReadings(readings, kind, PERIOD_DAYS[period], end);
          const values = live?.values ?? sensorSeries(kind, period, offset);
          const lastIndex = live?.lastIndex ?? values.length - 1;
          const latestLabel =
            period === 'day'
              ? `${String(lastIndex).padStart(2, '0')}:00`
              : dayMonth(new Date(start.getTime() + lastIndex * DAY_MS));
          const fmt = (v: number) => v.toFixed(meta.decimals);
          const lo = Math.min(...values);
          const hi = Math.max(...values);
          return (
            <Card key={kind} gap={12}>
              <View style={styles.between}>
                <View style={{ gap: 3 }}>
                  <Txt size={18} weight="medium" lh={1.35}>
                    {meta.title}
                  </Txt>
                  <Txt size={11} color={colors.muted} lh={1.45}>
                    {meta.caption}
                  </Txt>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Txt size={26} weight="medium">
                    {fmt(values[lastIndex])}
                  </Txt>
                  <Txt size={11} color={colors.muted}>
                    {latestLabel}
                  </Txt>
                </View>
              </View>
              <View style={styles.chartRow}>
                <View style={styles.axis}>
                  {meta.ticks.map((t) => (
                    <Txt key={t} size={10} color={colors.muted} style={{ lineHeight: 10 }}>
                      {t.toFixed(meta.decimals)}
                    </Txt>
                  ))}
                </View>
                <View style={{ flex: 1 }}>
                  <LineChart
                    values={values}
                    min={meta.ticks[2]}
                    max={meta.ticks[0]}
                    height={80}
                    insetX={[5, 6]}
                    insetY={[4, 4]}
                    gridlines={[...meta.ticks]}
                    highlight={{ width: 20, color: colors.sage }}
                    points={values.length <= 10 ? { r: 2.25, strokeWidth: 1.5 } : undefined}
                    lineCap="round"
                  />
                </View>
              </View>
              <View style={styles.dateAxis}>
                {axis.map((a) => (
                  <Txt key={a} size={11} color={colors.muted} lh={1.45}>
                    {a}
                  </Txt>
                ))}
              </View>
              <Txt size={12} color={colors.muted} lh={1.45}>
                {period === 'day' ? 'Hourly' : 'Daily'} averages {fmt(lo)}–{fmt(hi)} {meta.unit}
              </Txt>
            </Card>
          );
        })}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateControls: { flexDirection: 'row', gap: 16 },
  chartRow: { flexDirection: 'row', gap: 12 },
  axis: { width: 32, height: 80, justifyContent: 'space-between' },
  dateAxis: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 44 },
});
