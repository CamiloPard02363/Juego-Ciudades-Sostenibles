import { useState } from 'react'
import { LoginPage } from './components/LoginPage'
import { RegisterPage } from './components/RegisterPage'
import { HomeLayout } from './components/home/HomeLayout'
import { useAuth } from './hooks/useAuth'

function App() {
  const { user, status } = useAuth()
  const [authView, setAuthView] = useState<'login' | 'register'>('login')

  if (status === 'checking') {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p>Cargando…</p>
      </main>
    )
  }

  if (status !== 'authenticated' || !user) {
    return authView === 'login' ? (
      <LoginPage onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <RegisterPage onSwitchToLogin={() => setAuthView('login')} />
    )
  }

  return <HomeLayout />
}

export default App
