import { Stack } from 'expo-router';
import { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Providers } from '@/components/Providers';
import { useAuthStore } from '@/store/authStore';

export default function RootLayout({ children }: { children: ReactNode }) {
  const loadAuth = useAuthStore((state) => state.loadStoredAuth);

  // Load stored auth on app start
  if (typeof window !== 'undefined') {
    loadAuth();
  }

  return (
    <SafeAreaProvider>
      <Providers>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}
        >
          {children}
        </Stack>
      </Providers>
    </SafeAreaProvider>
  );
}