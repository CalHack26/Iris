import { StyleSheet, View } from 'react-native';

import LocationPin from '@/assets/icons/location-pin.svg';
import { colors } from '@/theme/tokens';

import { Txt } from './Txt';

/** Sand-coloured recap of the marked location, shown at the top of each survey step. */
export function LocationRecap({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.recap}>
      <LocationPin />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt size={13} weight="semibold" numberOfLines={1}>
          {title}
        </Txt>
        <Txt size={10} color={colors.muted}>
          {detail}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  recap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 56,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.sand,
  },
});
