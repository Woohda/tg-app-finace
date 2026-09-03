<script setup lang="ts">
const { isAuthenticated, user, token, loginWithTelegram, logout } = useAuth();

// Фейковые данные (мокаем то, что прислал бы реальный Telegram)
// Внутри JSON: { "id": 999111, "username": "test_investor" }
const mockInitData =
  "query_id=AAF...&user=%7B%22id%22%3A999111%2C%22username%22%3A%22test_investor%22%7D&auth_date=1690000000&hash=mockhash";

const handleLogin = async () => {
  await loginWithTelegram(mockInitData);
};
</script>

<template>
  <UContainer class="py-10 max-w-xl">
    <UCard>
      <template #header>
        <h1 class="text-2xl font-bold">TG Finance App</h1>
      </template>

      <!-- Если НЕ авторизованы -->
      <div v-if="!isAuthenticated" class="text-center py-6">
        <p class="mb-6 text-gray-500">Вы не вошли в систему.</p>
        <UButton
          icon="i-heroicons-arrow-right-on-rectangle"
          size="lg"
          color="primary"
          @click="handleLogin"
        >
          Войти через Telegram (Mock)
        </UButton>
      </div>

      <!-- Если АВТОРИЗОВАНЫ -->
      <div v-else class="space-y-4">
        <UAlert
          icon="i-heroicons-check-circle"
          color="success"
          variant="subtle"
          title="Авторизация успешна!"
        />

        <div>
          <p class="text-sm text-gray-500">Telegram Username</p>
          <p class="font-medium">@{{ user?.username }}</p>
        </div>

        <div>
          <p class="text-sm text-gray-500">Telegram ID</p>
          <p class="font-medium">{{ user?.telegram_id }}</p>
        </div>

        <div>
          <p class="text-sm text-gray-500">
            Внутренний ID в базе (Supabase UUID)
          </p>
          <p class="font-medium text-xs">{{ user?.id }}</p>
        </div>

        <div>
          <p class="text-sm text-gray-500">Ваш статуслесс JWT-токен</p>
          <p
            class="font-mono text-xs break-all bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1"
          >
            {{ token }}
          </p>
        </div>

        <UButton
          icon="i-heroicons-arrow-left-on-rectangle"
          color="primary"
          variant="soft"
          class="mt-4"
          @click="logout"
        >
          Выйти
        </UButton>
      </div>
    </UCard>
  </UContainer>
</template>
