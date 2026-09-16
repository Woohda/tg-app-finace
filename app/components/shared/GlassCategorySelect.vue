<script setup lang="ts">
/**
 * @module app/components/shared/GlassCategorySelect
 * @fileoverview Выпадающий список категорий в стиле Glassmorphism
 * @description
 * Селект для выбора категории (иконка + название). Использует нативный `select`
 * стилизованный под общую дизайн-систему (glass-milky). Применяется в модальных
 * окнах и формах добавления/редактирования транзакций.
 */
import { computed } from "vue";

interface CategoryOption {
  id: string;
  name: string;
  icon?: string | null;
}

const props = defineProps<{
  modelValue?: string;
  categories: CategoryOption[];
}>();

const emits = defineEmits<{
  (e: "update:modelValue", payload: string): void;
}>();

const value = computed({
  get: () => props.modelValue || "",
  set: (val) => emits("update:modelValue", val),
});
</script>

<template>
  <div class="relative w-full">
    <select
      v-model="value"
      class="w-full glass-milky rounded-full pl-3 pr-8 py-2.25 text-text-primary font-medium text-sm outline-none shadow-glass appearance-none text-ellipsis overflow-hidden whitespace-nowrap"
    >
      <option value="" disabled>Категория</option>
      <option v-for="cat in categories" :key="cat.id" :value="cat.id">
        <template v-if="cat.icon">{{ cat.icon }}&nbsp;&nbsp;</template
        >{{ cat.name }}
      </option>
    </select>
    <div
      class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary text-sm"
    >
      ▼
    </div>
  </div>
</template>
