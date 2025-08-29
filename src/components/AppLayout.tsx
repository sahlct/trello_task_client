import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const nav = useNavigate()
  const logout = () => {
    localStorage.removeItem('token')
    nav('/login')
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <header className="flex items-center justify-between p-4 bg-gray-800 shadow">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <button className="px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded-lg font-semibold" onClick={logout}>Logout</button>
      </header>
      <main className="flex-1 h-full overflow-auto p-6">
        {children}
      </main>
    </div>
  )
}
