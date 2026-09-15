export const parseApiError = (e: unknown, defaultMessage = "Не удалось выполнить запрос"): string => {
  const fetchError = e as {
    data?: { statusMessage?: string; message?: string };
    message?: string;
  };
  return (
    fetchError.data?.statusMessage ||
    fetchError.data?.message ||
    fetchError.message ||
    defaultMessage
  );
};
