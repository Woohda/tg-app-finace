<script setup lang="ts">
/**
 * @module app/components/shared/ConfirmDeleteModal
 * @fileoverview Универсальное модальное окно подтверждения удаления
 * @description
 * Единый переиспользуемый компонент подтверждения деструктивных действий (удаление категории,
 * регулярного платежа, группы совместных расходов, участника группы или отдельного расхода).
 * Поддерживает интерактивный морфинг кнопки удаления (`GlassMorphButton`), слот ошибки с мягким
 * информированием, предупреждающие блоки с иконкой `AlertTriangle` и тактильный отклик.
 * ---
 * ### Логика работы:
 * 1. Сброс внутреннего состояния кнопки и ошибок при каждом открытии окна.
 * 2. Отображение предупреждения `warning`, если переданы системные ограничения (например, каскадное удаление).
 * 3. Если передан асинхронный колбэк `onConfirm`, компонент автономно управляет жизненным циклом:
 *    `idle` -> `loading` -> `success` -> вызов `deleted` и `close`.
 * 4. Если передан пропс `error`, окно переключается в информационный режим с кнопкой «Понятно».
 */
import { ref, computed, watch } from "vue";
import { AlertTriangle, Flame } from "@lucide/vue";
import { Z_INDEX } from "~/utils/zIndex";

interface Props {
  isOpen: boolean;
  title?: string;
  description?: string;
  itemName?: string;
  warning?: string;
  confirmText?: string;
  cancelText?: string;
  position?: "center" | "bottom";
  zIndex?: number;
  state?: "idle" | "loading" | "success";
  loading?: boolean;
  error?: string | null;
  errorTitle?: string;
  onConfirm?: () => Promise<unknown> | unknown;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  description: undefined,
  itemName: undefined,
  warning: undefined,
  confirmText: "Удалить",
  cancelText: "Отмена",
  position: "bottom",
  zIndex: Z_INDEX.MODAL_CONFIRM,
  state: undefined,
  loading: false,
  error: null,
  errorTitle: "Удаление невозможно",
  onConfirm: undefined,
});

const emit = defineEmits<{
  (e: "close" | "cancel" | "confirm" | "deleted"): void;
}>();

const internalState = ref<"idle" | "loading" | "success">("idle");
const localError = ref<string | null>(null);

const activeError = computed(() => props.error || localError.value);

const currentButtonState = computed<"idle" | "loading" | "success">(() => {
  if (props.state) return props.state;
  if (props.loading) return "loading";
  return internalState.value;
});

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      internalState.value = "idle";
      localError.value = null;
    }
  },
);

const handleCancel = () => {
  if (currentButtonState.value !== "idle") return;
  emit("cancel");
  emit("close");
};

const handleConfirm = async () => {
  if (currentButtonState.value !== "idle") return;

  if (props.onConfirm) {
    internalState.value = "loading";
    localError.value = null;
    try {
      const res = await props.onConfirm();
      if (res === false) {
        internalState.value = "idle";
        return;
      }
      internalState.value = "success";
      setTimeout(() => {
        emit("deleted");
        emit("close");
      }, 500);
    } catch (err: unknown) {
      internalState.value = "idle";
      localError.value =
        err instanceof Error ? err.message : "Не удалось выполнить удаление";
    }
  } else {
    emit("confirm");
  }
};
</script>

<template>
  <GlassModal
    :is-open="isOpen"
    :title="activeError ? errorTitle : title"
    :position="position"
    :z-index="zIndex"
    :show-close="true"
    :disable-close="currentButtonState !== 'idle'"
    @close="handleCancel"
  >
    <div class="flex flex-col gap-3.5">
      <!-- Текстовое описание / вопрос подтверждения -->
      <div class="text-center">
        <p
          v-if="activeError"
          class="text-sm text-text-secondary leading-relaxed"
        >
          {{ activeError }}
        </p>
        <slot v-else>
          <p v-if="description" class="text-[17px] text-text-primary">
            {{ description }}
          </p>
          <p v-else-if="itemName" class="text-[17px] text-text-primary">
            Вы уверены, что хотите удалить
            <strong class="text-text-accent font-semibold"
              >«{{ itemName }}»</strong
            >?
          </p>
          <p v-else class="text-[17px] text-text-primary">
            Вы уверены, что хотите удалить этот элемент?
          </p>
        </slot>
      </div>

      <!-- Предупреждающий блок (если есть сайд-эффекты) -->
      <div
        v-if="warning && !activeError"
        class="flex items-start gap-2 text-xs text-text-secondary leading-snug p-2.5 rounded-2xl bg-text-accent/5 border border-text-accent/15"
      >
        <AlertTriangle
          class="size-6 text-text-accent shrink-0 select-none stroke-1.5 mt-0.5"
        />
        <span>{{ warning }}</span>
      </div>

      <!-- Кнопки действий -->
      <div class="pt-1">
        <!-- Состояние ошибки: одиночная кнопка подтверждения ознакомления -->
        <GlassButton
          v-if="activeError"
          variant="soft"
          class="w-full py-2.5 font-semibold text-sm"
          @click="handleCancel"
        >
          Понятно
        </GlassButton>

        <!-- Стандартное состояние подтверждения -->
        <div v-else class="flex items-center justify-end gap-2">
          <GlassButton
            type="button"
            variant="soft"
            size="sm"
            class="px-6.5 font-medium"
            :disabled="currentButtonState !== 'idle'"
            @click="handleCancel"
          >
            {{ cancelText }}
          </GlassButton>

          <GlassMorphButton
            variant="delete"
            size="sm"
            :state="currentButtonState"
            :disabled="currentButtonState !== 'idle'"
            @click="handleConfirm"
          >
            <span>{{ confirmText }}</span>
            <template #success>
              <Flame :stroke-width="1.5" />
            </template>
          </GlassMorphButton>
        </div>
      </div>
    </div>
  </GlassModal>
</template>
