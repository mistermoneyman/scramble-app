import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Intro, INTRO_BACKGROUND } from '@/components/Intro';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [showIntro, setShowIntro] = useState(true);

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }} />
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
    backgroundColor: INTRO_BACKGROUND,
  },
});
