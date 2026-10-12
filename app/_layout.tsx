import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Intro } from '@/components/Intro';
import { colors } from '@/constants/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [showIntro, setShowIntro] = useState(true);

  return (
    <View style={styles.root}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="people" options={{ title: 'New message' }} />
        <Stack.Screen name="event/new" options={{ title: 'New event', presentation: 'modal' }} />
        <Stack.Screen name="org/[id]/pay" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="org/[id]/request/new"
          options={{ title: 'Spend from account', presentation: 'modal' }}
        />
      </Stack>
      {showIntro && (
        <Intro
          onReady={() => void SplashScreen.hideAsync()}
          onFinish={() => setShowIntro(false)}
        />
      )}
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
