<script setup lang="ts">
import type { Component } from "vue";
import { Home, ChartColumn, ReceiptText, Settings } from "@lucide/vue";

/**
 * @module app/components/BottomNav
 * @fileoverview Нижняя панель навигации (Floating Neumorphic Bottom Navigation)
 * @description
 * Закрепленная плавающая панель навигации на базе NuxtLink и иконок Lucide.
 * Включает левый блок (Главная, Аналитика), центральную кнопку «+» и правый блок (История, Настройки).
 */

const route = useRoute();

interface NavItem {
  name: string;
  to: string;
  icon: Component;
  label: string;
}

const leftItems: NavItem[] = [
  { name: "home", to: "/", icon: Home, label: "Главная" },
  {
    name: "analytics",
    to: "/analytics",
    icon: ChartColumn,
    label: "Аналитика",
  },
];

const rightItems: NavItem[] = [
  {
    name: "finreports",
    to: "/finreports",
    icon: ReceiptText,
    label: "Финансовый отчет",
  },
  {
    name: "settings",
    to: "/settings",
    icon: Settings,
    label: "Настройки",
  },
];

function isItemActive(to: string): boolean {
  if (to === "/") {
    return route.path === "/";
  }
  return route.path.startsWith(to);
}
</script>

<template>
  <div
    class="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-7 z-50 pointer-events-none"
  >
    <nav
      class="relative h-16 bg-milky rounded-full shadow-neu-flat px-7 flex items-center justify-between pointer-events-auto"
    >
      <!-- Левый блок навигации -->
      <div class="flex items-center gap-6.5">
        <NuxtLink
          v-for="item in leftItems"
          :key="item.name"
          :to="item.to"
          class="flex flex-col items-center gap-1 transition-all duration-200"
          :class="
            isItemActive(item.to)
              ? 'text-sunset-mid scale-110'
              : 'text-text-secondary hover:text-text-primary'
          "
          :aria-label="item.label"
        >
          <component :is="item.icon" class="size-6.5" :stroke-width="2" />
        </NuxtLink>
      </div>

      <!-- Центральная кнопка (Добавить транзакцию) -->
      <div class="absolute left-1/2 -top-5 -translate-x-1/2">
        <NuxtLink
          to="/add"
          class="size-17 rounded-full neu-sunset-glow flex items-center justify-center text-white text-3xl font-light pb-0.5 active:scale-95 transition-transform"
          aria-label="Добавить операцию"
        >
          +
        </NuxtLink>
      </div>

      <!-- Правый блок навигации -->
      <div class="flex items-center gap-6.5">
        <NuxtLink
          v-for="item in rightItems"
          :key="item.name"
          :to="item.to"
          class="flex flex-col items-center gap-1 transition-all duration-200"
          :class="
            isItemActive(item.to)
              ? 'text-sunset-mid scale-110'
              : 'text-text-secondary hover:text-text-primary'
          "
          :aria-label="item.label"
        >
          <component :is="item.icon" class="size-6.5" :stroke-width="2" />
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>
