import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '@/theme/tokens';

import { TopBar, type TopBarItem } from './TopBar';

type Props = {
  children: ReactNode;
  /** Show the brand top bar (all tab screens). */
  topBar?: boolean;
  activeTopBarItem?: TopBarItem;
};

/** Scrollable page with the design's 20pt gutter and 20pt section rhythm. */
export function Screen({ children, topBar = true, activeTopBarItem }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 4 }]}
      keyboardShouldPersistTaps="handled">
      {topBar ? (
        <Section index={0} gap={0}>
          <TopBar active={activeTopBarItem} />
        </Section>
      ) : null}
      {children}
    </ScrollView>
  );
}

/** Figma motion (Overview, node 10:5171): each block rises 6pt and fades in, staggered by 55ms. */
const enter = (index: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 6 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.bezier(0.22, 1, 0.36, 1) },
  })
    .duration(320)
    .delay(55 * index);

/** A page section that plays the design's entrance motion on mount. */
export function Section({
  children,
  index = 1,
  gap = 16,
  style,
}: {
  children: ReactNode;
  index?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View entering={enter(index)} style={[{ gap }, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: space.screen,
    paddingBottom: 12,
    gap: space.section,
  },
});
