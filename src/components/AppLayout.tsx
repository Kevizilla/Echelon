'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ActiveTimerBanner from './ActiveTimerBanner';
import TaskModal from './TaskModal';
import ManualLogModal from './ManualLogModal';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showManualLogModal, setShowManualLogModal] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <ActiveTimerBanner />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          isOpenMobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onOpenNewTask={() => setShowTaskModal(true)}
          onOpenManualLog={() => setShowManualLogModal(true)}
        />

        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>

      <TaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
      />

      <ManualLogModal
        isOpen={showManualLogModal}
        onClose={() => setShowManualLogModal(false)}
      />
    </div>
  );
}
