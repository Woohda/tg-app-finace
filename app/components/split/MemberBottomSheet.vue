<script setup lang="ts">
/**
 * @module app/components/split/MemberBottomSheet
 * @fileoverview Выдвижная нижняя шторка (Bottom Sheet) для выбора участника совместных трат
 * @description
 * Отображает список участников группы с поиском, аватарами-инициалами,
 * отметкой текущего пользователя «(Вы)» и блокировкой недоступных участников.
 * Построена на базе унифицированного компонента `GlassBottomSheet`.
 */
import { cn } from "~/utils/cn";
import type { SplitMember } from "~/types/split";

withDefaults(
  defineProps<{
    isOpen?: boolean;
    members: SplitMember[];
    modelValue?: string;
    title?: string;
    disabledIds?: string[];
  }>(),
  {
    isOpen: false,
    modelValue: "",
    title: "Выберите участника",
    disabledIds: () => [],
  },
);

const emit = defineEmits<{
  (e: "select", member: SplitMember): void;
  (e: "close"): void;
}>();
</script>

<template>
  <GlassBottomSheet
    :is-open="isOpen"
    :items="members"
    :model-value="modelValue"
    :disabled-ids="disabledIds"
    :title="title"
    search-placeholder="Поиск участника..."
    empty-text="Участники не найдены"
    @select="emit('select', $event)"
    @close="emit('close')"
  >
    <template #item="{ item: m, selected }">
      <div class="flex items-center min-w-0 flex-1 mr-2">
        <Avatar
          :name="m.name"
          size="sm"
          :class="
            cn(
              'mr-2 transition-colors',
              selected ? 'text-text-accent' : 'text-text-primary',
            )
          "
        />

        <div class="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            class="text-[15px] font-medium text-left truncate flex-1 min-w-0"
          >
            {{ m.name }}
          </span>
          <span
            v-if="m.is_current_user"
            class="text-text-accent font-semibold text-xs shrink-0"
          >
            (Вы)
          </span>
        </div>
      </div>
    </template>
  </GlassBottomSheet>
</template>
