'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { StewardLogo } from '@/components/icons/StewardLogo'

export default function LoginPage() {
  const router = useRouter()
  const { t, lang, setLang } = useLanguage()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (isSignUp) {
      const { data, error: signUpErr } = await supabase.auth.signUp({ email, password, options: { data: { app: 'steward' } } })
      if (signUpErr) {
        if (signUpErr.message.toLowerCase().includes('already') || signUpErr.message.toLowerCase().includes('exists')) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
          if (signInErr) {
            setError(t('auth.accountExists'))
          } else {
            router.push('/')
          }
        } else {
          setError(signUpErr.message)
        }
      } else if (data.session) {
        router.push('/')
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (!signInErr) {
          router.push('/')
        } else {
          setMessage(t('auth.accountCreatedSwitch'))
          setIsSignUp(false)
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navy hero band */}
      <div className="bg-brand-primary-dark px-6 pt-14 pb-24 text-white">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <StewardLogo size={44} />
            <div>
              <p className="text-lg font-bold tracking-tight">Steward</p>
              <p className="text-xs text-white/80">Leader Standard Work</p>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isSignUp ? t('auth.signUpTitle') : t('auth.signInTitle')}
          </h1>
        </div>
      </div>

      {/* Form card overlapping the hero */}
      <div className="px-4 -mt-12 pb-10">
        <div className="max-w-sm mx-auto bg-white rounded-md shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border-[1.5px] border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-steward-primary focus:border-transparent min-h-[44px]"
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border-[1.5px] border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-steward-primary focus:border-transparent min-h-[44px]"
                placeholder={t('auth.passwordPlaceholder')}
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}
            {message && <p className="text-green-600 text-sm">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-steward-primary text-white rounded-md text-sm font-medium hover:bg-steward-primary-dark disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {loading ? t('auth.loading') : isSignUp ? t('auth.signUp') : t('auth.signIn')}
            </button>

            {!isSignUp && (
              <p className="text-center text-sm">
                <a href="/forgot-password" className="text-steward-primary font-medium hover:underline">
                  {t('auth.forgotPassword')}
                </a>
              </p>
            )}
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {isSignUp ? t('auth.haveAccount') : t('auth.noAccount')}{' '}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage('') }}
              className="text-steward-primary font-medium hover:underline"
            >
              {isSignUp ? t('auth.signIn') : t('auth.signUp')}
            </button>
          </p>

          {/* Language toggle */}
          <div className="flex justify-center gap-1 mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => setLang('en')}
              className={`px-4 py-1 text-xs rounded-full font-semibold transition-colors ${
                lang === 'en' ? 'bg-brand-primary-fade text-brand-primary' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLang('es')}
              className={`px-4 py-1 text-xs rounded-full font-semibold transition-colors ${
                lang === 'es' ? 'bg-brand-primary-fade text-brand-primary' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Español
            </button>
          </div>
        </div>

        {/* Legal disclaimer */}
        <p className="max-w-sm mx-auto text-center text-xs text-gray-400 mt-6 px-2">
          Not an official product of, and is not endorsed by, The Church of Jesus Christ of Latter-day Saints.
        </p>
      </div>
    </div>
  )
}
