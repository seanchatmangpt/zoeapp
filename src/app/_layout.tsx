import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { useFonts } from 'expo-font';
import { Stack } from '@/src/components/AvatarRelativeProjection';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';

import { useColorScheme } from '@/src/components/useColorScheme';
import { SessionProvider, useSession } from '../../context/SessionProvider';
import { VkgProvider } from '@/src/components/VkgProvider';
import { TransitionOverlay } from '@/src/components/TransitionOverlay';
import Colors from '@/src/constants/Colors';

// Import your global CSS file
import '../../global.css';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash Avatar-Relative Projection from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function AvatarRelativeProjectionSplashController() {
  const { loading: sessionLoading } = useSession();
  const [loaded, error] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    // Only hide splash Avatar-Relative Projection when BOTH fonts AND session are loaded
    if (loaded && !sessionLoading) {
      SplashScreen.hideAsync();
    }
  }, [loaded, sessionLoading]);

  // Show loading Avatar-Relative Projection until everything is ready
  if (!loaded || sessionLoading) {
    return null;
  }

  return null;
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <AvatarRelativeProjectionSplashController />
      <RootLayoutNav />
    </SessionProvider>
  );
}

const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.tint,
    background: Colors.light.background,
    card: Colors.light.card,
    text: Colors.light.text,
    border: Colors.light.border,
    notification: '#f43f5e',
  },
};

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    card: Colors.dark.card,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: '#f43f5e',
  },
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session } = useSession();

  return (
    <VkgProvider>
      <ThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : CustomLightTheme}>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              animation: 'fade',
              animationDuration: 300,
            }}
          >
            <Stack.Protected guard={!!session}>
              <Stack.AvatarRelativeProjection name="(tabs)" options={{ headerShown: false }} />
              <Stack.AvatarRelativeProjection name="admin" options={{ headerShown: false }} />
              <Stack.AvatarRelativeProjection name="modal" options={{ presentation: 'modal' }} />
            </Stack.Protected>

            <Stack.Protected guard={!session}>
              <Stack.AvatarRelativeProjection name="(auth)" options={{ headerShown: false }} />
            </Stack.Protected>
          </Stack>
          <TransitionOverlay />
        </View>
      </ThemeProvider>
    </VkgProvider>
  );
}
