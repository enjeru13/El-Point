import '../global.css';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';
import {
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import 'react-native-reanimated';

import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query';
import { useNotificationsRealtime } from '@/lib/queries/notifications';
import { ToastProvider } from '@/lib/toast';
import { AppThemeProvider } from '@/lib/ThemeContext';
import { SettingsBridge } from '@/components/SettingsBridge';
import { SplashScreenView } from '@/components/ui/SplashScreenView';

SplashScreen.preventAutoHideAsync();

type UserRole = 'customer' | 'restaurant_owner' | null;

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole]       = useState<UserRole>(null);
  const [ready, setReady]     = useState(false);
  const [navReady, setNavReady] = useState(false);
  const currentUid = useRef<string | null>(null);

  useNotificationsRealtime(session?.user.id ?? null);

  // Hand off from the native (static) splash to our animated JS one as soon
  // as fonts are ready — the JS screen then bridges the remaining auth/role
  // check. The app itself (Stack) only mounts once ready+navReady, so there's
  // no flash of the wrong route in between.
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    function handle(session: Session | null) {
      setSession(session);
      const uid = session?.user.id ?? null;
      if (uid && uid !== currentUid.current) {
        // new user — clear the old role AND every cached query (profile,
        // favorites, reviews, notifications, feed...) so nothing from the
        // previous account flashes on screen before it refetches.
        currentUid.current = uid;
        setRole(null);
        queryClient.clear();
        fetchRole(uid);
      } else if (!uid) {
        currentUid.current = null;
        setRole(null);
        queryClient.clear();
        setReady(true);
      }
      // same uid (e.g. token refresh) — keep role as is
    }

    supabase.auth.getSession().then(({ data: { session } }) => handle(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => handle(session),
    );
    return () => subscription.unsubscribe();
  }, []);

  async function fetchRole(userId: string, attempt = 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    // Transient failure (e.g. no network on cold start): retry once before
    // falling back, so an owner isn't briefly routed as a customer.
    if (error && attempt === 0) {
      setTimeout(() => fetchRole(userId, 1), 900);
      return;
    }
    setRole((data?.role as UserRole) ?? 'customer');
    setReady(true);
  }

  useEffect(() => {
    if (!ready || !fontsLoaded) return;
    const root = segments[0];
    const inAuth = root === '(auth)';
    const inOwner = root === '(owner)';
    const inCustomer = root === '(customer)';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/login');
      setNavReady(true);
      return;
    }

    // Signed in but role not resolved yet — wait, don't flash the wrong group.
    if (role === null) return;

    // Signed in: only redirect if the user is in the wrong place.
    // Leave stack routes like /restaurant/[id] alone.
    if (inAuth) {
      router.replace(role === 'restaurant_owner' ? '/(owner)' : '/(customer)');
    } else if (role === 'restaurant_owner' && inCustomer) {
      router.replace('/(owner)');
    } else if (role === 'customer' && inOwner) {
      router.replace('/(customer)');
    }
    setNavReady(true);
  }, [ready, session, role, fontsLoaded, segments]);

  if (!ready || !fontsLoaded || (session && role === null) || !navReady)
    return <SplashScreenView />;

  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <ToastProvider>
                <SettingsBridge />
                <Stack screenOptions={{ headerShown: false }} />
              </ToastProvider>
              <StatusBar style="auto" />
            </ThemeProvider>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </AppThemeProvider>
    </QueryClientProvider>
  );
}
