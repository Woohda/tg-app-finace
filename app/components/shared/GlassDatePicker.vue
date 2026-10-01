<script setup lang="ts">
/**
 * @module app/components/shared/GlassDatePicker
 * @fileoverview Кастомный селектор даты в стиле Glassmorphism (кнопка-триггер + шторка календаря)
 * @description
 * Полностью заменяет нативный <input type="date"> Safari/Chrome:
 * 1. Отображает дату компактно и эстетично в формате DD.MM.YYYY (или плейсхолдер).
 * 2. По тапу открывает аккуратную стеклянную шторку (GlassModal position="bottom").
 * 3. Предоставляет быстрые кнопки («Сегодня», «Вчера»), навигацию по месяцам и сетку дней недели.
 * 4. Сопровождается тактильным откликом Telegram WebApp Haptics при выборе дня.
 * 5. Отдаёт стандартную дату в формате YYYY-MM-DD через v-model.
 */
import { ref, computed, watch } from "vue";
import { Calendar, ChevronLeft, ChevronRight } from "@lucide/vue";
import { cn } from "~/utils/cn";
import { Z_INDEX } from "~/utils/zIndex";
import { formatDateISO, getPastDateISO, toSafeDate } from "~/utils/date";

const props = withDefaults(
  defineProps<{
    modelValue?: string | null;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    zIndex?: number;
    dateFormat?: "numeric" | "text";
  }>(),
  {
    modelValue: "",
    label: undefined,
    placeholder: "Выберите дату",
    disabled: false,
    zIndex: Z_INDEX.DATE_PICKER,
    dateFormat: "text",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const isModalOpen = ref(false);

// Текущий просматриваемый месяц и год в календаре
const viewDate = ref(new Date());

const monthNames = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

/** Сокращенные названия месяцев (3-4 буквы с точкой согласно правилам) */
const shortMonthNames = [
  "янв.",
  "февр.",
  "мар.",
  "апр.",
  "мая",
  "июн.",
  "июл.",
  "авг.",
  "сент.",
  "окт.",
  "нояб.",
  "дек.",
];

const weekDayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

// Синхронизируем просматриваемый месяц с выбранным значением при открытии
watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      viewDate.value = toSafeDate(val);
    }
  },
  { immediate: true },
);

const viewYear = computed(() => viewDate.value.getFullYear());
const viewMonth = computed(() => viewDate.value.getMonth());

const currentMonthLabel = computed(() => {
  return `${monthNames[viewMonth.value]} ${viewYear.value}`;
});

/**
 * Формат отображения даты в кнопке-триггере:
 * - 'numeric': DD.MM.YYYY (например: "01.10.2026")
 * - 'text': DD мес. YYYY (например: "01 окт. 2026", "15 февр. 2026", "01 сент. 2026")
 */
const displayDate = computed(() => {
  if (!props.modelValue) return "";
  const str = String(props.modelValue).trim();

  let dayStr = "";
  let monthIdx = 0;
  let yearStr = "";

  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match && match[1] && match[2] && match[3]) {
    yearStr = match[1];
    monthIdx = parseInt(match[2], 10) - 1;
    dayStr = match[3];
  } else {
    const parsed = toSafeDate(str);
    if (!isNaN(parsed.getTime())) {
      dayStr = String(parsed.getDate()).padStart(2, "0");
      monthIdx = parsed.getMonth();
      yearStr = String(parsed.getFullYear());
    } else {
      return str;
    }
  }

  if (props.dateFormat === "numeric") {
    const monthNum = String(monthIdx + 1).padStart(2, "0");
    return `${dayStr}.${monthNum}.${yearStr}`;
  }

  // 'text': DD 3-4 буквы месяца. YYYY
  const monthLabel = shortMonthNames[monthIdx] || "";
  return `${dayStr} ${monthLabel} ${yearStr}`.trim();
});

const todayIso = computed(() => formatDateISO());
const yesterdayIso = computed(() => getPastDateISO(1));
const selectedIso = computed(() => {
  if (!props.modelValue) return "";
  return formatDateISO(toSafeDate(props.modelValue));
});

// Навигация по месяцам
const prevMonth = () => {
  viewDate.value = new Date(viewYear.value, viewMonth.value - 1, 1);
  triggerHaptic("light");
};

const nextMonth = () => {
  viewDate.value = new Date(viewYear.value, viewMonth.value + 1, 1);
  triggerHaptic("light");
};

/**
 * Генерация дней сетки (Пн..Вс) с днями соседних месяцев для заполнения строк
 */
const calendarDays = computed(() => {
  const year = viewYear.value;
  const month = viewMonth.value;

  const firstDay = new Date(year, month, 1);
  // Пн = 0, Вс = 6
  const startDayOfWeek = (firstDay.getDay() + 6) % 7;

  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: Array<{
    dayNumber: number;
    isoDate: string;
    isCurrentMonth: boolean;
  }> = [];

  // Дни предыдущего месяца
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const d = new Date(year, month - 1, day);
    days.push({
      dayNumber: day,
      isoDate: formatDateISO(d),
      isCurrentMonth: false,
    });
  }

  // Дни текущего месяца
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const curr = new Date(year, month, d);
    days.push({
      dayNumber: d,
      isoDate: formatDateISO(curr),
      isCurrentMonth: true,
    });
  }

  // Дни следующего месяца для завершения сетки
  const remainder = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remainder; d++) {
    const next = new Date(year, month + 1, d);
    days.push({
      dayNumber: d,
      isoDate: formatDateISO(next),
      isCurrentMonth: false,
    });
  }

  return days;
});

const triggerHaptic = (style: "light" | "medium" = "light") => {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style);
  } catch {
    // Игнорируем в обычном браузере
  }
};

const openDatePicker = () => {
  if (props.disabled) return;
  if (
    typeof document !== "undefined" &&
    document.activeElement instanceof HTMLElement
  ) {
    document.activeElement.blur();
  }
  if (props.modelValue) {
    viewDate.value = toSafeDate(props.modelValue);
  } else {
    viewDate.value = new Date();
  }
  isModalOpen.value = true;
};

const closeDatePicker = () => {
  isModalOpen.value = false;
};

const selectDate = (isoDate: string) => {
  triggerHaptic("medium");
  emit("update:modelValue", isoDate);
  setTimeout(() => {
    closeDatePicker();
  }, 120);
};

const selectQuick = (isoDate: string) => {
  triggerHaptic("medium");
  emit("update:modelValue", isoDate);
  viewDate.value = toSafeDate(isoDate);
  setTimeout(() => {
    closeDatePicker();
  }, 100);
};
</script>

<template>
  <div class="flex flex-col gap-1 w-full">
    <!-- Лейбл -->
    <label v-if="label" class="text-sm font-bold text-text-primary pl-3">
      {{ label }}
    </label>

    <!-- Кнопка-триггер селектора даты -->
    <button
      type="button"
      :disabled="disabled"
      aria-haspopup="dialog"
      :aria-expanded="isModalOpen"
      :aria-label="
        label
          ? `${label}: ${displayDate || placeholder}`
          : displayDate || placeholder
      "
      :class="
        cn(
          'relative w-full text-left inline-flex items-center justify-between rounded-full px-4 py-2.5 glass-pill',
          'transition-all duration-300 transform-gpu cursor-pointer outline-none a11y-focus',
          'focus:shadow-[0_4px_20px_rgba(225,29,72,0.3)]!',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-white/50 active:scale-[0.99]',
          modelValue ? 'opacity-100' : 'opacity-70 hover:opacity-100',
        )
      "
      @click="openDatePicker"
    >
      <div class="flex items-center gap-2.5 min-w-0 flex-1">
        <Calendar class="size-5 text-text-secondary shrink-0" />
        <span
          :class="
            cn(
              'font-medium text-base truncate',
              modelValue ? 'text-text-primary' : 'text-text-secondary',
            )
          "
        >
          {{ displayDate || placeholder }}
        </span>
      </div>
    </button>

    <!-- Модальная шторка кастомного календаря -->
    <GlassModal
      :is-open="isModalOpen"
      position="bottom"
      title="Выберите дату"
      :z-index="zIndex"
      @close="closeDatePicker"
    >
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-2">
          <!-- Шапка переключения месяца -->
          <div
            class="flex items-center justify-between glass-pill rounded-3xl px-2 py-1"
          >
            <button
              type="button"
              aria-label="Предыдущий месяц"
              class="p-1 text-text-secondary hover:text-text-primary transition-colors cursor-pointer active:scale-90 outline-none"
              @click="prevMonth"
            >
              <ChevronLeft class="size-5" />
            </button>

            <span class="font-bold text-text-primary text-base select-none">
              {{ currentMonthLabel }}
            </span>

            <button
              type="button"
              aria-label="Следующий месяц"
              class="p-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer active:scale-90 outline-none"
              @click="nextMonth"
            >
              <ChevronRight class="size-5" />
            </button>
          </div>
          <!-- Быстрые кнопки (Сегодня, Вчера) -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              :class="
                cn(
                  'flex-1 py-1.5 px-3 rounded-full text-sm font-semibold glass-pill transition-all',
                  'active:scale-95 cursor-pointer',
                  selectedIso === yesterdayIso
                    ? 'bg-text-accent text-white shadow-[0_2px_10px_rgba(225,29,72,0.3)]'
                    : 'text-text-primary hover:bg-white/40',
                )
              "
              @click="selectQuick(yesterdayIso)"
            >
              Вчера
            </button>
            <button
              type="button"
              :class="
                cn(
                  'flex-1 py-1.5 px-3 rounded-full text-sm font-semibold glass-pill transition-all',
                  'active:scale-95 cursor-pointer',
                  selectedIso === todayIso
                    ? 'bg-text-accent text-white shadow-[0_2px_10px_rgba(225,29,72,0.3)]'
                    : 'text-text-primary hover:bg-white/40',
                )
              "
              @click="selectQuick(todayIso)"
            >
              Сегодня
            </button>
          </div>
        </div>
        <div>
          <!-- Дни недели (Пн .. Вс) -->
          <div class="grid grid-cols-7 gap-1 text-center">
            <span
              v-for="(dayName, idx) in weekDayNames"
              :key="dayName"
              :class="
                cn(
                  'text-sm font-bold py-1 select-none',
                  idx >= 5 ? 'text-text-accent/80' : 'text-text-secondary',
                )
              "
            >
              {{ dayName }}
            </span>
          </div>

          <!-- Сетка дней -->
          <div class="grid grid-cols-7 gap-1 gap-y-px">
            <button
              v-for="cell in calendarDays"
              :key="cell.isoDate"
              type="button"
              :class="
                cn(
                  'aspect-square flex items-center justify-center rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer active:scale-90 select-none relative',
                  // Выбранный день
                  cell.isoDate === selectedIso &&
                    'bg-text-accent text-white font-bold shadow-[0_4px_12px_rgba(225,29,72,0.35)] scale-105',
                  // Сегодняшний день (но не выбранный)
                  cell.isoDate === todayIso &&
                    cell.isoDate !== selectedIso &&
                    'ring-1.5 ring-text-accent/60 text-text-accent font-bold',
                  // Текущий месяц (не выбранный)
                  cell.isCurrentMonth &&
                    cell.isoDate !== selectedIso &&
                    'text-text-primary hover:bg-white/40',
                  // Чужой месяц
                  !cell.isCurrentMonth &&
                    cell.isoDate !== selectedIso &&
                    'opacity-30 hover:opacity-60 text-text-secondary',
                )
              "
              @click="selectDate(cell.isoDate)"
            >
              {{ cell.dayNumber }}
            </button>
          </div>
        </div>
      </div>
    </GlassModal>
  </div>
</template>
