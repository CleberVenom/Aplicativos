import { Fraunces_600SemiBold, Fraunces_700Bold, useFonts } from '@expo-google-fonts/fraunces';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAppStore } from '@/stores/app-store';
import { useDraftStore } from '@/stores/draft-store';
import { fontFamilies, useColors, useSchemeName } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Fraunces_600SemiBold, Fraunces_700Bold });
  const colors = useColors();
  const scheme = useSchemeName();

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    // Restore local state and find out whether the AI server is reachable.
    useAppStore.getState().loadSettings();
    useAppStore.getState().checkHealth();
    useDraftStore.getState().hydrate();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemeProvider value={navTheme}>
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerTintColor: colors.text,
            headerStyle: { backgroundColor: colors.background },
            headerTitleStyle: { fontFamily: fontFamilies.display, fontSize: 18, color: colors.text },
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Screen name="index" options={{ headerShown: false, title: 'Início' }} />
          <Stack.Screen name="consent" options={{ presentation: 'modal', title: 'Privacidade' }} />
          <Stack.Screen name="image-viewer" options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'fade' }} />
          <Stack.Screen
            name="rename"
            options={{ presentation: 'formSheet', sheetAllowedDetents: [0.5, 0.9], sheetGrabberVisible: true, headerShown: false }}
          />
          <Stack.Screen
            name="project/[id]/invite3d"
            options={{ presentation: 'formSheet', sheetAllowedDetents: [0.55, 0.9], sheetGrabberVisible: true, headerShown: false }}
          />
          <Stack.Screen name="project/[id]/adjust/[key]" options={{ presentation: 'modal', title: 'Ajustar proposta' }} />
        </Stack>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
