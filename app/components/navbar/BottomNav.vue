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
    class="absolute bottom-5 left-1/2 -translate-x-1/2 w-full max-w-97 px-2.75 z-50 pointer-events-none"
  >
    <nav
      class="relative h-19 glass-milky rounded-[38px] px-4 flex items-center justify-between pointer-events-auto"
    >
      <!-- Левый блок навигации -->
      <div class="flex items-center gap-1">
        <BottomNavItem
          v-for="item in leftItems"
          :key="item.name"
          :to="item.to"
          :icon="item.icon"
          :label="item.label"
          :is-active="isItemActive(item.to)"
        />
      </div>

      <!-- Центральная кнопка (Добавить транзакцию) -->
      <div class="absolute left-1/2 -top-5 -translate-x-1/2">
        <!-- Выпуклая матовая кнопка с блюром -->
        <NuxtLink
          to="/add"
          class="size-17 rounded-full flex items-center justify-center text-text-accent text-4xl font-light active:scale-90 transition-transform outline-none focus-visible:ring-2 focus-visible:ring-text-accent focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
          style="
            background: rgba(238, 238, 238, 1);
            box-shadow:
              8px 8px 16px rgba(130, 115, 105, 0.22),
              inset 3px 3px 8px rgba(255, 255, 255, 1),
              inset -4px -4px 10px rgba(130, 115, 105, 0.15);
          "
          aria-label="Добавить операцию"
        >
          <span class="text-3xl mb-1.5">+</span>
        </NuxtLink>
      </div>

      <!-- Правый блок навигации -->
      <div class="flex items-center gap-1">
        <BottomNavItem
          v-for="item in rightItems"
          :key="item.name"
          :to="item.to"
          :icon="item.icon"
          :label="item.label"
          :is-active="isItemActive(item.to)"
        />
      </div>
    </nav>
  </div>
</template>
