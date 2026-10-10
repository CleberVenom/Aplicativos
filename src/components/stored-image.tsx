import { Image, type ImageContentFit } from 'expo-image';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { localStore } from '@/services/storage/local-store';
import { radius, useColors } from '@/theme';

type StoredImageProps = {
  /** Storage path (see LocalStore) or any displayable URI. */
  path: string;
  /** width / height; the view keeps this aspect ratio unless `style` sets a height. */
  aspectRatio?: number;
  contentFit?: ImageContentFit;
  rounded?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function StoredImage({ path, aspectRatio, contentFit = 'cover', rounded = true, accessibilityLabel, style, testID }: StoredImageProps) {
  const colors = useColors();
  return (
    <View
      testID={testID}
      style={[
        {
          aspectRatio,
          width: '100%',
          overflow: 'hidden',
          backgroundColor: colors.imagePlaceholder,
          borderRadius: rounded ? radius.lg : 0,
          borderCurve: 'continuous',
        },
        style,
      ]}>
      <Image
        source={{ uri: localStore.resolveUri(path) }}
        style={{ width: '100%', height: '100%' }}
        contentFit={contentFit}
        transition={200}
        accessibilityLabel={accessibilityLabel}
        accessible
      />
    </View>
  );
}
