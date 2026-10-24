import { Tabs } from 'expo-router/js-tabs';

import { BottomNav } from '@/components/BottomNav';
import { colors } from '@/theme/tokens';

/**
 * Every page shares the custom bottom navigation from the design. The four tabs are Home, Body map, History and
 * Report; the remaining routes live in the same navigator so the bar stays visible on them.
 *
 * Don't hide those routes with `href: null`: in SDK 58 a focused hidden tab is redirected to the initial tab, so the
 * page would bounce back to Home. `BottomNav` renders its own four items, so declaring them adds no extra buttons.
 */
export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="history"
      tabBar={({ state }) => <BottomNav routeName={state.routes[state.index].name} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="body-map" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="report" />
      <Tabs.Screen name="record-symptom" />
      <Tabs.Screen name="record/[id]" />
      <Tabs.Screen name="translate" />
      <Tabs.Screen name="sensors" />
      <Tabs.Screen name="notifications" />
    </Tabs>
  );
}
