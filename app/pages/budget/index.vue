<script setup lang="ts">
/**
 * @module app/pages/budget
 * @fileoverview Экран настройки ежемесячного бюджета
 * @description
 * Позволяет пользователю задать лимит трат на месяц.
 * Использует Zod для валидации ввода на стороне клиента.
 */
import { ref, watch, onMounted } from "vue";
import { ChevronLeft, Target } from "@lucide/vue";
import GlassInput from "~/components/GlassInput.vue";
import GlassMorphButton from "~/components/GlassMorphButton.vue";
import { budgetSchema } from "~/types/validate";
import { formatZodError } from "~/utils/zod";

const { budget, updateBudget, isLoading, error, fetchBudget } = useBudgets();

const amount = ref<number | "">(budget.value || "");
const buttonState = ref<"idle" | "loading" | "success">("idle");

watch(budget, (newVal) => {
  if (amount.value === "" && newVal > 0) {
    amount.value = newVal;
  }
});

onMounted(() => {
  fetchBudget();
});

const saveBudget = async () => {
  const result = budgetSchema.safeParse({ amount: Number(amount.value) });

  if (!result.success) {
    error.value = formatZodError(result.error);
    return;
  }

  error.value = "";
  buttonState.value = "loading";

  const success = await updateBudget(result.data.amount);

  if (success) {
    buttonState.value = "success";
    setTimeout(() => {
      buttonState.value = "idle";
    }, 1500);
  } else {
    buttonState.value = "idle";
  }
};
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Header -->
    <div class="flex items-center justify-center gap-3 relative">
      <NuxtLink
        class="w-10 h-10 absolute left-0 top-1/2 -translate-y-1/2 rounded-full glass-milky flex items-center justify-center shrink-0 border-[0.5px] border-white/50 active:scale-95 transition-transform"
        to="/settings"
      >
        <ChevronLeft class="text-text-primary -ml-px" :stroke-width="1.5" />
      </NuxtLink>
      <div class="flex flex-col text-center">
        <h1 class="text-text-primary text-xl font-bold tracking-tight">
          Бюджет и цели
        </h1>
        <p class="text-text-secondary text-xs">Планирование финансов</p>
      </div>
    </div>

    <!-- Monthly Budget -->
    <GlassCard class="p-6 flex flex-col gap-5">
      <div class="flex items-center gap-3">
        <div
          class="size-10 rounded-full glass-milky flex items-center justify-center text-text-primary"
        >
          <span class="text-xl">💰</span>
        </div>
        <div class="flex flex-col">
          <h2 class="text-text-primary font-bold">Бюджет на месяц</h2>
          <p class="text-text-secondary text-xs">Общий лимит на все траты</p>
        </div>
      </div>

      <form class="flex flex-col gap-4 mt-2" @submit.prevent="saveBudget">
        <GlassInput
          v-model="amount"
          type="number"
          step="1"
          label="Сумма"
          placeholder="Например, 60000"
          icon="₽"
        />

        <div v-if="error" class="text-text-accent text-sm text-center">
          {{ error }}
        </div>

        <GlassMorphButton
          type="submit"
          variant="primary"
          :state="buttonState"
          :disabled="isLoading || amount === '' || amount <= 0"
        >
          <span>🎯 Зафиксировать лимит</span>
        </GlassMorphButton>
      </form>
    </GlassCard>

    <!-- Goals Placeholder -->
    <GlassCard
      class="p-6 flex flex-col items-center justify-center gap-3 text-center opacity-70"
    >
      <div
        class="size-12 rounded-full glass-milky shadow-glass-inner flex items-center justify-center text-text-primary"
      >
        <Target class="size-6 text-text-secondary" />
      </div>
      <div>
        <h2 class="text-text-primary font-bold">Цели и Копилки</h2>
        <p class="text-text-secondary text-xs mt-1 max-w-50">
          Скоро здесь появится возможность создавать финансовые цели и
          откладывать деньги.
        </p>
      </div>
    </GlassCard>
  </div>
</template>
