import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

// TODO: decide skip policy (PRD 4.0 open issue) — currently blank fields just save as null.
export default function BodyInfoScreen() {
  const theme = useTheme();
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsSubmitting(false);
      setError('로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.');
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        height_cm: heightCm ? Number(heightCm) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
      })
      .eq('id', user.id);

    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.replace('/(main)/home');
  };

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

      {error && (
        <ThemedText type="small" themeColor="text" style={styles.error}>
          {error}
        </ThemedText>
      )}

      <Button label={isSubmitting ? '저장 중...' : '완료'} onPress={handleSubmit} disabled={isSubmitting} />
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
  error: {
    color: '#d64545',
  },
});
