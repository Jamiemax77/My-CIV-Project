import { QueryClientProvider } from '@tanstack/react-query';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/app/RootNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { queryClient } from './src/lib/queryClient';

export default function App() {
  useEffect(() => {
    // setBehaviorAsync is a no-op under SDK 54's edge-to-edge default (the OS
    // controls swipe-reveal behavior itself there) — only hiding the bar still applies.
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <RootNavigator />
          <StatusBar style="light" />
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
