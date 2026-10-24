import { Tabs } from 'expo-router/js-tabs';

import { BottomNav } from '@/components/BottomNav';
import { colors } from '@/theme/tokens';

/**
 * Every page shares the custom bottom navigation from the design. The four tabs are Home, Body map, History and
 * Report; the remaining routes live in the same navigator so the bar stays visible on them.
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
      <Tabs.Screen name="record-symptom" options={{ href: null }} />
      <Tabs.Screen name="record/[id]" options={{ href: null }} />
      <Tabs.Screen name="translate" options={{ href: null }} />
      <Tabs.Screen name="sensors" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
