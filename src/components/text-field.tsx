import { TextInput, View, type TextInputProps } from 'react-native';

import { radius, spacing, typeScale, useColors } from '@/theme';

import { AppText } from './app-text';

type TextFieldProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
};

export function TextField({ label, hint, error, style, multiline, ...props }: TextFieldProps) {
  const colors = useColors();
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="subhead">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.textTertiary}
        multiline={multiline}
        style={[
          typeScale.body,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            minHeight: multiline ? 96 : 48,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <AppText variant="footnote" tone="danger" selectable>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="footnote" tone="secondary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
