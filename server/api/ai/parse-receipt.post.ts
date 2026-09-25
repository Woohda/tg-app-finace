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

  // Подготовка даты отсчета для промта (на основе переданной currentDate с клиента/дашборда или серверного времени)
  const clientDateRaw = body.data.currentDate?.trim();
  let baseDate = new Date();

  if (clientDateRaw) {
    const parsed = new Date(clientDateRaw);
    if (!isNaN(parsed.getTime())) {
      baseDate = parsed;
    }
  }

  const currentYear = baseDate.getFullYear();
  const todayIso = baseDate.toISOString().split("T")[0];
  const yesterdayIso = new Date(baseDate.getTime() - 86400000)
    .toISOString()
    .split("T")[0];
  const dayBeforeYesterdayIso = new Date(baseDate.getTime() - 172800000)
    .toISOString()
    .split("T")[0];

  const weekdayMonthDay = baseDate.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Человекочитаемое представление текущей даты (как на дашборде)
  const currentDateDisplay =
    clientDateRaw && isNaN(new Date(clientDateRaw).getTime())
      ? `${clientDateRaw} (${weekdayMonthDay}, ${currentYear} года, ISO: ${todayIso})`
      : `${weekdayMonthDay}, ${currentYear} года (ISO: ${todayIso})`;

  const prompt = `
Ты — высокоточный финансовый OCR-аудитор. Твоя единственная цель — извлечь все фактические финансовые операции (расходы и доходы) с предоставленного изображения (кассовый/товарный чек, скриншот мобильного банка или банковская выписка) с максимальной достоверностью и строгим соблюдением структуры.

ПРАВИЛА ИЗВЛЕЧЕНИЯ:
1. Атомарность операций (Каждая позиция — отдельный объект):
   - Каждая отдельная покупка, товарная строка в чеке, списание, зачисление, возврат или перевод ОБЯЗАНЫ стать отдельным объектом в массиве транзакций.
   - СТРОГО ЗАПРЕЩЕНО объединять или группировать разные товары или операции в один общий пункт (например, нельзя сгруппировать три разных продукта в один пункт "Продукты").
   - СТРОГО ЗАПРЕЩЕНО создавать транзакции для общих итогов чека ("Итого", "Всего к оплате", "Сумма со скидкой", "Сдача", "Безналичный расчет", "Баланс").

2. type (Тип операции):
   - Допустимы СТРОГО два значения: "expense" или "income".
   - "expense" (Расход): Любая покупка товара/услуги, списание, оплата подписки, комиссия, исходящий перевод, наличие знака минус (-) перед суммой или пометка "Списание".
     * Если это кассовый чек со списком покупок и явный знак не указан — это ВСЕГДА "expense".
   - "income" (Доход): Зачисление средств, зарплата, пополнение, входящий перевод, кэшбек, возврат средств/товара, наличие знака плюс (+) перед суммой или пометка "Зачисление"/"Пополнение".

3. amount (Сумма транзакции):
   - СТРОГО положительное число (number, float/int > 0). Без знаков минус/плюс, пробелов и валютных символов.
   - Для товарного чека с количеством (например, "2 шт х 150.00 = 300.00"): извлекай ИТОГОВУЮ стоимость позиции (300.00), с учётом скидки на эту позицию при наличии.
   - ИГНОРИРУЙ и НЕ включай в сумму: НДС, налоги, сервисные сборы (если они уже включены в цену товара), сдачу и размер скидки отдельной строкой.

4. name (Наименование операции — читаемый заголовок):
   - Для товарного чека: Короткое, понятное и чистое наименование конкретного товара или услуги на русском языке (например: "Молоко 3.2%", "Кофе Капучино 0.3", "Бензин АИ-95", "Стейк из говядины").
   - Для банковской выписки / истории операций: Название магазина, торговой сети, сервиса или имя контрагента (например: "ВкусВилл", "Яндекс Go", "Пятерочка", "Wildberries", "Алексей С.").
   - Контекст и комментарии: Если есть сообщение к переводу или назначение платежа, добавь его через дефис (например: "Перевод Алексей С. - Возврат за такси").
   - КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать в поле name названия общих категорий (такие как "Супермаркеты", "Продукты", "Кафе и рестораны", "Транспорт", "Фастфуд", "Одежда и обувь", "Здоровье" и т.п.) — для этого предназначено отдельное поле suggestedCategory!
   - Очистка от мусора: Убирай кассовые и юридические артефакты: слова "ООО", "ИП", "АО", длинные цифровые штрихкоды/артикулы, ИНН, КПП, номера ККТ/терминалов, служебные метки "Оплата картой", "Списание по СБП".
5. suggestedCategory (Категория):
   - Если type = "expense", СТРОГО выбери ровно одну категорию из списка расходов: [${expenseCategories}]. Если ничего не подходит, используй "Прочие расходы".
   - Если type = "income", СТРОГО выбери ровно одну категорию из списка доходов: [${incomeCategories}]. Если ничего не подходит, используй "Прочие доходы".
   - ЗАПРЕЩЕНО придумывать новые категории.
6. date (Дата):
   - ВАЖНО ПРО ФОРМАТ НА ФОТО (СНГ/Россия):
     На чеках и в банковских выписках даты ВСЕГДА записаны в формате ДД.ММ.ГГГГ (день.месяц.год)!
     * Первое число — это СТРОГО ДЕНЬ (DD).
     * Второе число — это СТРОГО МЕСЯЦ (MM).
     * Например: "05.11.2024" — это 5 ноября, а НЕ 11 мая! "01.07" — это 1 июля, а НЕ 7 января!
   - БАЗОВАЯ ТОЧКА ОТСЧЁТА:
     Сегодня: ${currentDateDisplay}. Используй эту дату как единственную базовую точку отсчёта.
   - СТРОГИЙ ВЫХОДНОЙ ФОРМАТ В JSON:
     Для базы данных и системы итоговое значение поля "date" ОБЯЗАНО быть в формате "YYYY-MM-DD" (например, "${todayIso}").
   - ПРАВИЛА ИЗВЛЕЧЕНИЯ И ВЫЧИСЛЕНИЯ:
     * Если на чеке или выписке указана явная дата (например, "ДД.ММ.ГГГГ", "ДД/ММ/ГГГГ", "ДД.ММ.ГГ", "ДД месяца ГГГГ") — конвертируй её строго в "YYYY-MM-DD".
     * Если указаны только день и месяц БЕЗ указания года (например, "15 мая", "02.04", "20 сен") — первое число день, второе месяц, а год СТРОГО текущий (${currentYear}): "${currentYear}-MM-DD".
     * Если написано "сегодня" или указано только время покупки — используй дату: "${todayIso}".
     * Если написано "вчера" — используй дату: "${yesterdayIso}".
     * Если написано "позавчера" или "два дня назад" — используй дату: "${dayBeforeYesterdayIso}".
     * Для любых других относительных указаний ("3 дня назад", "неделю назад") — математически точно вычти указанное количество дней из сегодняшней даты (${todayIso}).
     * Если на изображении дата вообще отсутствует и нет никаких относительных временных указаний — верни пустую строку "".

КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО (КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ):
1. ЗАПРЕЩЕНЫ ГАЛЛЮЦИНАЦИИ: Никогда не додумывай и не изобретай транзакции, суммы, даты или контрагентов, которых фактически нет на изображении. Если изображение смазано, обрезано или нечитаемо — извлекай только то, в чём уверен на 100%.
2. ЗАПРЕЩЕНО ОБЪЕДИНЕНИЕ: Ни в коем случае не суммируй и не схлопывай разные товарные позиции или отдельные банковские операции в одну общую запись.
3. ЗАПРЕЩЕНЫ СЛУЖЕБНЫЕ И ИТОГОВЫЕ СТРОКИ: Строго игнорируй и не создавай транзакции для:
   - Общих итогов ("Итого к оплате", "Всего", "В том числе скидка");
   - Информации об оплате и сдаче ("Безналичными", "Наличными", "Сдача", "Предоплата");
   - Балансов счетов ("Доступный остаток", "Баланс карты", "Лимит");
   - Служебного текста ("Спасибо за покупку", бонусы, реклама, налоги, НДС).
4. ЗАПРЕЩЕНЫ НУЛЕВЫЕ СУММЫ: Не создавай транзакции с суммой 0 или отрицательным значением.
5. СТРОГИЙ ВЫХОДНОЙ ФОРМАТ: Верни результат ИСКЛЮЧИТЕЛЬНО в виде валидного JSON-объекта согласно заданной схеме, без пояснений, комментариев и лишнего текста.
`;

  const fallbackModels = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-3.8-flash",
    "gemini-2.5-flash-lite",
    "gemini-3-flash",
    "gemini-2.5-flash",
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
