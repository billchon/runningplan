import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

// TODO: Kakao/Google OAuth need their own app registration before they can be wired up (see PRD 4.0).
export default function SignupScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailSignup = async () => {
    setError(null);
    setIsSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (!data.session) {
      Alert.alert('이메일 확인 필요', '가입을 완료하려면 받은 이메일의 확인 링크를 눌러주세요.');
      router.replace('/(auth)/login');
      return;
    }

    router.push('/(auth)/body-info');
  };

  const notifyComingSoon = () => Alert.alert('준비 중', '소셜 가입은 추후 지원될 예정입니다.');

  return (
    <Screen title="회원가입">
      <ThemedText themeColor="textSecondary">
        이메일 또는 소셜 계정으로 새 계정을 만드세요. 가입 후 신체 정보를 입력합니다.
      </ThemedText>

      <TextInput
        placeholder="이메일"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />
      <TextInput
        placeholder="비밀번호 (6자 이상)"
        placeholderTextColor={theme.textSecondary}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />

      {error && (
        <ThemedText type="small" themeColor="text" style={styles.error}>
          {error}
        </ThemedText>
      )}

      <Button
        label={isSubmitting ? '가입 중...' : '이메일로 가입'}
        onPress={handleEmailSignup}
        disabled={isSubmitting}
      />
      <Button label="카카오로 가입" variant="secondary" onPress={notifyComingSoon} />
      <Button label="구글로 가입" variant="secondary" onPress={notifyComingSoon} />
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
