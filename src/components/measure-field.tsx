import { useState } from 'react';
import { View } from 'react-native';

import { parseMeters } from '@/utils/units';

import { TextField } from './text-field';

/** Numeric field for a room measurement in meters (accepts "3,5" or "3.5"). */
export function MeasureField({ label, value, onChange }: { label: string; value?: number; onChange: (v: number | undefined) => void }) {
  const [text, setText] = useState(value ? String(value).replace('.', ',') : '');
  const invalid = text.trim() !== '' && parseMeters(text) === undefined;
  return (
    <View style={{ flex: 1 }}>
      <TextField
        label={label}
        placeholder="m"
        keyboardType="decimal-pad"
        value={text}
        error={invalid ? 'Valor inválido' : null}
        onChangeText={(t) => {
          setText(t);
          onChange(parseMeters(t));
        }}
      />
    </View>
  );
}
