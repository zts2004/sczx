import { useEffect, useState } from 'react';

export type Toast = {
  id: string;
  title: string;
  description?: string;
};

export default function ToastHost({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 w-[320px]">
      {toasts.map((t) => (
        <div key={t.id} className="bg-white shadow-lg rounded-lg border border-gray-200 p-4">
          <div className="font-semibold text-gray-900">{t.title}</div>
          {t.description ? <div className="text-sm text-gray-600 mt-1">{t.description}</div> : null}
        </div>
      ))}
    </div>
  );
}

