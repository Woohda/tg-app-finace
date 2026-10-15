/**
 * @module app/utils/image
 * @fileoverview Клиентская оптимизация и сжатие изображений чеков и скриншотов перед отправкой
 * @description
 * Масштабирует изображения (чеки, банковские выписки, длинные скриншоты)
 * до оптимального разрешения (макс. 1600px по большей стороне) с конвертацией в JPEG (качество 0.85).
 * Снижает размер полезной нагрузки с 3–15 МБ до 150–350 КБ без потери четкости цифр и названий.
 * ---
 * ### Логика работы:
 * 1. Проверяет тип файла и доступность браузерного Canvas/Image.
 * 2. Вычисляет целевые пропорции с сохранением соотношения сторон (aspect ratio).
 * 3. Заливает фон белым цветом (#FFFFFF) для предотвращения почернения прозрачных PNG.
 * 4. Рендерит изображение на холст с бикубическим сглаживанием (`imageSmoothingQuality: high`).
 * 5. Экспортирует в Base64 формат `image/jpeg`.
 * 6. При ошибке Canvas или неподдерживаемом формате безопасно откатывается к стандартному `FileReader`.
 */

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Сжимает изображение чека или скриншота перед отправкой на сервер.
 */
export async function compressReceiptImage(
  file: File,
  maxDimension = 1600,
  quality = 0.85,
): Promise<string> {
  if (!file.type.startsWith("image/") || typeof document === "undefined") {
    return readFileAsBase64(file);
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        let { width, height } = img;

        if (width <= 0 || height <= 0) {
          readFileAsBase64(file).then(resolve);
          return;
        }

        // Масштабируем с сохранением пропорций, если превышен максимальный размер
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) {
          readFileAsBase64(file).then(resolve);
          return;
        }

        // Заливаем чистым белым цветом, чтобы прозрачные PNG не заливались черным в JPEG
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);

        // Максимальное качество сглаживания для сохранения читаемости мелкого шрифта
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedBase64);
      } catch (err) {
        console.warn(
          "[compressReceiptImage] Сбой Canvas сжатия, fallback на оригинал:",
          err,
        );
        readFileAsBase64(file).then(resolve);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      readFileAsBase64(file).then(resolve);
    };

    img.src = objectUrl;
  });
}
