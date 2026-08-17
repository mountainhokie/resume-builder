"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, X } from "lucide-react";

const TOAST_DURATION = 3000;
const FADE_OUT_DURATION = 400;

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

let nextId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: "success" | "error") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message: string) => addToast(message, "success"), [addToast]);
  const error = useCallback((message: string) => addToast(message, "error"), [addToast]);

  return { toasts, removeToast, success, error };
}

export function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: number) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
  const [fadingOut, setFadingOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setFadingOut(true);
      setTimeout(() => onRemove(toast.id), FADE_OUT_DURATION);
    }, TOAST_DURATION);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, onRemove]);

  function handleDismiss() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setFadingOut(true);
    setTimeout(() => onRemove(toast.id), FADE_OUT_DURATION);
  }

  const isSuccess = toast.type === "success";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg shadow-lg transition-all",
        fadingOut
          ? "animate-toast-out pointer-events-none"
          : "animate-toast-in"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 px-5 py-4 text-sm font-medium",
          isSuccess
            ? "bg-green-50 text-green-800 border border-green-200 border-b-0 rounded-t-lg"
            : "bg-red-50 text-red-800 border border-red-200 border-b-0 rounded-t-lg"
        )}
      >
        {isSuccess ? (
          <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500 shrink-0" />
        )}
        {toast.message}
        <button
          onClick={handleDismiss}
          className="ml-3 cursor-pointer hover:opacity-70"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div
        className={cn(
          "h-1",
          isSuccess ? "bg-green-400" : "bg-red-400"
        )}
        style={!fadingOut ? {
          transformOrigin: "left",
          animation: `toastProgress ${TOAST_DURATION}ms linear forwards`,
        } : { transform: "scaleX(0)" }}
      />
    </div>
  );
}
