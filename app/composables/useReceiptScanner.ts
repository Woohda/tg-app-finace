/**
 * @module app/composables/useReceiptScanner
 * @fileoverview Логика сканирования чеков
 *
 * @description
 * Обеспечивает интерфейс для выбора изображения (input file), отправки его
 * на сервер для парсинга через AI, и отображения результатов в модалке.
 *
 * ### Логика работы:
 * 1. Открывает нативный диалог выбора файлов.
 * 2. Конвертирует изображение в Base64.
 * 3. Отправляет на эндпоинт `/api/ai/parse-receipt`.
 * 4. Записывает результат в `scanResults` и закрывает основную модалку (для открытия модалки результатов).
 */
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useTransactionModal, type ScannedTransaction } from "~/composables/useTransactionModal";

export const useReceiptScanner = () => {
  const fileInput = ref<HTMLInputElement | null>(null);
  const isScanning = ref(false);
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
        return;
      }

      const res = await api<{ transactions?: ScannedTransaction[] }>("/api/ai/parse-receipt", {
        method: "POST",
        body: {
          image: base64Data,
          currentDate: new Date().toISOString(),
        },
      });

      if (res && res.transactions) {
        scanResults.value = res.transactions;
        closeModal();
        router.push("/scan");
      } else {
        throw new Error("Неверный формат ответа");
      }
    } catch (e) {
      scanError.value = parseApiError(e, "Ошибка распознавания чека");
    } finally {
      isScanning.value = false;
      if (fileInput.value) fileInput.value.value = ""; // reset
    }
  };

  return {
    fileInput,
    isScanning,
    scanError,
    triggerScan,
    handleFileUpload,
  };
};
