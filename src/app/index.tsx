import { Redirect } from 'expo-router';

// TODO: check persisted Supabase session and redirect to /(main)/home when logged in.
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
