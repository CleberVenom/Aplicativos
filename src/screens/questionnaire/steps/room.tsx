import { View } from 'react-native';

import { OptionCard, OptionGrid } from '@/components/option-card';
import { TextField } from '@/components/text-field';
import { ROOM_TYPES } from '@/domain/catalog';
import { useDraftStore } from '@/stores/draft-store';
import { spacing } from '@/theme';

export function RoomStep() {
  const answers = useDraftStore((s) => s.answers);
  const update = useDraftStore((s) => s.updateAnswers);
  return (
    <View style={{ gap: spacing.lg }}>
      <OptionGrid>
        {ROOM_TYPES.map((room) => (
          <OptionCard
            key={room.id}
            title={room.label}
            icon={room.icon}
            selected={answers.roomType === room.id}
            onPress={() => update({ roomType: room.id, furniture: answers.roomType === room.id ? answers.furniture : {} })}
            testID={`room-${room.id}`}
          />
        ))}
      </OptionGrid>
      {answers.roomType === 'outro' ? (
        <TextField
          label="Qual é o ambiente?"
          placeholder="Ex.: lavanderia, closet, quarto de hóspedes"
          value={answers.roomTypeOther ?? ''}
          maxLength={60}
          onChangeText={(roomTypeOther) => update({ roomTypeOther })}
          testID="room-other"
        />
      ) : null}
    </View>
  );
}
