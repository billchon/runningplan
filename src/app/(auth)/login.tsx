import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

// TODO: Kakao/Google OAuth need their own app registration (Kakao Developers / Google Cloud
// Console) plus a Supabase provider config before they can be wired up (see PRD 4.0).
export default function LoginScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.replace('/(main)/home');
  };

  const notifyComingSoon = () => Alert.alert('준비 중', '소셜 로그인은 추후 지원될 예정입니다.');

  return (
    <Screen title="로그인">
      <ThemedText themeColor="textSecondary">이메일 또는 소셜 계정으로 로그인하세요.</ThemedText>

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
        placeholder="비밀번호"
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
        label={isSubmitting ? '로그인 중...' : '이메일로 로그인'}
        onPress={handleEmailLogin}
        disabled={isSubmitting}
      />
      <Button label="카카오로 로그인" variant="secondary" onPress={notifyComingSoon} />
      <Button label="구글로 로그인" variant="secondary" onPress={notifyComingSoon} />

      <ThemedText style={styles.signupRow}>
        계정이 없으신가요?{' '}
        <Link href="/(auth)/signup">
          <ThemedText type="linkPrimary">회원가입</ThemedText>
        </Link>
      </ThemedText>
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
  signupRow: {
    marginTop: Spacing.three,
    textAlign: 'center',
  },
});
