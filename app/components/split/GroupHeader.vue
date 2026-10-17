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

defineProps<{
  group: SplitGroupDetail;
}>();

const emit = defineEmits<{
  (e: "openMembers"): void;
}>();
</script>

<template>
  <div class="w-full flex flex-col justify-center min-w-0">
    <!-- Заголовок: строго по центру экрана с ограничением 15px от кнопки «Назад» слева и 5px справа -->
    <div
      class="grid grid-cols-[minmax(55px,1fr)_auto_minmax(5px,1fr)] items-center w-full min-w-0"
    >
      <div aria-hidden="true" />
      <h1
        class="text-[21px] font-bold text-text-primary tracking-wide truncate text-center min-w-0"
        :title="group.name"
      >
        {{ group.name }}
      </h1>
      <div aria-hidden="true" />
    </div>

    <!-- Количество участников (также центрировано) -->
    <div
      class="grid grid-cols-[minmax(55px,1fr)_auto_minmax(5px,1fr)] items-center w-full min-w-0"
    >
      <div aria-hidden="true" />
      <button
        type="button"
        class="text-sm text-text-secondary hover:text-text-primary transition-colors text-center w-fit mx-auto cursor-pointer select-none a11y-focus tracking-wide truncate min-w-0"
        title="Открыть список участников"
        @click="emit('openMembers')"
      >
        {{ group.members.length }}
        {{
          pluralize(group.members.length, [
            "участник",
            "участника",
            "участников",
          ])
        }}
      </button>
      <div aria-hidden="true" />
    </div>
  </div>
</template>
