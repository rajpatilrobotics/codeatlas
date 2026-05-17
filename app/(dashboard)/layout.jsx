'use client'

import Sidebar from '@/src/components/layout/Sidebar'
import Topbar from '@/src/components/layout/Topbar'

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen bg-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

// Made with Bob
