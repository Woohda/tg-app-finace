<script setup lang="ts">
import type { Component } from "vue";
import { Home, ChartColumn, ReceiptText, Settings } from "@lucide/vue";

/**
 * @module app/components/BottomNav
 * @fileoverview Нижняя панель навигации (Floating Glassmorphism Bottom Navigation)
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
    label: "Транзакции",
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
    class="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-95 px-4 z-50 pointer-events-none"
  >
    <nav
      class="relative h-19 glass-milky rounded-[38px] px-4 flex items-center justify-between pointer-events-auto"
    >
      <!-- Левый блок навигации -->
      <div class="flex items-center gap-1">
        <NuxtLink
          v-for="item in leftItems"
          :key="item.name"
          :to="item.to"
          class="relative flex flex-col items-center justify-center w-15 h-15 transition-all duration-300 rounded-3xl"
          :class="
            isItemActive(item.to)
              ? 'text-accent-end'
              : 'text-text-secondary hover:text-text-primary'
          "
          :aria-label="item.label"
        >
          <!-- Активный фон (овал) -->
          <div
            v-if="isItemActive(item.to)"
            class="absolute inset-0 bg-white/40 rounded-3xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] border border-white/50 -z-10"
          />

          <component
            :is="item.icon"
            class="size-5.5 mb-1"
            :stroke-width="isItemActive(item.to) ? 2.5 : 2"
          />
          <span class="text-[10px] font-medium leading-none">{{
            item.label
          }}</span>
        </NuxtLink>
      </div>

      <!-- Центральная кнопка (Добавить транзакцию) -->
      <div class="absolute left-1/2 -top-5 -translate-x-1/2">
        <!-- Выпуклая матовая кнопка с блюром -->
        <NuxtLink
          to="/add"
          class="size-17 rounded-full flex items-center justify-center text-accent-end text-4xl font-light active:scale-90 transition-transform"
          style="
            background: linear-gradient(
              180deg,
              rgba(238, 238, 238, 1) 30%,
              rgba(238, 238, 238, 0.3) 40%,
              rgba(238, 238, 238, 0) 100%
            );
            backdrop-filter: blur(35px);
            -webkit-backdrop-filter: blur(35px);

            box-shadow:
              8px 8px 16px rgba(130, 115, 105, 0.25),
              inset 3px 3px 8px rgba(255, 255, 255, 1),
              inset -4px -4px 10px rgba(130, 115, 105, 0.15);
          "
          aria-label="Добавить операцию"
        >
          <span class="mb-1.5">+</span>
        </NuxtLink>
      </div>

      <!-- Правый блок навигации -->
      <div class="flex items-center gap-1">
        <NuxtLink
          v-for="item in rightItems"
          :key="item.name"
          :to="item.to"
          class="relative flex flex-col items-center justify-center w-15 h-15 transition-all duration-300 rounded-3xl"
          :class="
            isItemActive(item.to)
              ? 'text-accent-end'
              : 'text-text-secondary hover:text-text-primary'
          "
          :aria-label="item.label"
        >
          <!-- Активный фон (овал) -->
          <div
            v-if="isItemActive(item.to)"
            class="absolute inset-0 bg-white/40 rounded-3xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] border border-white/50 -z-10"
          />

          <component
            :is="item.icon"
            class="size-5.5 mb-1"
            :stroke-width="isItemActive(item.to) ? 2.5 : 2"
          />
          <span class="text-[10px] font-medium leading-none">{{
            item.label
          }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>
