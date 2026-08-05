import { router } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { signInWithOAuth, type OAuthProvider } from '@/lib/oauth';
import { resolvePostAuthRoute } from '@/lib/profile';

export default function LoginScreen() {
  const [error, setError] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null);

  const handleOAuth = async (provider: OAuthProvider) => {
    setError(null);
    setPendingProvider(provider);
    try {
      const session = await signInWithOAuth(provider);
      if (session) {
        router.replace(await resolvePostAuthRoute(session.user.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setPendingProvider(null);
    }
  };

  return (
    <Screen title="로그인">
      <ThemedText themeColor="textSecondary">카카오 또는 구글 계정으로 로그인하세요.</ThemedText>

      {error && (
        <ThemedText type="small" style={{ color: '#d64545' }}>
          {error}
        </ThemedText>
      )}

      <Button
        label={pendingProvider === 'kakao' ? '카카오 로그인 중...' : '카카오로 로그인'}
        onPress={() => handleOAuth('kakao')}
        disabled={pendingProvider !== null}
      />
      <Button
        label={pendingProvider === 'google' ? '구글 로그인 중...' : '구글로 로그인'}
        variant="secondary"
        onPress={() => handleOAuth('google')}
        disabled={pendingProvider !== null}
      />
    </Screen>
  );
}
