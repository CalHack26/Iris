import { router, type Href } from 'expo-router';
import type { FC } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import BrandAsterisk from '@/assets/icons/brand-asterisk.svg';
import Bell from '@/assets/icons/bell.svg';
import NotificationsActive from '@/assets/icons/notifications-active.svg';
import Notifications from '@/assets/icons/notifications.svg';
import SensorChart from '@/assets/icons/sensor-chart.svg';
import Speak from '@/assets/icons/speak.svg';
import { useHasUnread } from '@/store/useSomaStore';
import { colors, radii } from '@/theme/tokens';

import { Txt } from './Txt';

export type TopBarItem = 'translate' | 'sensors' | 'notifications';

/** Brand row with shortcuts to translation, sensor data and notifications; `active` highlights the current one. */
export function TopBar({ active }: { active?: TopBarItem }) {
  const unread = useHasUnread();

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
        accessibilityLabel="Home"
        onPress={() => router.navigate('/')}
        style={({ pressed }) => [styles.brand, pressed && styles.pressed]}>
        <View style={styles.symbol}>
          <BrandAsterisk />
        </View>
        <Txt size={24} weight="semibold" lh={1.45}>
          soma
        </Txt>
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
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  symbol: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
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
