import { router } from 'expo-router';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

// TODO: wire up Supabase account creation (see PRD 4.0).
export default function SignupScreen() {
  return (
    <Screen title="회원가입">
      <ThemedText themeColor="textSecondary">
        이메일 또는 소셜 계정으로 새 계정을 만드세요. 가입 후 신체 정보를 입력합니다.
      </ThemedText>

      <Button label="이메일로 가입" onPress={() => router.push('/(auth)/body-info')} />
      <Button
        label="카카오로 가입"
        variant="secondary"
        onPress={() => router.push('/(auth)/body-info')}
      />
      <Button
        label="구글로 가입"
        variant="secondary"
        onPress={() => router.push('/(auth)/body-info')}
      />
    </Screen>
  );
}
