/**
 * @module app/composables/useReceiptScanner
 * @fileoverview Логика сканирования и AI-распознавания чеков
 * @description
 * Обеспечивает интерфейс для выбора изображения (input file), отправки его
 * на сервер для парсинга через AI с локальной датой клиента и перехода к результатам.
 * ---
 * ### Логика работы:
 * 1. Открывает нативный диалог выбора файлов (`openPicker`).
 * 2. Конвертирует изображение в Base64.
 * 3. Отправляет на эндпоинт `/api/ai/parse-receipt` с текущей локальной датой (`formatDateISO()`).
 * 4. Записывает результат в `scanResults`, закрывает форму и плавно переходит на экран `/scan` с сохранением лоадера на время перехода.
 */
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useTransactionModal, type ScannedTransaction } from "~/composables/useTransactionModal";

export type ReceiptScanStatus = "idle" | "scanning" | "navigating";

export const useReceiptScanner = () => {
  const fileInput = ref<HTMLInputElement | null>(null);
  const isScanning = ref(false);
  const scanStatus = ref<ReceiptScanStatus>("idle");
  const scanError = ref("");
  
  const router = useRouter();
  const { closeModal } = useTransactionModal();
  const scanResults = useState<ScannedTransaction[]>("scanResults", () => []);
  const { token } = useAuth();
  const api = useApi();

  const triggerScan = () => {
    fileInput.value?.click();
  };

  const handleFileUpload = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    isScanning.value = true;
    scanStatus.value = "scanning";
    scanError.value = "";

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const currentToken = token.value || useCookie("auth_token").value;

      if (!currentToken || currentToken === "null") {
        scanError.value = "Ошибка авторизации: токен отсутствует. Зайдите заново (Dev Login).";
        isScanning.value = false;
        scanStatus.value = "idle";
        return;
      }

      const res = await api<{ transactions?: ScannedTransaction[] }>("/api/ai/parse-receipt", {
        method: "POST",
        body: {
          image: base64Data,
          currentDate: formatDateISO(),
        },
        timeout: 60000, // 60 секунд для Gemini AI парсинга чеков
      });

      if (res && res.transactions) {
        scanResults.value = res.transactions;
        scanStatus.value = "navigating";
        closeModal();
        await router.push("/scan");
        // Плавная задержка для завершения анимации перехода лэйаутов Nuxt (clean layout)
        await new Promise((resolve) => setTimeout(resolve, 300));
      } else {
        throw new Error("Неверный формат ответа");
      }
    } catch (e) {
      scanError.value = parseApiError(e, "Ошибка распознавания чека");
    } finally {
      isScanning.value = false;
      scanStatus.value = "idle";
      if (fileInput.value) fileInput.value.value = ""; // reset
    }
  };

  return {
    fileInput,
    isScanning,
    scanStatus,
    scanError,
    triggerScan,
    handleFileUpload,
  };
};
