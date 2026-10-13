<script setup lang="ts">
/**
 * @module app/components/split/AddGroupModal
 * @fileoverview Модальное окно создания новой группы совместных трат
 * @description
 * Предоставляет форму ввода названия группы, быстрый выбор участников из списка друзей
 * и добавление новых участников с интерактивными чипсами перед сохранением в базе данных.
 */
import { ref, watch } from "vue";
import { Plus, Users } from "@lucide/vue";
import type { UserFriend } from "~/types/friends";

interface NewGroupMember {
  name: string;
  user_id?: string;
}

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "created", groupId: string): void;
}>();

const { createGroup } = useSplit();
const { friends, fetchFriends } = useFriends();

const name = ref("");
const newMemberName = ref("");
const members = ref<NewGroupMember[]>([]);
const buttonState = ref<"idle" | "loading" | "success">("idle");

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      buttonState.value = "idle";
      fetchFriends();
    }
  },
);

const isFriendSelected = (friend: UserFriend) => {
  return members.value.some(
    (m) =>
      (m.user_id && m.user_id === friend.user_id) ||
      m.name.trim().toLowerCase() === friend.first_name.trim().toLowerCase(),
  );
};

const toggleFriend = (friend: UserFriend) => {
  const idx = members.value.findIndex(
    (m) =>
      (m.user_id && m.user_id === friend.user_id) ||
      m.name.trim().toLowerCase() === friend.first_name.trim().toLowerCase(),
  );
  if (idx !== -1) {
    members.value.splice(idx, 1);
  } else {
    members.value.push({
      name: friend.first_name,
      user_id: friend.user_id,
    });
  }
};

const addMember = () => {
  const trimmed = newMemberName.value.trim();
  if (
    trimmed &&
    !members.value.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())
  ) {
    members.value.push({ name: trimmed });
    newMemberName.value = "";
  }
};

const removeMember = (_member: unknown, index: number) => {
  members.value.splice(index, 1);
};

const handleSubmit = async () => {
  if (!name.value.trim() || buttonState.value === "loading") return;

  buttonState.value = "loading";
  try {
    const result = await createGroup(name.value.trim(), members.value);
    if (result) {
      buttonState.value = "success";
      setTimeout(() => {
        const id = result.id;
        name.value = "";
        members.value = [];
        newMemberName.value = "";
        emit("created", id);
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
    title="Новая группа трат"
    position="bottom"
    @close="emit('close')"
  >
    <form class="flex flex-col gap-3" @submit.prevent="handleSubmit">
      <GlassInput
        v-model="name"
        label="Название группы"
        placeholder="Например: Поездка в горы, Бар..."
        autofocus
        required
      />

      <!-- Список участников -->
      <div class="flex flex-col gap-2 px-1">
        <label class="text-xs font-medium text-text-secondary">
          Участники (вы уже включены):
        </label>

        <GroupMembersChips
          :members="members"
          creator-badge="👤 Вы (Создатель)"
          removable
          @remove="removeMember"
        />

        <!-- Быстрый выбор из друзей -->
        <div v-if="friends.length > 0" class="flex flex-col gap-1.5 mt-1">
          <span class="text-xs font-medium text-text-secondary">
            Выбрать из друзей:
          </span>
          <div class="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
            <button
              v-for="friend in friends"
              :key="friend.id"
              type="button"
              class="glass-pill inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full cursor-pointer transition-all a11y-focus border border-white/10"
              :class="
                isFriendSelected(friend)
                  ? 'bg-accent-start/15 text-text-accent border-accent-start/30 font-semibold'
                  : 'text-text-primary hover:bg-black/5'
              "
              @click="toggleFriend(friend)"
            >
              <Users class="size-3 text-text-accent" />
              <span>{{ friend.first_name }}</span>
              <span
                v-if="isFriendSelected(friend)"
                class="text-accent-success text-[10px]"
              >✓</span>
              <Plus v-else class="size-3 text-text-secondary" />
            </button>
          </div>
        </div>

        <!-- Добавление нового участника вручную -->
        <div class="flex items-center gap-2 mt-1">
          <div class="flex-1">
            <GlassInput
              v-model="newMemberName"
              placeholder="Имя друга (например: Алексей)"
              @keydown.enter.prevent="addMember"
            />
          </div>
          <GlassButton
            type="button"
            variant="soft"
            size="sm"
            class="px-2.75 shrink-0"
            @click="addMember"
          >
            <Plus class="size-5 text-text-accent" :stroke-width="1.5" />
          </GlassButton>
        </div>

        <p class="text-[11px] text-text-secondary mt-0.5">
          💡 В созданную группу также можно будет пригласить любого друга по ссылке в Telegram.
        </p>
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
          :disabled="!name.trim()"
        >
          <span class="text-base">Создать группу</span>
        </GlassMorphButton>
      </div>
    </form>
  </GlassModal>
</template>
