<script setup lang="ts">
/**
 * @module app/pages/split/index
 * @fileoverview Главная страница совместных трат (Splitwise)
 * @description
 * Отображает сводный баланс по всем группам, список активных групп и кнопку создания новой группы.
 * ---
 * ### Логика работы:
 * 1. Загрузка списка групп пользователя через `useSplit().fetchGroups()` при монтировании.
 * 2. Вычисление суммарного сальдо пользователя по всем группам (`totalNetBalance`).
 * 3. Отрисовка списка карточек групп `GroupCard` или пустого состояния.
 * 4. Открытие модального окна `AddGroupModal` для создания новой группы.
 */
import { ref, computed, onMounted } from "vue";

const router = useRouter();
const { groups, fetchGroups, pending } = useSplit();

const isAddGroupOpen = ref(false);

onMounted(() => {
  fetchGroups(true);
});

// Суммарный баланс по всем группам
const totalNetBalance = computed(() => {
  return groups.value.reduce((sum, g) => sum + (g.userNetBalance || 0), 0);
});

const onGroupCreated = (groupId: string) => {
  router.push(`/split/${groupId}`);
};
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Шапка страницы -->
    <PageHeader
      title="Совместные траты"
      subtitle="Сплит расходов и долгов"
      back-to="/settings"
      back-aria-label="Назад к настройкам"
      show-action
      action-aria-label="Создать группу"
      @action="isAddGroupOpen = true"
    />

    <!-- Сводная карточка общего баланса -->
    <GlassCard
      class="p-4 flex flex-col gap-1 text-center items-center justify-center"
    >
      <span class="text-text-secondary text-xs"
        >Ваш общий баланс по группам:</span
      >
      <span
        v-if="totalNetBalance > 0.01"
        class="font-bold text-accent-success tracking-tight whitespace-nowrap tabular-nums"
        :class="Math.abs(totalNetBalance) >= 10_000_000 ? 'text-xl sm:text-2xl' : 'text-2xl'"
      >
        +{{ formatAmount(totalNetBalance) }}
      </span>
      <span
        v-else-if="totalNetBalance < -0.01"
        class="font-bold text-text-accent tracking-tight whitespace-nowrap tabular-nums"
        :class="Math.abs(totalNetBalance) >= 10_000_000 ? 'text-xl sm:text-2xl' : 'text-2xl'"
      >
        -{{ formatAmount(Math.abs(totalNetBalance)) }}
      </span>
      <span v-else class="text-2xl font-bold text-text-primary whitespace-nowrap">
        0&nbsp;₽
      </span>
      <span class="text-text-secondary text-[11px]">
        {{
          totalNetBalance > 0.01
            ? "Вам должны в сумме"
            : totalNetBalance < -0.01
              ? "Вы должны в сумме"
              : "Все взаимные расчеты закрыты"
        }}
      </span>
    </GlassCard>

    <!-- Скелетон загрузки -->
    <div v-if="pending && groups.length === 0" class="flex flex-col gap-2">
      <GlassCard
        class="flex flex-col gap-3 items-center justify-between p-4 animate-pulse"
      >
        <div class="flex items-center gap-3 w-full">
          <Skeleton class="size-12" rounded="full" />
          <div class="flex flex-col gap-1.5 w-1/2">
            <Skeleton class="h-5 w-40" />
            <Skeleton class="h-3 w-30" />
          </div>
        </div>
        <div class="w-full flex items-center justify-between">
          <Skeleton class="w-15 h-3" />
          <Skeleton class="w-35 h-3" />
        </div>
      </GlassCard>
    </div>

    <!-- Пустое состояние -->
    <div
      v-else-if="groups.length === 0"
      class="p-8 text-center flex flex-col items-center justify-center gap-3 glass-card rounded-3xl"
    >
      <span class="text-4xl">🏕️</span>
      <h3 class="text-text-primary font-bold text-base">
        Нет групп совместных трат
      </h3>
      <p class="text-text-secondary text-xs max-w-64">
        Создайте группу для поездки, квартиры или встречи с друзьями, чтобы
        записывать расходы и легко делить чеки.
      </p>
      <GlassButton
        variant="primary"
        class="mt-2 text-xs py-2 px-5"
        @click="isAddGroupOpen = true"
      >
        Создать первую группу
      </GlassButton>
    </div>

    <!-- Список групп -->
    <div v-else class="flex flex-col gap-3">
      <div class="flex items-center justify-between px-1">
        <span class="text-xs font-semibold text-text-secondary">
          Ваши группы ({{ groups.length }})
        </span>
      </div>

      <GroupCard v-for="group in groups" :key="group.id" :group="group" />
    </div>

    <!-- Модалка создания группы -->
    <AddGroupModal
      :is-open="isAddGroupOpen"
      @close="isAddGroupOpen = false"
      @created="onGroupCreated"
    />
  </div>
</template>
