<script setup lang="ts">
/**
 * @module app/components/split/GroupModals
 * @fileoverview Контейнер модальных окон экрана совместных расходов
 * @description
 * Инкапсулирует состояние и отображение всех модальных окон группы: создание/редактирование
 * расходов, добавление участников, фиксация переводов (Settle), экспорт долей, управление
 * составом группы и диалоги подтверждения удаления (участник, группа, расход).
 * Предоставляет типизированные методы через `defineExpose` для вызова из родительской страницы.
 * ---
 * ### Логика работы:
 * 1. Прием данных текущей группы `SplitGroupDetail` и аватара авторизованного пользователя.
 * 2. Управление видимостью модальных окон и локальным состоянием выбранных сущностей.
 * 3. Централизованная маршрутизация действий: переход из списка участников к добавлению или удалению.
 * 4. Вызов мутаций `deleteExpense`, `deleteMember`, `deleteGroup` из `useSplit`.
 * 5. Отправка событий `refresh` для обновления данных группы и `groupDeleted` при удалении.
 */
import { ref } from "vue";
import type {
  SplitGroupDetail,
  SplitExpense,
  SplitMember,
  SplitDebtTransfer,
} from "~/types/split";
import { formatAmount } from "~/utils/format";

interface Props {
  group: SplitGroupDetail;
  currentAuthAvatarUrl?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  currentAuthAvatarUrl: null,
});

const emit = defineEmits<{
  (e: "refresh" | "groupDeleted"): void;
}>();

const { deleteExpense, deleteGroup, deleteMember } = useSplit();

// Состояния видимости модальных окон
const isAddExpenseOpen = ref(false);
const isAddMemberOpen = ref(false);
const isSettleModalOpen = ref(false);
const isExportModalOpen = ref(false);
const isMembersSheetOpen = ref(false);
const isDeleteMemberOpen = ref(false);
const isDeleteGroupOpen = ref(false);
const isDeleteExpenseOpen = ref(false);

// Выбранные для действий сущности
const selectedExpenseForEdit = ref<SplitExpense | null>(null);
const selectedTransferForSettle = ref<SplitDebtTransfer | null>(null);
const selectedExpenseForExport = ref<SplitExpense | null>(null);
const selectedShareAmountForExport = ref(0);
const memberToDelete = ref<SplitMember | null>(null);
const expenseToDelete = ref<SplitExpense | null>(null);

// Публичные методы для вызова из родителя
const openMembers = () => {
  isMembersSheetOpen.value = true;
};

const openAddMember = () => {
  isAddMemberOpen.value = true;
};

const openAddExpense = () => {
  selectedExpenseForEdit.value = null;
  isAddExpenseOpen.value = true;
};

const openEditExpense = (expense: SplitExpense) => {
  selectedExpenseForEdit.value = expense;
  isAddExpenseOpen.value = true;
};

const openSettle = (transfer?: SplitDebtTransfer | null) => {
  selectedTransferForSettle.value = transfer ?? null;
  isSettleModalOpen.value = true;
};

const openExportShare = (payload: {
  expense: SplitExpense;
  shareAmount: number;
}) => {
  selectedExpenseForExport.value = payload.expense;
  selectedShareAmountForExport.value = payload.shareAmount;
  isExportModalOpen.value = true;
};

const promptDeleteExpense = (expenseId: string) => {
  const exp = props.group.expenses.find((e) => e.id === expenseId);
  expenseToDelete.value = exp || null;
  isDeleteExpenseOpen.value = true;
};

const openDeleteGroup = () => {
  isDeleteGroupOpen.value = true;
};

const promptDeleteMember = (member: SplitMember) => {
  isMembersSheetOpen.value = false;
  memberToDelete.value = member;
  isDeleteMemberOpen.value = true;
};

// Обработчики подтверждения удаления
const handleDeleteExpenseConfirm = async () => {
  if (!expenseToDelete.value) return false;
  return await deleteExpense(props.group.id, expenseToDelete.value.id);
};

const handleDeleteMemberConfirm = async () => {
  if (!memberToDelete.value) return false;
  return await deleteMember(props.group.id, memberToDelete.value.id);
};

const handleDeleteGroupConfirm = async () => {
  const success = await deleteGroup(props.group.id);
  if (success) {
    setTimeout(() => {
      emit("groupDeleted");
    }, 600);
  }
  return success;
};

export interface GroupModalsExpose {
  openMembers: () => void;
  openAddMember: () => void;
  openAddExpense: () => void;
  openEditExpense: (expense: SplitExpense) => void;
  openSettle: (transfer?: SplitDebtTransfer | null) => void;
  openExportShare: (payload: {
    expense: SplitExpense;
    shareAmount: number;
  }) => void;
  promptDeleteExpense: (expenseId: string) => void;
  openDeleteGroup: () => void;
  promptDeleteMember: (member: SplitMember) => void;
}

defineExpose<GroupModalsExpose>({
  openMembers,
  openAddMember,
  openAddExpense,
  openEditExpense,
  openSettle,
  openExportShare,
  promptDeleteExpense,
  openDeleteGroup,
  promptDeleteMember,
});
</script>

<template>
  <div class="contents">
    <!-- Модалка создания/редактирования расхода -->
    <AddExpenseModal
      :is-open="isAddExpenseOpen"
      :group-id="group.id"
      :members="group.members"
      :expense-to-edit="selectedExpenseForEdit"
      @close="
        isAddExpenseOpen = false;
        selectedExpenseForEdit = null;
      "
      @saved="
        isAddExpenseOpen = false;
        selectedExpenseForEdit = null;
        emit('refresh');
      "
    />

    <!-- Модалка добавления участника -->
    <AddMemberModal
      :is-open="isAddMemberOpen"
      :group-id="group.id"
      :group-name="group.name"
      :existing-members="group.members"
      @close="isAddMemberOpen = false"
      @added="
        isAddMemberOpen = false;
        emit('refresh');
      "
    />

    <!-- Модалка фиксации взаиморасчета долга -->
    <SettleDebtModal
      :is-open="isSettleModalOpen"
      :group-id="group.id"
      :members="group.members"
      :default-transfer="selectedTransferForSettle"
      @close="
        isSettleModalOpen = false;
        selectedTransferForSettle = null;
      "
      @saved="
        isSettleModalOpen = false;
        selectedTransferForSettle = null;
        emit('refresh');
      "
    />

    <!-- Модалка экспорта доли в личные расходы FINO -->
    <ExportShareModal
      :is-open="isExportModalOpen"
      :group-id="group.id"
      :expense="selectedExpenseForExport"
      :user-share-amount="selectedShareAmountForExport"
      @close="
        isExportModalOpen = false;
        selectedExpenseForExport = null;
      "
      @exported="
        isExportModalOpen = false;
        selectedExpenseForExport = null;
        emit('refresh');
      "
    />

    <!-- Модалка управления участниками группы (список чипсов) -->
    <GroupMembersModal
      :is-open="isMembersSheetOpen"
      :members="group.members"
      :current-auth-avatar-url="currentAuthAvatarUrl"
      @close="isMembersSheetOpen = false"
      @add="
        isMembersSheetOpen = false;
        openAddMember();
      "
      @remove="promptDeleteMember"
      @delete-group="
        isMembersSheetOpen = false;
        openDeleteGroup();
      "
    />

    <!-- Модалка подтверждения удаления участника -->
    <ConfirmDeleteModal
      :is-open="isDeleteMemberOpen"
      title="Удаление участника"
      warning="Участника можно удалить только в том случае, если он не оплачивал расходы и не участвует в текущих долях затрат группы."
      confirm-text="Удалить"
      :on-confirm="handleDeleteMemberConfirm"
      @close="
        isDeleteMemberOpen = false;
        memberToDelete = null;
      "
      @deleted="emit('refresh')"
    >
      <p class="text-[17px] text-text-primary">
        <template v-if="memberToDelete?.name">
          Вы уверены, что хотите удалить участника
          <strong class="text-text-accent font-semibold">{{
            memberToDelete.name
          }}</strong>
          из группы?
        </template>
        <template v-else>
          Вы уверены, что хотите удалить этого участника?
        </template>
      </p>
    </ConfirmDeleteModal>

    <!-- Модалка подтверждения удаления всей группы -->
    <ConfirmDeleteModal
      :is-open="isDeleteGroupOpen"
      title="Удаление группы"
      warning="Все записанные совместные платежи, доли участников и история расчетов будут безвозвратно удалены."
      confirm-text="Удалить"
      :on-confirm="handleDeleteGroupConfirm"
      @close="isDeleteGroupOpen = false"
      @deleted="
        isDeleteGroupOpen = false;
        emit('groupDeleted');
      "
    >
      <p class="text-[17px] text-text-primary">
        <template v-if="group.name">
          Вы уверены, что хотите удалить группу
          <strong class="text-text-accent font-semibold"
            >«{{ group.name }}»</strong
          >?
        </template>
        <template v-else> Вы уверены, что хотите удалить эту группу? </template>
      </p>
    </ConfirmDeleteModal>

    <!-- Модалка подтверждения удаления расхода в группе -->
    <ConfirmDeleteModal
      :is-open="isDeleteExpenseOpen"
      title="Удаление платёжа"
      warning="Связанные доли участников чека и балансы будут автоматически пересчитаны."
      confirm-text="Удалить"
      :on-confirm="handleDeleteExpenseConfirm"
      @close="
        isDeleteExpenseOpen = false;
        expenseToDelete = null;
      "
      @deleted="emit('refresh')"
    >
      <p class="text-[17px] text-text-primary">
        <template v-if="expenseToDelete">
          Вы уверены, что хотите удалить расход
          <strong class="text-text-accent"
            >«{{ expenseToDelete.title }}»</strong
          >
          на сумму
          <strong class="text-text-primary">{{
            formatAmount(expenseToDelete.amount)
          }}</strong
          >?
        </template>
        <template v-else>
          Вы уверены, что хотите удалить этот расход?
        </template>
      </p>
    </ConfirmDeleteModal>
  </div>
</template>
