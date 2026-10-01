"use client";

import { Header } from "@/components/layout/Header";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";
import { DemoProvider } from "@/context/DemoProvider";
import { useState, type ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <DemoProvider>
        <div className="min-h-screen bg-background">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="lg:pl-64">
            <Header onMenuClick={() => setSidebarOpen(true)} />
            <main className="pb-20 lg:pb-8">{children}</main>
          </div>
          <MobileNavigation />
        </div>
      </DemoProvider>
    </ToastProvider>
  );
}
