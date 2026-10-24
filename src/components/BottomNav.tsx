import { router, type Href } from 'expo-router';
import type { FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SvgProps } from 'react-native-svg';

import NavBodyActive from '@/assets/icons/nav-body-active.svg';
import NavBody from '@/assets/icons/nav-body.svg';
import NavClockActive from '@/assets/icons/nav-clock-active.svg';
import NavClock from '@/assets/icons/nav-clock.svg';
import NavHomeActive from '@/assets/icons/nav-home-active.svg';
import NavHome from '@/assets/icons/nav-home.svg';
import NavReportActive from '@/assets/icons/nav-report-active.svg';
import NavReport from '@/assets/icons/nav-report.svg';
import { colors, radii } from '@/theme/tokens';

import { Txt } from './Txt';

export type TabKey = 'home' | 'body' | 'history' | 'report';

const TABS: { key: TabKey; label: string; href: Href; icon: FC<SvgProps>; activeIcon: FC<SvgProps> }[] = [
  { key: 'home', label: 'Home', href: '/', icon: NavHome, activeIcon: NavHomeActive },
  { key: 'body', label: 'Body map', href: '/body-map', icon: NavBody, activeIcon: NavBodyActive },
  { key: 'history', label: 'History', href: '/history', icon: NavClock, activeIcon: NavClockActive },
  { key: 'report', label: 'Report', href: '/report', icon: NavReport, activeIcon: NavReportActive },
];

/** Which tab each route belongs to; routes reached from the top bar highlight none. */
const ROUTE_TAB: Record<string, TabKey | undefined> = {
  index: 'home',
  'record-symptom': 'home',
  'body-map': 'body',
  history: 'history',
  'record/[id]': 'history',
  report: 'report',
};

export function BottomNav({ routeName }: { routeName: string }) {
  const insets = useSafeAreaInsets();
  const active = ROUTE_TAB[routeName];

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar} accessibilityRole="tablist">
        {TABS.map((tab) => {
          const selected = tab.key === active;
          const Icon = selected ? tab.activeIcon : tab.icon;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={tab.label}
              onPress={() => router.navigate(tab.href)}
              style={({ pressed }) => [
                styles.item,
                selected && { backgroundColor: colors.accentSoft },
                pressed && !selected && { opacity: 0.6 },
              ]}>
              <Icon />
              <Txt
                size={11}
                weight={selected ? 'semibold' : 'regular'}
                color={selected ? colors.accent : colors.muted}
                lh={1.45}>
                {tab.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  bar: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radii.nav,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 8,
  },
  item: {
    flex: 1,
    height: 52,
    borderRadius: radii.navItem,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
});
