import type { ReactNode } from 'react';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen min-h-[100dvh] w-full flex-col overflow-x-hidden bg-corporate-bg font-lao text-corporate-ltc">
      {children}
    </div>
  );
}
