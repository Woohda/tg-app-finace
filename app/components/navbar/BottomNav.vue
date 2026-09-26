<script setup lang="ts">
/**
 * @module app/components/BottomNav
 * @fileoverview Нижняя панель навигации (Floating Glassmorphism Bottom Navigation)
 * @description
 * Закрепленная плавающая панель навигации на базе NuxtLink и иконок Lucide.
 * Включает левый блок (Главная, Аналитика), центральную кнопку «+» и правый блок (История, Настройки).
 */
import type { Component } from "vue";
import { Home, ChartColumn, Plus, ReceiptText, Settings } from "@lucide/vue";

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

const { openModal } = useTransactionModal();
</script>

<template>
  <div
    class="absolute left-1/2 -translate-x-1/2 w-full max-w-97 px-2.75 z-50 pointer-events-none transition-opacity duration-200"
    style="bottom: calc(1.25rem + env(safe-area-inset-bottom))"
  >
    <nav
      aria-label="Основная навигация"
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
        <GlassButton
          type="button"
          variant="soft"
          class="size-17 rounded-full flex items-center justify-center text-text-accent text-4xl font-light active:scale-90 transition-transform pointer-events-auto outline-none a11y-focus backdrop-blur-3xl"
          style="background-color: rgba(242, 242, 242, 0.9)"
          aria-label="Добавить операцию"
          @click="openModal()"
        >
          <Plus :stroke-width="2.5" />
        </GlassButton>
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
