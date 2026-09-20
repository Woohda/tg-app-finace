import { ref } from "vue";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

const toasts = ref<ToastMessage[]>([]);

export const useAppToast = () => {
  const remove = (id: string) => {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  };

  const show = (
    title: string,
    options?: { type?: ToastType; message?: string; duration?: number }
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = options?.duration || 3000;
    const type = options?.type || "info";

    toasts.value.push({
      id,
      type,
      title,
      message: options?.message,
      duration,
    });

    if (duration > 0) {
      setTimeout(() => {
        remove(id);
      }, duration);
    }
    
    return id;
  };

  const success = (title: string, message?: string) => show(title, { type: "success", message });
  const error = (title: string, message?: string) => show(title, { type: "error", message });
  const info = (title: string, message?: string) => show(title, { type: "info", message });

  return {
    toasts,
    show,
    success,
    error,
    info,
    remove,
  };
};
