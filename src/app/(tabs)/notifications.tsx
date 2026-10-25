import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import ArrowUpRight16 from '@/assets/icons/arrow-up-right-16.svg';
import Bell from '@/assets/icons/bell.svg';
import PlusWhite from '@/assets/icons/plus-white.svg';
import { Badge } from '@/components/Badge';
import { Card, Divider } from '@/components/Card';
import { PageIntro } from '@/components/PageIntro';
import { PillButton } from '@/components/PillButton';
import { Screen, Section } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { refreshAlerts } from '@/lib/bootstrap';
import { dayMonthLong, time } from '@/lib/format';
import { useSomaStore } from '@/store/useSomaStore';
import { colors } from '@/theme/tokens';

export default function Notifications() {
  const notifications = useSomaStore((s) => s.notifications);
  const markRead = useSomaStore((s) => s.markNotificationRead);
  const discardEdit = useSomaStore((s) => s.discardEdit);
  const unread = notifications.filter((n) => !n.read).length;

  // Pattern alerts have no live subscription, so pull the latest each time the screen opens.
  useFocusEffect(
    useCallback(() => {
      void refreshAlerts();
    }, []),
  );

  const groupDate = notifications[0] ? new Date(notifications[0].at) : new Date();
  const isToday = groupDate.toDateString() === new Date().toDateString();

  const act = (id: string, href: Href) => () => {
    markRead(id);
    router.navigate(href);
  };

  return (
    <Screen activeTopBarItem="notifications">
      <Section index={1}>
        <PageIntro title="Notifications" subtitle="Updates from your sensor and symptom logs." />
      </Section>

      <Section index={2} gap={20}>
        <View style={styles.between}>
          <Txt size={12} weight="semibold" color={colors.muted} lh={1.45}>
            {`${isToday ? 'TODAY, ' : ''}${dayMonthLong(groupDate)}`.toUpperCase()}
          </Txt>
          {unread ? <Badge tone="white">{`${unread} new`}</Badge> : null}
        </View>

        {notifications.map((n) => (
          <Card key={n.id} tone="sage">
            <View style={styles.context}>
              <Bell />
              <Txt size={14} weight="semibold">
                {n.title}
              </Txt>
              <Txt size={12} color={colors.muted} style={styles.time}>
                {time(new Date(n.at))}
              </Txt>
            </View>
            <Txt size={24} weight="medium" lh={1.35}>
              {n.message}
            </Txt>
            <Txt size={14} color={colors.muted} lh={1.45}>
              {n.detail}
            </Txt>
            <Divider />
            <PillButton
              label="enter symptoms"
              icon={PlusWhite}
              variant="primary"
              height={48}
              size={14}
              onPress={act(n.id, '/record-symptom')}
            />
            <PillButton
              label="mark pain"
              height={48}
              size={14}
              onPress={() => {
                discardEdit();
                act(n.id, '/body-map')();
              }}
            />
            <Pressable accessibilityRole="link" onPress={act(n.id, '/sensors')} style={styles.link}>
              <Txt size={13} weight="semibold">
                View sensor data
              </Txt>
              <ArrowUpRight16 />
            </Pressable>
          </Card>
        ))}

        <Card gap={8}>
          <Txt size={15} weight="semibold" lh={1.45}>
            An indication, not a diagnosis
          </Txt>
          <Txt size={13} color={colors.muted} lh={1.45}>
            Sensor fit and activity can affect readings. This illustrative notice does not confirm a health condition.
          </Txt>
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  context: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { flex: 1, textAlign: 'right' },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 24 },
});
