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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import 'react-native-reanimated';

import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query';
import { useNotificationsRealtime } from '@/lib/queries/notifications';
import { ToastProvider } from '@/lib/toast';
import { AppThemeProvider, useTheme } from '@/lib/ThemeContext';
import { hasSeenOnboarding } from '@/lib/onboarding';
import { SettingsBridge } from '@/components/SettingsBridge';
import { PushBridge } from '@/components/PushBridge';
import { SplashScreenView } from '@/components/ui/SplashScreenView';

SplashScreen.preventAutoHideAsync();

type UserRole = 'customer' | 'restaurant_owner' | null;

export default function RootLayout() {
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
    ...MaterialCommunityIcons.font,
  });

  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole]       = useState<UserRole>(null);
  const [ready, setReady]     = useState(false);
  const [navReady, setNavReady] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);
  const currentUid = useRef<string | null>(null);

  useEffect(() => {
    hasSeenOnboarding().then(setOnboardingSeen);
  }, []);

  // Orientation: unlocked at the native level (app.config.ts) — phones lock
  // to portrait here, tablets stay free to rotate. This native module isn't
  // in an existing dev-client build until it's rebuilt (`eas build --profile
  // development` / `expo run:ios|android`) — requireNativeModule() throws
  // synchronously in that case, even from inside a dynamic import()'s own
  // module evaluation, which a plain try/catch around the import doesn't
  // reliably catch under Metro. requireOptionalNativeModule() returns null
  // instead of throwing, so check with that FIRST and only import the real
  // module (and its own throwing requireNativeModule call) once we know
  // it's actually linked.
  useEffect(() => {
    (async () => {
      try {
        const { requireOptionalNativeModule } = await import('expo-modules-core');
        if (!requireOptionalNativeModule('ExpoScreenOrientation')) return;

        const ScreenOrientation = await import('expo-screen-orientation');
        const { width, height } = Dimensions.get('window');
        const isTablet = Math.min(width, height) >= 600;
        await (isTablet
          ? ScreenOrientation.unlockAsync()
          : ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP));
      } catch {
        // Belt and suspenders — skip silently on any other surprise here.
      }
    })();
  }, []);

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
    if (!ready || !fontsLoaded || onboardingSeen === null) return;
    const root = segments[0];
    const inAuth = root === '(auth)';
    const inOwner = root === '(owner)';
    const inCustomer = root === '(customer)';
    // Screens a signed-out user is allowed to sit on without being bounced.
    const openWhileOut = inAuth || root === 'legal' || root === 'onboarding';

    if (!session) {
      if (!onboardingSeen) {
        if (!openWhileOut) router.replace('/onboarding');
      } else if (!openWhileOut || root === 'onboarding') {
        router.replace('/(auth)/login');
      }
      setNavReady(true);
      return;
    }

    // Signed in but role not resolved yet — wait, don't flash the wrong group.
    if (role === null) return;

    // Signed in: only redirect if the user is in the wrong place.
    // Leave stack routes like /restaurant/[id] alone. The post-signup
    // welcome screen lives under (auth) but drives its own CTA — don't bounce.
    const onWelcome = inAuth && segments[1] === 'welcome';
    if (inAuth && !onWelcome) {
      router.replace(role === 'restaurant_owner' ? '/(owner)' : '/(customer)');
    } else if (!onWelcome && role === 'restaurant_owner' && inCustomer) {
      router.replace('/(owner)');
    } else if (role === 'customer' && inOwner) {
      router.replace('/(customer)');
    }
    setNavReady(true);
  }, [ready, session, role, fontsLoaded, segments, onboardingSeen]);

  if (!ready || !fontsLoaded || (session && role === null) || !navReady)
    return <SplashScreenView />;

  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <NavShell />
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </AppThemeProvider>
    </QueryClientProvider>
  );
}

/** Inside AppThemeProvider so react-navigation's container follows the
 *  app's light/dark choice, not just the OS — avoids a white flash on
 *  screen transitions in dark mode. */
function NavShell() {
  const { scheme, C } = useTheme();
  const navTheme =
    scheme === 'dark'
      ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: C.background } }
      : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: C.background } };
  return (
    <ThemeProvider value={navTheme}>
      <ToastProvider>
        <SettingsBridge />
        <PushBridge />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.background } }} />
      </ToastProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
