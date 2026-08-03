import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// TODO: persist height_cm / weight_kg to USERS table (see PRD 10 ERD); decide skip policy (PRD 4.0 open issue).
export default function BodyInfoScreen() {
  const theme = useTheme();
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');

  return (
    <Screen title="신체 정보 입력">
      <ThemedText themeColor="textSecondary">
        적정 운동량 제안 등에 활용됩니다. (개인정보 처리방침 안내 필요)
      </ThemedText>

      <TextInput
        placeholder="키 (cm)"
        placeholderTextColor={theme.textSecondary}
        keyboardType="numeric"
        value={heightCm}
        onChangeText={setHeightCm}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />
      <TextInput
        placeholder="몸무게 (kg)"
        placeholderTextColor={theme.textSecondary}
        keyboardType="numeric"
        value={weightKg}
        onChangeText={setWeightKg}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />

      <Button label="완료" onPress={() => router.replace('/(main)/home')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
});
