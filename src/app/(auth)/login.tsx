import { Link, router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

// TODO: wire up Supabase email/Kakao/Google auth (see PRD 4.0).
export default function LoginScreen() {
  return (
    <Screen title="로그인">
      <ThemedText themeColor="textSecondary">이메일 또는 소셜 계정으로 로그인하세요.</ThemedText>

      <Button label="이메일로 로그인" onPress={() => router.replace('/(main)/home')} />
      <Button
        label="카카오로 로그인"
        variant="secondary"
        onPress={() => router.replace('/(main)/home')}
      />
      <Button
        label="구글로 로그인"
        variant="secondary"
        onPress={() => router.replace('/(main)/home')}
      />

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
  signupRow: {
    marginTop: Spacing.three,
    textAlign: 'center',
  },
});
