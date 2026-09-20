<script setup lang="ts">
import {
  ChevronLeft,
  Bell,
  Trash2,
  ShieldAlert,
  BanknoteArrowDown,
  BanknoteArrowUp,
  BellRing,
  CheckCheck,
} from "@lucide/vue";

const { history, clear, hasUnread, markAllAsRead } = useNotifications();

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
  if (type === "expense") return BanknoteArrowDown;
  if (type === "income") return BanknoteArrowUp;
  if (type === "error") return ShieldAlert;
  return BellRing;
};

// Выбор цвета в зависимости от типа
const getColor = (type: string) => {
  if (type === "expense") return "text-text-accent";
  if (type === "income") return "text-green-500";
  if (type === "error") return "text-red-400";
  return "text-blue-400";
};
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Header -->
    <div class="flex items-center justify-center gap-3 relative shrink-0">
      <NuxtLink
        class="w-12 h-12 absolute left-0 top-1/2 -translate-y-1/2 rounded-full glass-milky flex items-center justify-center shrink-0 border-[0.5px] border-white/50 active:scale-95 transition-transform"
        to="/"
      >
        <ChevronLeft class="text-text-primary -ml-px" :stroke-width="1.5" />
      </NuxtLink>

      <div
        class="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1"
      >
        <ClientOnly>
          <GlassButton
            v-if="hasUnread"
            variant="soft"
            size="icon"
            class="px-2"
            @click="markAllAsRead"
          >
            <CheckCheck class="text-text-primary" :stroke-width="1.5" />
          </GlassButton>
          <GlassButton
            v-if="history.length > 0"
            variant="soft"
            size="icon"
            class="px-2"
            @click="clear"
          >
            <Trash2 class="text-text-accent" :stroke-width="1.5" />
          </GlassButton>
        </ClientOnly>
      </div>

      <div class="flex flex-col text-center">
        <h1 class="text-text-primary text-xl font-bold tracking-tight">
          Уведомления
        </h1>
        <p class="text-text-secondary text-xs">История действий</p>
      </div>
    </div>

    <!-- Content -->
    <div class="flex flex-col pb-safe">
      <ClientOnly>
        <div
          v-if="history.length === 0"
          class="flex flex-col items-center justify-center h-64 opacity-50 gap-4"
        >
          <Bell class="w-16 h-16 text-text-secondary" :stroke-width="1" />
          <p class="text-text-secondary text-center max-w-50">
            У вас пока нет новых уведомлений
          </p>
        </div>

        <div v-else class="flex flex-col gap-2.5">
          <TransitionGroup name="list">
            <GlassCard
              v-for="item in history"
              :key="item.id"
              class="flex items-center gap-3 py-2 px-4 shadow-sm relative transition-opacity duration-300"
              :class="[item.isRead ? 'opacity-60' : '']"
            >
              <!-- Индикатор непрочитанного -->
              <div
                v-if="!item.isRead"
                class="absolute inset-0 bg-linear-to-l from-accent-notification/45 to-transparent pointer-events-none rounded-[inherit]"
              />
              <!-- Иконка -->
              <div class="shrink-0">
                <component
                  :is="getIcon(item.type)"
                  class="w-6 h-6"
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
      </ClientOnly>
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
