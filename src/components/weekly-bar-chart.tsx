import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

interface WeeklyBarChartProps {
  labels: string[];
  values: (number | null)[];
  formatValue: (value: number) => string;
  height?: number;
}

const BAR_COLOR = '#3c87f7';

export function WeeklyBarChart({ labels, values, formatValue, height = 140 }: WeeklyBarChartProps) {
  const maxValue = Math.max(1, ...values.filter((v): v is number => v != null));

  return (
    <View style={[styles.row, { height }]}>
      {values.map((value, index) => {
        const barHeight = value != null ? Math.max(4, (value / maxValue) * (height - 32)) : 4;
        return (
          <View key={index} style={styles.column}>
            {value != null && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.valueLabel}>
                {formatValue(value)}
              </ThemedText>
            )}
            <View style={[styles.bar, { height: barHeight, opacity: value != null ? 1 : 0.2 }]} />
            <ThemedText type="small" themeColor="textSecondary">
              {labels[index]}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
  },
  valueLabel: {
    fontSize: 10,
  },
  bar: {
    width: '60%',
    borderRadius: Spacing.half,
    backgroundColor: BAR_COLOR,
  },
});
