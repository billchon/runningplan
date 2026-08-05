import { supabase } from '@/lib/supabase';

// OAuth doesn't distinguish first-time signup from a returning login, so route by
// whether the profile (auto-created by the DB trigger, see supabase/migrations) still
// has its body-info fields unset.
export async function resolvePostAuthRoute(userId: string): Promise<'/(auth)/body-info' | '/(main)/home'> {
  const { data } = await supabase
    .from('profiles')
    .select('height_cm, weight_kg')
    .eq('id', userId)
    .maybeSingle();

  const isProfileComplete = data?.height_cm != null && data?.weight_kg != null;
  return isProfileComplete ? '/(main)/home' : '/(auth)/body-info';
}
