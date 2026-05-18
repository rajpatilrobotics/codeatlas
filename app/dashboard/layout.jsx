'use client'

import Sidebar from '@/src/components/layout/Sidebar'
import Topbar from '@/src/components/layout/Topbar'
import RepoHydrator from './RepoHydrator'

export default function DashboardLayout({ children }) {
  return (
    <div className="h-screen bg-[#0A0A0A] overflow-hidden">
      <Sidebar />
      <Topbar />
      <RepoHydrator>
        <main
          className="overflow-auto"
          style={{
            position: 'absolute',
            top: '60px',
            left: '240px',
            right: 0,
            bottom: 0,
          }}
        >
          {children}
        </main>
      </RepoHydrator>
    </div>
  )
}
