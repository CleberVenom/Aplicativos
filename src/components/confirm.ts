import { Alert } from 'react-native';

/** Cross-platform confirmation dialog (React Native Web has no Alert buttons). */
export function confirmAsync(title: string, message: string, confirmLabel = 'Confirmar', destructive = false): Promise<boolean> {
  if (process.env.EXPO_OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm(`${title}\n\n${message}`) : false);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}
