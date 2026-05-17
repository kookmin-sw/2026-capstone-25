// 전역 토스트(사용자 행동을 막지 않고 결과만 살짝 알려줌) 알림 Provider 와 useToast 훅.
// 화면 하단에 3초간 떠 있다 자동으로 사라지는 메시지를 띄우며,
// `error`(빨강) 와 `success`(액센트색) 두 종류만 지원한다.

import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";

type ToastItem = { id: number; message: string; type: "error" | "success" };

type ToastContextType = {
  showToast: (message: string, type?: "error" | "success") => void;
};

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  let nextId = 0;

  const showToast = useCallback((message: string, type: "error" | "success" = "error") => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 w-[calc(100%-36px)] max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "px-4 py-3 rounded-xl text-sm font-bold text-center shadow-lg animate-fade-in-up",
              t.type === "error" ? "bg-red-500 text-white" : "bg-ac text-white",
            ].join(" ")}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
