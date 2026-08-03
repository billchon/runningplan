import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// Stands in for map / chart views until the real SDK integration lands.
export function PlaceholderBox({ label, height = 220 }: { label: string; height?: number }) {
  return (
    <ThemedView type="backgroundElement" style={[styles.box, { height }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
});
