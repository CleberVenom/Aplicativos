import { Image, type ImageSource } from 'expo-image';
import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { localStore } from '@/services/storage/local-store';
import { radius, spacing, useColors } from '@/theme';

import { AppText } from './app-text';
import { Icon } from './icon';

type BeforeAfterProps = {
  /** Storage path (string) or a bundled asset (`require(...)`). */
  before: string | number | ImageSource;
  after: string | number | ImageSource;
  aspectRatio: number;
  beforeLabel?: string;
  afterLabel?: string;
  accessibilityLabel: string;
};

/**
 * Drag the handle to compare the original photo with the proposal.
 * Purpose: explanation. Transform-only, driven on the UI thread by a pan gesture.
 */
function toSource(value: string | number | ImageSource): ImageSource | number {
  // Bundled assets are numbers on native and objects on web; only strings are storage paths.
  return typeof value === 'string' ? { uri: localStore.resolveUri(value) } : value;
}

export function BeforeAfter({ before, after, aspectRatio, beforeLabel = 'Antes', afterLabel = 'Depois', accessibilityLabel }: BeforeAfterProps) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const widthSv = useSharedValue(0);
  const position = useSharedValue(0);
  const start = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth(w);
    widthSv.set(w);
    position.set(w / 2);
  };

  const pan = Gesture.Pan()
    .minDistance(2)
    .onBegin(() => {
      start.set(position.get());
    })
    .onChange((e) => {
      const w = widthSv.get();
      position.set(Math.min(w, Math.max(0, start.get() + e.translationX)));
    });

  const tap = Gesture.Tap().onEnd((e) => {
    position.set(withSpring(Math.min(widthSv.get(), Math.max(0, e.x)), { duration: 300, dampingRatio: 1 }));
  });

  const clipStyle = useAnimatedStyle(() => ({ transform: [{ translateX: position.get() - widthSv.get() }] }));
  const innerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: widthSv.get() - position.get() }] }));
  const handleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: position.get() - 22 }] }));

  const label = (text: string, side: 'left' | 'right') => (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: spacing.sm,
        [side]: spacing.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: radius.full,
        backgroundColor: 'rgba(20,16,12,0.6)',
      }}>
      <AppText variant="caption" style={{ color: '#FFFFFF' }}>
        {text}
      </AppText>
    </View>
  );

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <View
        onLayout={onLayout}
        accessible
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Arraste para comparar a foto original com a proposta"
        style={{ width: '100%', aspectRatio, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.imagePlaceholder }}>
        {/* "After" fills the frame; "before" is revealed from the left. */}
        <Image source={toSource(after)} style={{ position: 'absolute', inset: 0 }} contentFit="cover" />
        {width > 0 ? (
          <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width, overflow: 'hidden' }, clipStyle]}>
            <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width }, innerStyle]}>
              <Image source={toSource(before)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            </Animated.View>
          </Animated.View>
        ) : null}
        {label(beforeLabel, 'left')}
        {label(afterLabel, 'right')}
        {width > 0 ? (
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 44, alignItems: 'center' }, handleStyle]}>
            <View style={{ flex: 1, width: 2, backgroundColor: '#FFFFFF' }} />
            <View
              style={{
                position: 'absolute',
                top: '50%',
                marginTop: -22,
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}>
              <Icon name="compare" size={20} color="#1E1915" />
            </View>
          </Animated.View>
        ) : null}
      </View>
    </GestureDetector>
  );
}
