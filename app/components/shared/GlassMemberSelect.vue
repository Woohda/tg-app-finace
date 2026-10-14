<script setup lang="ts">
/**
 * @module app/components/shared/GlassMemberSelect
 * @fileoverview Селект выбора участника группы совместных трат в стиле Glassmorphism
 * @description
 * Отображает выбранного участника с инициалами и бейджем «(Вы)».
 * Использует базовый компонент `GlassSelect` и шторку `MemberBottomSheet`.
 * ---
 * ### Логика работы:
 * 1. Поиск выбранного участника по `modelValue` среди переданного списка `members`.
 * 2. Генерация аватара с инициалами участника или отображение иконки по умолчанию.
 * 3. Открытие нижней шторки `MemberBottomSheet` при клике и проброс выбранного ID через `update:modelValue`.
 */
import { computed, ref } from "vue";
import type { SplitMember } from "~/types/split";

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    members: SplitMember[];
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    disabledIds?: string[];
  }>(),
  {
    modelValue: "",
    label: undefined,
    placeholder: "Выберите участника",
    disabled: false,
    disabledIds: () => [],
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", payload: string): void;
}>();

const isSheetOpen = ref(false);

const selectedMember = computed(() =>
  props.members.find((m) => m.id === props.modelValue),
);

const handleSelect = (member: SplitMember) => {
  emit("update:modelValue", member.id);
  isSheetOpen.value = false;
};
</script>

<template>
  <GlassSelect
    v-model:is-open="isSheetOpen"
    :label="label"
    :placeholder="placeholder"
    :disabled="disabled"
    :selected="!!selectedMember"
    :display-text="selectedMember?.name"
  >
    <template #icon>
      <Avatar
        :src="selectedMember?.photo_url"
        :name="selectedMember?.name"
        size="xs"
        :class="cn('mr-2', !selectedMember && 'text-text-secondary')"
      />
    </template>

    <template #default>
      <div class="flex items-center gap-1.5 min-w-0 flex-1">
        <span
          :class="
            cn(
              'font-medium text-base truncate flex-1 min-w-0',
              selectedMember ? 'text-text-primary' : 'text-text-secondary',
            )
          "
        >
          {{ selectedMember ? selectedMember.name : placeholder }}
        </span>
        <span
          v-if="selectedMember?.is_current_user"
          class="text-text-accent font-semibold text-xs shrink-0"
        >
          (Вы)
        </span>
      </div>
    </template>

    <template #sheet="{ isOpen, close }">
      <MemberBottomSheet
        :is-open="isOpen"
        :members="members"
        :model-value="modelValue"
        :disabled-ids="disabledIds"
        :title="label || 'Выберите участника'"
        @select="handleSelect"
        @close="close"
      />
    </template>
  </GlassSelect>
</template>
