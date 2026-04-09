import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';

export default function RootLayout() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    authenticate();
  }, []);

  async function authenticate() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      setAuthenticated(true);
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: '体調記録を開くには認証が必要です',
      fallbackLabel: 'パスコードを使用',
      cancelLabel: 'キャンセル',
    });

    if (result.success) {
      setAuthenticated(true);
    }
    // 失敗・キャンセル時は何もしない（画面が黒いままになるが、
    // ユーザーがアプリを再起動すれば再認証できる）
  }

  if (!authenticated) return null;

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="category-edit"
        options={{ title: 'カテゴリ管理', presentation: 'modal' }}
      />
    </Stack>
  );
}
