import { router, type Href } from 'expo-router';
import { useEffect, type FC } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import Bell from '@/assets/icons/bell.svg';
import NotificationsActive from '@/assets/icons/notifications-active.svg';
import Notifications from '@/assets/icons/notifications.svg';
import SensorChart from '@/assets/icons/sensor-chart.svg';
import Speak from '@/assets/icons/speak.svg';
import { useHasUnread, useSomaStore } from '@/store/useSomaStore';
import { colors, radii } from '@/theme/tokens';

import { Txt } from './Txt';

type WebsiteStore = {
  draft: { editingId?: string };
  records: { id: string; note: string; tags: string[] }[];
  resetDraft: () => void;
  discardEdit?: () => void;
  updateTextRecord?: (id: string, input: { note: string; tags: string[] }) => void;
};

/** The website store predates these actions. Screens already call them. */
const store = useSomaStore as unknown as {
  getState: () => WebsiteStore;
  setState: (partial: Partial<WebsiteStore> | ((state: WebsiteStore) => Partial<WebsiteStore>)) => void;
};

if (typeof window !== 'undefined' && typeof store.getState().discardEdit !== 'function') {
  store.setState({
    discardEdit: () => {
      const { draft, resetDraft } = store.getState();
      if (draft.editingId) resetDraft();
    },
    updateTextRecord: (id, input) => {
      store.setState((state) => ({
        records: state.records.map((record) =>
          record.id === id ? { ...record, note: input.note, tags: input.tags } : record,
        ),
      }));
    },
  });
}

export type TopBarItem = 'translate' | 'sensors' | 'notifications';

/** Brand row with shortcuts to translation, sensor data and notifications; `active` highlights the current one. */
export function TopBar({ active }: { active?: TopBarItem }) {
  const unread = useHasUnread();

  useEffect(() => {
    const findLabel = (label: string) => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let textNode: Node | null;
      while ((textNode = walker.nextNode())) {
        if (textNode.textContent?.includes(label)) return textNode.parentElement;
      }
      return null;
    };

    const buttonFor = (label: string) => {
      const node = findLabel(label);
      return (node?.closest('button, [role="button"]') as HTMLElement | null) ?? null;
    };

    const syncDraw = () => {
      const drawing = Boolean(findLabel('✓ Draw'));
      for (const label of ['Turn left', 'Turn right']) {
        const button = buttonFor(label);
        if (button) button.style.display = drawing ? 'none' : '';
      }
      const hint = findLabel('Scroll zooms')?.parentElement as HTMLElement | null;
      if (hint) hint.style.display = drawing ? 'none' : '';
    };

    const place = () => {
      syncDraw();
      findLabel('Record, track, share')?.remove();

      const closing = findLabel('Your body. Your story. Your choice to share.');
      closing?.parentElement?.remove();

      const continueLabel = findLabel('Continue to symptom details');
      const shallower = findLabel('Shallower');
      const block = continueLabel?.parentElement?.parentElement;
      const depth = shallower?.parentElement?.parentElement?.parentElement;
      if (!block || !depth || block.parentElement === depth) return;
      depth.appendChild(block);
      block.style.width = '100%';
      block.style.alignSelf = 'stretch';
    };

    place();
    const timers = [200, 600, 1200].map((delay) => window.setTimeout(place, delay));
    const observer = new MutationObserver(place);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      observer.disconnect();
    };
  }, []);

  /** Tapping the page you're already on leaves it, so each icon works as a toggle. */
  const go = (item: TopBarItem, href: Href) => () => {
    if (item !== active) router.navigate(href);
    else if (router.canGoBack()) router.back();
    else router.navigate('/');
  };

  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Iris, home"
        onPress={() => router.navigate('/')}
        style={({ pressed }) => [pressed && styles.pressed]}>
        <Image source={require('@/assets/images/iris-lockup-light.png')} style={styles.lockup} resizeMode="contain" />
      </Pressable>
      <View style={styles.actions}>
        <RoundIcon
          icon={Speak}
          active={active === 'translate'}
          label="Speak symptoms: plain words to medical terms"
          onPress={go('translate', '/translate')}
        />
        <RoundIcon
          icon={SensorChart}
          active={active === 'sensors'}
          label="Wearable sensor data"
          onPress={go('sensors', '/sensors')}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unread ? 'Notifications, unread' : 'Notifications'}
          accessibilityState={{ selected: active === 'notifications' }}
          onPress={go('notifications', '/notifications')}
          style={({ pressed }) => [
            styles.round,
            !unread && active !== 'notifications' && { backgroundColor: colors.background },
            pressed && styles.pressed,
          ]}>
          {active === 'notifications' ? <NotificationsActive /> : unread ? <Notifications /> : <Bell />}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account: Alex Lee"
          onPress={() =>
            Alert.alert('Alex Lee', 'Your records stay on this device. Account settings aren’t connected yet.')
          }
          style={({ pressed }) => [styles.round, { backgroundColor: colors.sand }, pressed && styles.pressed]}>
          <Txt size={13} weight="semibold" lh={1.45}>
            AL
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

function RoundIcon({
  icon: Icon,
  active,
  label,
  onPress,
}: {
  icon: FC<SvgProps>;
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.round,
        { backgroundColor: active ? colors.accentSoft : colors.background },
        pressed && styles.pressed,
      ]}>
      <Icon />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  lockup: {
    width: 92,
    height: 76,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  round: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: { opacity: 0.7 },
});
