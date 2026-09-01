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
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import 'react-native-reanimated';

import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query';
import { AppThemeProvider } from '@/lib/ThemeContext';

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

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else { setRole(null); setReady(true); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchRole(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
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
      return;
    }

    // Signed in: only redirect if the user is in the wrong place.
    // Leave stack routes like /restaurant/[id] alone.
    if (inAuth) {
      router.replace(role === 'restaurant_owner' ? '/(owner)' : '/(customer)');
    } else if (role === 'restaurant_owner' && inCustomer) {
      router.replace('/(owner)');
    } else if (role === 'customer' && inOwner) {
      router.replace('/(customer)');
    }
  }, [ready, session, role, fontsLoaded, segments]);

  if (!ready || !fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#fcf9f8' }} />;

  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Slot />
              <StatusBar style="auto" />
            </ThemeProvider>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </AppThemeProvider>
    </QueryClientProvider>
  );
}
