import { useState, useEffect } from 'react'
import LoginPage from './components/LoginPage'
import Dashboard from './components/Dashboard'

const SESSION_KEY = 'ptc_user'

export default function App() {
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)

  // Rehydrate session depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY)
      if (saved) setUser(JSON.parse(saved))
    } catch {}
    setBooting(false)
  }, [])

  const handleLogin = (u) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(u))
    setUser(u)
  }

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  if (booting) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="w-8 h-8 rounded-full border-2 border-chad-500 border-t-transparent animate-spin" />
          <p className="text-slate-500 text-sm">PaffToChad…</p>
        </div>
      </div>
    )
  }

  return user
    ? <Dashboard user={user} onLogout={handleLogout} />
    : <LoginPage onLogin={handleLogin} />
}
