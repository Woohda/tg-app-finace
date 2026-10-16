<script setup lang="ts">
/**
 * @module app/components/split/AddMemberModal
 * @fileoverview Модальное окно добавления нового участника в существующую группу
 * @description
 * Предоставляет 3 способа добавления участников:
 * 1. Инвайт-ссылка в Telegram (автоматическое вступление + добавление в друзья).
 * 2. Быстрый выбор из списка существующих друзей в 1 тап.
 * 3. Ручной ввод имени и опционального Telegram username.
 */
import { ref, computed, watch } from "vue";
import { Plus, Users, Share2 } from "@lucide/vue";
import type { SplitMember } from "~/types/split";
import type { UserFriend } from "~/types/friends";
import {
  validateAddMemberForm,
  isAddMemberFormValid,
  getMemberNameInputError,
} from "~/utils/validation";

const props = defineProps<{
  isOpen: boolean;
  groupId: string;
  groupName?: string;
  existingMembers?: SplitMember[];
}>();

const emit = defineEmits<{
  (e: "close" | "added"): void;
}>();

const { addMember } = useSplit();
const { friends, fetchFriends, shareInvite } = useFriends();

const name = ref("");
const telegramUsername = ref("");
const buttonState = ref<"idle" | "loading" | "success">("idle");
const addingFriendId = ref<string | null>(null);
const submitError = ref("");

watch([name, telegramUsername], () => {
  submitError.value = "";
});

const isFormValid = computed(() => {
  return isAddMemberFormValid(name.value);
});

const isSubmitDisabled = computed(() => {
  return !isFormValid.value || buttonState.value !== "idle";
});

const displayError = computed(() => {
  const nameErr = getMemberNameInputError(name.value);
  if (nameErr) return nameErr;
  return submitError.value;
});

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      buttonState.value = "idle";
      addingFriendId.value = null;
      submitError.value = "";
      fetchFriends();
    }
  },
);

// Друзья, которых еще нет в этой группе
const availableFriends = computed<UserFriend[]>(() => {
  const existingUserIds = new Set(
    (props.existingMembers || []).map((m) => m.user_id).filter(Boolean),
  );
  const existingNames = new Set(
    (props.existingMembers || []).map((m) => m.name.trim().toLowerCase()),
  );
  return friends.value.filter(
    (f) =>
      !existingUserIds.has(f.user_id) &&
      !existingNames.has(f.first_name.trim().toLowerCase()),
  );
});

// Добавление друга в 1 тап
const handleAddFriend = async (friend: UserFriend) => {
  if (addingFriendId.value) return;
  addingFriendId.value = friend.id;
  try {
    const result = await addMember(
      props.groupId,
      friend.first_name,
      undefined,
      friend.user_id,
    );
    if (result) {
      emit("added");
      emit("close");
    }
  } finally {
    addingFriendId.value = null;
  }
};

const handleSubmit = async () => {
  if (!isFormValid.value || buttonState.value === "loading") return;

  const validRes = validateAddMemberForm({
    name: name.value,
    telegramUsername: telegramUsername.value,
  });

  if (!validRes.success) {
    submitError.value = validRes.error;
    return;
  }

  buttonState.value = "loading";
  try {
    const result = await addMember(
      props.groupId,
      validRes.data.name,
      validRes.data.telegramUsername,
    );

    if (result) {
      buttonState.value = "success";
      setTimeout(() => {
        name.value = "";
        telegramUsername.value = "";
        emit("added");
        emit("close");
      }, 500);
    } else {
      buttonState.value = "idle";
    }
  } catch {
    buttonState.value = "idle";
  }
};
</script>

<template>
  <GlassModal
    :is-open="isOpen"
    title="Новый участник"
    position="bottom"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-4">
      <!-- 1. Приглашение по ссылке -->
      <div
        class="flex items-center justify-between p-3 rounded-2xl bg-accent-start/8 border border-accent-start/20"
      >
        <div class="flex flex-col gap-0.5">
          <span class="text-xs font-bold text-text-primary">
            Пригласить по ссылке
          </span>
          <span class="text-[11px] text-text-secondary">
            Участник вступит сам и добавится в друзья
          </span>
        </div>
        <GlassButton
          type="button"
          size="sm"
          variant="soft"
          class="h-auto px-3 py-1.5 gap-1.5 text-xs text-text-accent shrink-0"
          @click="shareInvite({ groupId: props.groupId, groupName: props.groupName })"
        >
          <Share2 class="size-3.5" />
          <span>Ссылка</span>
        </GlassButton>
      </div>

      <!-- 2. Выбор из списка друзей -->
      <div v-if="availableFriends.length > 0" class="flex flex-col gap-2">
        <label class="text-xs font-medium text-text-secondary">
          Добавить из друзей:
        </label>
        <div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
          <button
            v-for="friend in availableFriends"
            :key="friend.id"
            type="button"
            class="glass-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full cursor-pointer transition-all hover:bg-black/5 a11y-focus border border-white/10"
            :disabled="addingFriendId === friend.id"
            @click="handleAddFriend(friend)"
          >
            <Users class="size-3 text-text-accent" />
            <span>{{ friend.first_name }}</span>
            <span
              v-if="addingFriendId === friend.id"
              class="text-[10px] opacity-70"
            >...</span>
            <Plus v-else class="size-3 text-text-secondary" />
          </button>
        </div>
      </div>

      <!-- Разделитель -->
      <div class="flex items-center gap-2">
        <hr class="flex-1 border-white/10" />
        <span class="text-[10px] text-text-secondary uppercase tracking-wider">
          Или вручную
        </span>
        <hr class="flex-1 border-white/10" />
      </div>

      <!-- 3. Форма ручного ввода -->
      <form class="flex flex-col gap-3" @submit.prevent="handleSubmit">
        <div class="flex flex-col gap-3">
          <GlassInput
            v-model="name"
            label="Имя участника"
            placeholder="Например: Саша"
            required
          />

          <GlassInput
            v-model="telegramUsername"
            label="Telegram username (опционально)"
            placeholder="@username"
          />
          <p class="text-[11px] text-text-secondary -mt-1">
            Если указать username, бот сможет отправлять участнику уведомления о
            расчете долгов.
          </p>
        </div>

        <div
          v-if="displayError"
          class="text-text-accent text-sm font-medium text-center -mt-1"
        >
          {{ displayError }}
        </div>

        <div class="flex items-center justify-end gap-2 pt-1">
          <GlassButton
            size="sm"
            type="button"
            variant="soft"
            class="px-6.5"
            @click="emit('close')"
          >
            Отмена
          </GlassButton>
          <GlassMorphButton
            type="submit"
            size="sm"
            :state="buttonState"
            :disabled="isSubmitDisabled"
          >
            <span class="text-base">Добавить</span>
          </GlassMorphButton>
        </div>
      </form>
    </div>
  </GlassModal>
</template>
