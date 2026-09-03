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
  <div class="min-h-screen p-4 flex flex-col items-center justify-center">
    <GlassCard class="w-full max-w-md">
      <UiCardHeader class="p-5 pb-0">
        <UiCardTitle class="text-2xl font-bold text-center text-text-primary"
          >TG Finance</UiCardTitle
        >
      </UiCardHeader>

      <UiCardContent class="p-5">
        <!-- Если НЕ авторизованы -->
        <div v-if="!isAuthenticated" class="text-center py-4">
          <p class="mb-8 text-text-secondary">Вы не вошли в систему.</p>
          <GlassButton
            size="lg"
            variant="primary"
            class="w-full"
            @click="handleLogin"
          >
            Войти через Telegram (Mock)
          </GlassButton>
        </div>

        <!-- Если АВТОРИЗОВАНЫ -->
        <div v-else class="space-y-6">
          <UAlert
            icon="i-heroicons-check-circle"
            color="success"
            variant="subtle"
            title="Авторизация успешна!"
          />

          <div class="grid grid-cols-2 gap-4">
            <div
              class="bg-milky p-4 rounded-2xl border-[0.5px] border-white/50 border-b-transparent border-r-transparent shadow-neu-flat"
            >
              <p class="text-xs text-text-secondary mb-1">Telegram Username</p>
              <p class="font-medium text-text-primary">@{{ user?.username }}</p>
            </div>
            <div
              class="bg-milky p-4 rounded-2xl border-[0.5px] border-white/50 border-b-transparent border-r-transparent shadow-neu-flat"
            >
              <p class="text-xs text-text-secondary mb-1">Telegram ID</p>
              <p class="font-medium text-text-primary">
                {{ user?.telegram_id }}
              </p>
            </div>
          </div>

          <div
            class="bg-milky p-4 rounded-2xl border-[0.5px] border-white/50 border-b-transparent border-r-transparent shadow-neu-flat"
          >
            <p class="text-xs text-text-secondary mb-1">Внутренний ID в базе</p>
            <p class="font-medium text-xs break-all text-text-primary">
              {{ user?.id }}
            </p>
          </div>

          <div>
            <p class="text-sm text-text-secondary mb-2 pl-2">
              Статуслесс JWT-токен
            </p>
            <p
              class="font-mono text-[10px] break-all bg-milky p-4 rounded-2xl shadow-neu-inner text-text-secondary"
            >
              {{ token }}
            </p>
          </div>

          <GlassButton variant="soft" class="w-full mt-4" @click="logout">
            Выйти
          </GlassButton>
        </div>
      </UiCardContent>
    </GlassCard>
  </div>
</template>
