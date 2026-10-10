import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const SPRING = { duration: 400, dampingRatio: 1 } as const;

/**
 * Full-screen image with pinch-to-zoom, pan while zoomed and double tap to toggle 2x.
 * Purpose: let the user inspect details of a generated proposal.
 */
export function ZoomableImage({ uri, accessibilityLabel }: { uri: string; accessibilityLabel: string }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.set(Math.min(5, Math.max(1, savedScale.get() * e.scale)));
    })
    .onEnd(() => {
      savedScale.set(scale.get());
      if (scale.get() <= 1.01) {
        tx.set(withSpring(0, SPRING));
        ty.set(withSpring(0, SPRING));
        savedTx.set(0);
        savedTy.set(0);
      }
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      if (scale.get() <= 1) return;
      tx.set(savedTx.get() + e.translationX);
      ty.set(savedTy.get() + e.translationY);
    })
    .onEnd(() => {
      savedTx.set(tx.get());
      savedTy.set(ty.get());
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const next = scale.get() > 1 ? 1 : 2.5;
      scale.set(withSpring(next, SPRING));
      savedScale.set(next);
      if (next === 1) {
        tx.set(withSpring(0, SPRING));
        ty.set(withSpring(0, SPRING));
        savedTx.set(0);
        savedTy.set(0);
      }
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: scale.get() }],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <Animated.View style={[{ flex: 1 }, style]} accessible accessibilityLabel={accessibilityLabel} accessibilityHint="Use dois dedos para ampliar">
        <Image source={{ uri }} style={{ flex: 1 }} contentFit="contain" />
      </Animated.View>
    </GestureDetector>
  );
}
