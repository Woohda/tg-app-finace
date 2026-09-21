/**
 * @module server/api/ai/parse-receipt.post
 * @fileoverview API-эндпоинт для распознавания чеков через Google Gemini (AI)
 * @description
 * Принимает изображение чека (base64) и использует LLM для извлечения
 * финансовых транзакций. Реализует сложный механизм отказоустойчивости.
 * ---
 * ### Логика работы:
 * 1. `Authentication`: Валидация JWT токена пользователя.
 * 2. `Body Parsing`: Парсинг base64-изображения чека через Zod.
 * 3. `AI Generation`: Отправка запроса к Google Gemini. Используется каскадный перебор моделей (Flash Lite -> Flash) и ключей, чтобы обходить 429/503 ошибки Rate Limit.
 * 4. `Response`: Возврат массива распознанных транзакций.
 *
 * ### Параметры запроса:
 * - `imageBase64: string` — base64-строка изображения (содержащая `data:image/...`).
 *
 * ### Ошибки:
 * - `400 Bad Request` — неверный формат изображения.
 * - `401 Unauthorized` — нет доступа.
 * - `500 Internal Server Error` — ошибка AI, исчерпание лимитов или сбой парсинга JSON от LLM.
 *
 * ### Зависимости:
 * - `@google/genai` (SDK для Gemini)
 */
import { GoogleGenAI, Type } from "@google/genai";

import { parseReceiptSchema } from "~/types/validate";
import { getUserSupabase } from "~~/server/utils/db";
import type { Database } from "~/types/database.types";

type Category = Database["public"]["Tables"]["categories"]["Insert"];

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const supabase = getUserSupabase(token);
  const config = useRuntimeConfig();

  const body = await readValidatedBody(event, (body) =>
    parseReceiptSchema.safeParse(body),
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ошибка валидации данных",
      data: body.error.issues,
    });
  }

  if (!config.geminiApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "API ключ Gemini не настроен",
    });
  }

  // Получаем все категории пользователя для контекста
  const { data: categories } = await supabase
    .from("categories")
    .select("name, type")
    .eq("user_id", userId);

  const expenseCategories =
    categories
      ?.filter((c: Category) => c.type === "expense")
      .map((c: Category) => c.name)
      .join(", ") || "Еда, Дом, Транспорт, Развлечения";

  const incomeCategories =
    categories
      ?.filter((c: Category) => c.type === "income")
      .map((c: Category) => c.name)
      .join(", ") || "Зарплата, Кэшбек, Переводы";

  // Убираем префикс base64 (например, data:image/jpeg;base64,) если он есть
  let base64Data = body.data.image;
  let mimeType = "image/jpeg";
  if (base64Data.startsWith("data:")) {
    const matches = base64Data.match(
      /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/,
    );
    if (matches && matches[1] && matches[2]) {
      mimeType = matches[1];
      base64Data = matches[2];
    }
  }

  const prompt = `
Ты — строгий финансовый анализатор. Твоя единственная задача: извлечь все финансовые транзакции (расходы и доходы) с прикрепленного изображения (кассовый чек, скриншот банковской выписки или история операций).

ПРАВИЛА ИЗВЛЕЧЕНИЯ:
1. Каждая реальная покупка, товар, списание, зачисление, возврат или перевод должны стать отдельным объектом в ответе.
2. type (Тип):
   - "expense" (расход): покупка, списание, или перед суммой стоит знак минус (-).
   - "income" (доход): зачисление, пополнение, возврат средств, зарплата, или перед суммой стоит знак плюс (+).
3. amount (Сумма):
   - Извлекай сумму транзакции строго как положительное число.
   - Игнорируй промежуточные итоги, сдачу и налоги как отдельные позиции.
4. name (Описание - главный заголовок):
   - Кассовый чек: короткое и понятное название товара (например, "Молоко 1л", "Стейк").
   - Банковская выписка: название магазина, компании, сервиса или имя человека (например, "Яндекс Go", "Пятерочка", "Иван И.").
   - Если есть дополнительная информация (комментарий, сообщение к переводу), добавь ее сюда же через дефис или скобки (например, "Перевод Ивану И. - За пиццу").
   - ЗАПРЕЩЕНО писать сюда названия категорий (например, "Супермаркеты", "Аптеки", "Развлечения", "Одежда и обувь", "Маркетплейсы", и так далее).
   - Очищай текст от технического мусора (ИНН, автопополнение, терминалы).
6. suggestedCategory (Категория):
   - Если type = "expense", СТРОГО выбери ровно одну категорию из списка расходов: [${expenseCategories}]. Если ничего не подходит, используй "Прочие расходы".
   - Если type = "income", СТРОГО выбери ровно одну категорию из списка доходов: [${incomeCategories}]. Если ничего не подходит, используй "Прочие доходы".
   - ЗАПРЕЩЕНО придумывать новые категории.
7. date (Дата):
   - Формат DD-MM-YYYY или DD-Month-YYYY . Ищи дату на изображении.
   - ВАЖНО: Сегодня ${new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })} (${new Date().toISOString().split("T")[0]}). Используй эту дату как точку отсчёта.
   - Если на изображении написано "вчера" — это ${new Date(Date.now() - 86400000).toISOString().split("T")[0]}.
   - Если написано "сегодня" — это ${new Date().toISOString().split("T")[0]}.
   - Если написано "позавчера" или "два дня назад" — это ${new Date(Date.now() - 172800000).toISOString().split("T")[0]}.
   - Для других относительных фраз ("3 дня назад", "неделю назад") вычитай нужное количество дней из сегодняшней даты.
   - ВАЖНО: Если на изображении указаны только день и месяц (без года), СТРОГО используй текущий год (${new Date().getFullYear()}).
   - ВАЖНО: Если на изображении дата не указана, верни пустую строку "".

ЧТО КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО:
- НЕ объединяй разные товары в одну позицию.
- НЕ выдумывай данные, которых нет на фото.
- НЕ включай системную информацию ("Итог", "Сдача") как отдельную транзакцию.

Верни результат СТРОГО в формате JSON массива согласно заданной схеме.
`;

  const fallbackModels = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
  ];

  const apiKeys = [config.geminiApiKey];
  if (config.geminiApiKey2) {
    apiKeys.push(config.geminiApiKey2);
  }

  const fallbackAttempts: {
    model: string;
    key: string;
    isSecondKey: boolean;
  }[] = [];
  for (const model of fallbackModels) {
    for (let i = 0; i < apiKeys.length; i++) {
      const key = apiKeys[i];
      if (key) {
        fallbackAttempts.push({
          model,
          key: key as string,
          isSecondKey: i > 0,
        });
      }
    }
  }

  const MAX_RETRIES = fallbackAttempts.length;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    const currentConfig = fallbackAttempts[attempt];
    if (!currentConfig) break; // Should not happen

    const ai = new GoogleGenAI({ apiKey: currentConfig.key });
    try {
      const response = await ai.models.generateContent({
        model: currentConfig.model,
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              transactions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      enum: ["expense", "income"],
                      description: "Тип транзакции: расход или доход",
                    },
                    amount: { type: Type.NUMBER },
                    name: { type: Type.STRING },
                    suggestedCategory: { type: Type.STRING },
                    date: { type: Type.STRING, description: "YYYY-MM-DD" },
                  },
                  required: [
                    "type",
                    "amount",
                    "name",
                    "suggestedCategory",
                    "date",
                  ],
                },
              },
            },
            required: ["transactions"],
          },
          temperature: 0.1,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Пустой ответ от Gemini");
      }

      const result = JSON.parse(text);
      return result;
    } catch (error) {
      console.error(
        `Ошибка при работе с Gemini (попытка ${attempt + 1}/${MAX_RETRIES}, модель: ${currentConfig.model}, ключ: ${currentConfig.isSecondKey ? "2" : "1"}):`,
        error,
      );

      const err = error as { message?: string };
      const errorMessage = err.message || JSON.stringify(error) || "";
      const isOverloaded =
        errorMessage.includes("503") ||
        errorMessage.includes("UNAVAILABLE") ||
        errorMessage.includes("429") ||
        errorMessage.includes("ResourceExhausted") ||
        errorMessage.includes("fetch failed");

      if (isOverloaded && attempt < MAX_RETRIES - 1) {
        attempt++;
        const delay = attempt * 1000;
        console.log(`Ждем ${delay}мс перед следующей попыткой...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else if (attempt === MAX_RETRIES - 1) {
        // Если это последняя попытка или ошибка не связана с перегрузкой
        throw createError({
          statusCode: 503,
          statusMessage:
            "Нейросеть сейчас перегружена запросами 😔. Пожалуйста, попробуйте чуть позже или внесите операцию вручную.",
        });
      } else {
        throw createError({
          statusCode: 500,
          statusMessage: "Не удалось распознать чек. Возможно, нечеткое фото.",
        });
      }
    }
  }
});
