<script setup lang="ts">
/**
 * @module app/components/split/DebtsOptimizedList
 * @fileoverview Оптимизированный расчет переводов между должниками и кредиторами
 * @description
 * Отображает минимальный список необходимых переводов для полного погашения долгов
 * (алгоритм Min Cash Flow) и позволяет инициировать фиксацию расчета переводом.
 * ---
 * ### Логика работы:
 * 1. Получение массива оптимизированных переводов `transfers` из входных параметров.
 * 2. Отрисовка пустого состояния при отсутствии задолженностей.
 * 3. Инициация фиксации расчета переводом через событие `settle`.
 * 4. Адаптивное распределение доступной ширины строк (защита коротких имен и "Мне"/"Я" от обрезания).
 */
import { onMounted, onUnmounted, ref, watch } from "vue";
import {
  ArrowRight,
  Send,
  Bell,
  ClockCheck,
  CircleDashedCheck,
} from "@lucide/vue";
import type { SplitDebtTransfer } from "~/types/split";

const props = withDefaults(
  defineProps<{
    transfers: SplitDebtTransfer[];
    currentMemberId?: string;
    groupId?: string;
    isNotifying?: boolean;
    notifyingTransferKey?: string | null;
  }>(),
  {
    currentMemberId: undefined,
    groupId: undefined,
    isNotifying: false,
    notifyingTransferKey: null,
  },
);

const emit = defineEmits<{
  (e: "settle" | "notify", transfer: SplitDebtTransfer): void;
}>();

const isFromMe = (t: SplitDebtTransfer): boolean => {
  return Boolean(
    (props.currentMemberId && t.fromMemberId === props.currentMemberId) ||
    t.fromMemberName.trim().toLowerCase() === "я",
  );
};

const isToMe = (t: SplitDebtTransfer): boolean => {
  return Boolean(
    (props.currentMemberId && t.toMemberId === props.currentMemberId) ||
    t.toMemberName.trim().toLowerCase() === "я",
  );
};

const getFromMemberName = (t: SplitDebtTransfer): string => {
  return isFromMe(t) ? "Я" : t.fromMemberName;
};

const getToMemberName = (t: SplitDebtTransfer): string => {
  return isToMe(t) ? "Мне" : t.toMemberName;
};

const { avatarUrl: currentAuthAvatarUrl } = useAuth();

const getFromMemberAvatar = (t: SplitDebtTransfer): string | null => {
  if (isFromMe(t) && currentAuthAvatarUrl.value) {
    return currentAuthAvatarUrl.value;
  }
  return t.fromPhotoUrl || null;
};

/**
 * Проверяет, является ли имя коротким (не требует агрессивного сжатия)
 */
const isShortName = (name: string): boolean => name.trim().length <= 5;

/**
 * Вычисляет адаптивный класс ширины для контейнера имени отправителя
 */
const getFromNameContainerClass = (t: SplitDebtTransfer): string => {
  const fromShort = isShortName(getFromMemberName(t));
  const toShort = isShortName(getToMemberName(t));

  if (fromShort && toShort) {
    return "shrink-0 max-w-[calc(50%-8px)]";
  }
  if (!fromShort && !toShort) {
    // Оба длинные: делят доступную ширину поровну без принудительного растягивания
    return "min-w-0 shrink max-w-[calc(50%-8px)]";
  }
  if (!fromShort && toShort) {
    // Отправитель длинный, получатель короткий: занимает естественную ширину без отталкивания стрелки
    return "min-w-0 shrink max-w-[calc(100%-2.5rem)]";
  }
  // Отправитель короткий, получатель длинный: отправитель не сжимается
  return "shrink-0 max-w-[calc(50%-8px)]";
};

/**
 * Вычисляет адаптивный класс ширины для имени получателя
 */
const getToNameClass = (t: SplitDebtTransfer): string => {
  const fromShort = isShortName(getFromMemberName(t));
  const toShort = isShortName(getToMemberName(t));

  if (fromShort && toShort) {
    return "shrink-0 max-w-[calc(50%-8px)]";
  }
  if (!fromShort && !toShort) {
    // Оба длинные: делят доступную ширину поровну без принудительного растягивания
    return "min-w-0 shrink max-w-[calc(50%-8px)]";
  }
  if (fromShort && !toShort) {
    // Получатель длинный, отправитель короткий: занимает естественную ширину
    return "min-w-0 shrink max-w-[calc(100%-2.5rem)]";
  }
  // Получатель короткий, отправитель длинный: получатель не сжимается
  return "shrink-0 max-w-[calc(50%-8px)]";
};

// 24 часа кулдаун между напоминаниями
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

const now = ref(Date.now());
const localNotificationTimes = ref<Record<string, number>>({});

const getStorageKey = (t: SplitDebtTransfer): string => {
  return `fino_split_notify_${props.groupId || "default"}_${t.fromMemberId}_${t.toMemberId}`;
};

const loadLocalTimes = () => {
  if (typeof window === "undefined" || !window.localStorage) return;
  const times: Record<string, number> = {};
  for (const t of props.transfers) {
    const key = getStorageKey(t);
    const val = window.localStorage.getItem(key);
    if (val) {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed)) {
        times[key] = parsed;
      }
    }
  }
  localNotificationTimes.value = times;
};

let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  loadLocalTimes();
  // Таймер обратного отсчета: каждую секунду обновляет текущее время для реактивной проверки истечения
  timer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});

watch(
  () => props.isNotifying,
  (notifying, wasNotifying) => {
    if (wasNotifying && !notifying) {
      loadLocalTimes();
    }
  },
);

const getLastNotifiedTime = (t: SplitDebtTransfer): number => {
  const storageKey = getStorageKey(t);
  return localNotificationTimes.value[storageKey] || 0;
};

/**
 * Возвращает оставшееся время кулдауна в миллисекундах
 */
const getRemainingCooldownMs = (t: SplitDebtTransfer): number => {
  const lastTime = getLastNotifiedTime(t);
  if (!lastTime) return 0;
  const elapsed = now.value - lastTime;
  const remaining = COOLDOWN_MS - elapsed;
  return remaining > 0 ? remaining : 0;
};

/**
 * Проверка истечения времени (кулдаун активен, если осталось > 0 мс)
 */
const isNotifiedRecently = (t: SplitDebtTransfer): boolean => {
  return getRemainingCooldownMs(t) > 0;
};

/**
 * Форматирование обратного отсчета таймера
 */
const formatRemainingCooldown = (ms: number): string => {
  if (ms <= 0) return "";
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return `${hours} ч. ${minutes} мин.`;
  }
  if (minutes > 0) {
    return `${minutes} мин. ${seconds} сек.`;
  }
  return `${seconds} сек.`;
};

/**
 * Всплывающая подсказка с динамическим обратным отсчетом таймера
 */
const getNotifyButtonTooltip = (t: SplitDebtTransfer): string => {
  if (isTransferNotifying(t)) {
    return "Отправляю напоминание в Telegram...";
  }
  if (isNotifiedRecently(t)) {
    const remaining = formatRemainingCooldown(getRemainingCooldownMs(t));
    return `Напоминание уже отправлено (повтор через ${remaining})`;
  }
  return `Отправить напоминание ${t.fromMemberName} в Telegram`;
};

const isTransferNotifying = (t: SplitDebtTransfer): boolean => {
  if (!props.isNotifying) return false;
  if (!props.notifyingTransferKey) return true;
  const key = `${props.groupId || "default"}:${t.fromMemberId}:${t.toMemberId}`;
  return props.notifyingTransferKey === key;
};

const handleNotifyClick = (t: SplitDebtTransfer) => {
  if (isNotifiedRecently(t) || isTransferNotifying(t)) return;
  emit("notify", t);
};
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Если все долги закрыты -->
    <div
      v-if="transfers.length === 0"
      class="flex flex-col items-center justify-center gap-1 text-center"
    >
      <span class="text-3xl">🎉</span>
      <h3 class="text-text-primary font-bold text-base">
        Все расчеты закрыты!
      </h3>
      <p class="text-text-secondary text-xs">
        В этой группе никто никому ничего не должен.
      </p>
    </div>

    <!-- Список оптимизированных переводов -->
    <div v-else class="flex flex-col gap-2">
      <GlassCard
        v-for="t in transfers"
        :key="`${t.fromMemberId}-${t.toMemberId}`"
        class="flex flex-col px-3.5 py-2.5"
      >
        <div class="flex items-center justify-between gap-2">
          <Avatar
            :src="getFromMemberAvatar(t)"
            :name="t.fromMemberName"
            size="md"
          />
          <!-- От кого и Кому -->
          <div
            class="flex flex-col gap-0.5 text-[13px] sm:text-sm font-semibold text-text-primary min-w-0 flex-1"
          >
            <div
              class="flex items-center gap-1 min-w-0 w-full overflow-hidden"
            >
              <div
                class="flex items-center gap-0.5 min-w-0 shrink"
                :class="getFromNameContainerClass(t)"
              >
                <span
                  class="text-text-accent truncate min-w-0"
                  :title="getFromMemberName(t)"
                >
                  {{ getFromMemberName(t) }}
                </span>
                <span
                  v-if="t.fromTelegramId"
                  class="text-[10px] bg-sky-500/50 text-white font-semibold p-0.75 rounded-full shrink-0"
                  title="Получит уведомление в Telegram"
                >
                  <Send class="size-2" :stroke-width="1.5" />
                </span>
              </div>

              <ArrowRight class="size-4 text-text-secondary/60 shrink-0" />

              <span
                class="text-accent-success truncate min-w-0 shrink"
                :class="getToNameClass(t)"
                :title="getToMemberName(t)"
              >
                {{ getToMemberName(t) }}
              </span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0 justify-end">
              <span
                class="text-[13px] sm:text-sm font-bold tracking-tight text-text-primary tabular-nums whitespace-nowrap"
              >
                {{ formatAmount(t.amount) }}
              </span>
            </div>
          </div>
          <div class="flex gap-1">
            <!-- Кнопка «Напомнить должнику в Telegram» — ТОЛЬКО кому переводят (кредитор) И если должник есть в Telegram -->
            <GlassButton
              v-if="isToMe(t) && Boolean(t.fromTelegramId)"
              variant="soft"
              class="h-auto p-2 flex items-center justify-center shrink-0 text-xs"
              :class="{
                'pointer-events-none':
                  isNotifiedRecently(t) || isTransferNotifying(t),
              }"
              :title="getNotifyButtonTooltip(t)"
              :aria-label="getNotifyButtonTooltip(t)"
              @click="handleNotifyClick(t)"
            >
              <component
                :is="
                  isTransferNotifying(t) || isNotifiedRecently(t)
                    ? ClockCheck
                    : Bell
                "
                class="size-4.5 shrink-0"
                :class="[
                  isNotifiedRecently(t) && !isTransferNotifying(t)
                    ? 'text-accent-success'
                    : 'text-text-accent',
                  isTransferNotifying(t) && 'animate-pulse',
                ]"
                :stroke-width="
                  isNotifiedRecently(t) && !isTransferNotifying(t) ? 2 : 1.5
                "
              />
            </GlassButton>

            <GlassButton
              variant="soft"
              class="h-auto p-2 flex items-center justify-center shrink-0 text-xs"
              title="Зафиксировать расчет"
              @click="emit('settle', t)"
            >
              <CircleDashedCheck
                class="size-4.5 text-text-accent"
                :stroke-width="1.5"
              />
            </GlassButton>
          </div>
        </div>
      </GlassCard>
    </div>
  </div>
</template>
