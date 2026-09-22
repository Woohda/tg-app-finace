/**
 * @module server/api/ping.get
 * @fileoverview Легковесный эндпоинт для проверки здоровья и прогрева сокетов (pre-warming).
 * @description
 * Отвечает мгновенно без обращения к базе данных для поддержки активного TCP/TLS соединения
 * и исключения ошибки "Load failed" при длительном простое в WebKit/Safari.
 */
export default defineEventHandler(() => {
  return { ok: true, timestamp: Date.now() };
});
