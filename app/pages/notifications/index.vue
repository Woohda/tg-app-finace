<script setup lang="ts">
import {
  ChevronLeft,
  Bell,
  Trash2,
  ShieldAlert,
  ArrowDownToLine,
  ArrowUpToLine,
  BellRing,
} from "@lucide/vue";

const { history, clear } = useNotifications();

const formatDate = (isoStr: string) => {
  const date = new Date(isoStr);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

// Выбор иконки в зависимости от типа
const getIcon = (type: string) => {
  if (type === "expense") return ArrowDownToLine;
  if (type === "income") return ArrowUpToLine;
  if (type === "error") return ShieldAlert;
  return BellRing;
};

// Выбор цвета в зависимости от типа
const getColor = (type: string) => {
  if (type === "expense") return "text-red-400";
  if (type === "income") return "text-green-400";
  if (type === "error") return "text-text-accent";
  return "text-blue-400";
};
</script>

<template>
  <div class="flex flex-col h-full gap-5">
    <!-- Header -->
    <div class="flex items-center justify-center gap-3 relative shrink-0">
      <NuxtLink
        class="w-12 h-12 absolute left-0 top-1/2 -translate-y-1/2 rounded-full glass-milky flex items-center justify-center shrink-0 border-[0.5px] border-white/50 active:scale-95 transition-transform"
        to="/"
      >
        <ChevronLeft class="text-text-primary -ml-px" :stroke-width="1.5" />
      </NuxtLink>

      <GlassButton
        v-if="history.length > 0"
        variant="soft"
        size="icon"
        class="px-2 absolute right-0 top-1/2 -translate-y-1/2"
        @click="clear"
      >
        <Trash2 class="text-text-accent" :stroke-width="1.5" />
      </GlassButton>

      <div class="flex flex-col text-center">
        <h1 class="text-text-primary text-xl font-bold tracking-tight">
          Уведомления
        </h1>
        <p class="text-text-secondary text-xs">История действий</p>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto pb-safe">
      <div
        v-if="history.length === 0"
        class="flex flex-col items-center justify-center h-64 opacity-50 gap-4"
      >
        <Bell class="w-16 h-16 text-text-secondary" :stroke-width="1" />
        <p class="text-text-secondary text-center max-w-50">
          У вас пока нет новых уведомлений
        </p>
      </div>

      <div v-else class="flex flex-col gap-3">
        <TransitionGroup name="list">
          <GlassCard
            v-for="item in history"
            :key="item.id"
            class="flex items-start gap-4 p-4 shadow-sm"
          >
            <!-- Иконка -->
            <div class="mt-1 shrink-0">
              <component
                :is="getIcon(item.type)"
                class="w-5 h-5"
                :class="getColor(item.type)"
                :stroke-width="2"
              />
            </div>

            <!-- Текст -->
            <div class="flex flex-col gap-0.5 flex-1 min-w-0">
              <div class="flex justify-between items-start gap-2">
                <span class="text-sm font-bold text-text-primary truncate">{{
                  item.title
                }}</span>
                <span class="text-[10px] text-text-secondary shrink-0 pt-0.5">{{
                  formatDate(item.date)
                }}</span>
              </div>
              <span
                v-if="item.message"
                class="text-xs text-text-secondary leading-snug"
              >
                {{ item.message }}
              </span>
            </div>
          </GlassCard>
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-15px);
}
.list-leave-active {
  position: absolute;
}
</style>
