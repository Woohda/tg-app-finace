<script setup lang="ts">
/**
 * @module app/components/split/GroupHeader
 * @fileoverview Заголовок группы совместных трат
 * @description
 * Отображает название группы и интерактивный счетчик участников.
 * ---
 * ### Логика работы:
 * 1. Прием данных группы (`SplitGroupDetail`).
 * 2. Отправка события `openMembers` при клике на количество участников.
 */
import type { SplitGroupDetail } from "~/types/split";
import { pluralize } from "~/utils/format";

withDefaults(
  defineProps<{
    group: SplitGroupDetail;
    currentAuthAvatarUrl?: string | null;
  }>(),
  {
    currentAuthAvatarUrl: null,
  },
);

const emit = defineEmits<{
  (e: "openMembers" | "addMember"): void;
}>();
</script>

<template>
  <!-- Заголовок, количество участников и стек аватарок -->
  <div class="ml-16 flex flex-col min-w-0 flex-1 justify-center">
    <h1
      class="text-[22px] font-bold text-text-primary tracking-wide truncate"
      :title="group.name"
    >
      {{ group.name }}
    </h1>

    <button
      type="button"
      class="text-sm text-text-secondary hover:text-text-primary transition-colors text-left w-fit cursor-pointer select-none a11y-focus tracking-wide"
      title="Открыть список участников"
      @click="emit('openMembers')"
    >
      {{ group.members.length }}
      {{
        pluralize(group.members.length, ["участник", "участника", "участников"])
      }}
    </button>
  </div>
</template>
