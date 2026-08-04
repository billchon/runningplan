import { Redirect } from 'expo-router';

import { useAuthStore } from '@/store/auth-store';

export default function Index() {
  const isLoading = useAuthStore((state) => state.isLoading);
  const session = useAuthStore((state) => state.session);

  if (isLoading) {
    return null;
  }

  return <Redirect href={session ? '/(main)/home' : '/(auth)/login'} />;
}
