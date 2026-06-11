import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    const next = searchParams.get('next')
    if (next) {
      navigate(next, { replace: true })
      return
    }

    const role = profile?.role
    if (role === 'admin' || role === 'agent') {
      navigate('/AdminPortal', { replace: true })
    } else {
      navigate('/entrepreneur', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E5E7EB] p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <img
            src="https://media.base44.com/images/public/69db89e14e315ad78c6a394b/e597c3294_Untitled-design-1.png"
            alt="Guichet UN"
            className="w-10 h-10 object-contain"
          />
          <div>
            <h1 className="font-bold text-[#1A1A1A] text-xl">Guichet Unique</h1>
            <p className="text-xs text-[#6B6B6B]">ANPI Djibouti</p>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-[#1A1A1A] mb-1">Connexion</h2>
        <p className="text-sm text-[#6B6B6B] mb-6">Accédez à votre espace personnel</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-sm font-medium text-[#1A1A1A]">
              Adresse e-mail
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-sm font-medium text-[#1A1A1A]">
              Mot de passe
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="mt-1"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-[#9B9B9B]">
          © 2026 Guichet Unique ANPI Djibouti
        </p>
      </div>
    </div>
  )
}
