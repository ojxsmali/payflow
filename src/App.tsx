import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { ToastProvider } from './components/ui/Toast'
import { AppShell } from './components/layout/AppShell'
import { isConfigured } from './lib/supabase'
import { LoginPage, SignupPage, ResetPasswordPage, UpdatePasswordPage, SetupNeeded } from './pages/Auth'
import { DashboardPage } from './pages/Dashboard'
import { Skeleton } from './components/ui'

// Route-level code splitting: the editor, analytics and the public page load on demand.
const InvoicesPage = lazy(() => import('./pages/Invoices').then((m) => ({ default: m.InvoicesPage })))
const InvoiceEditorPage = lazy(() => import('./pages/InvoiceEditor').then((m) => ({ default: m.InvoiceEditorPage })))
const InvoiceDetailPage = lazy(() => import('./pages/InvoiceDetail').then((m) => ({ default: m.InvoiceDetailPage })))
const InvoicePreviewPage = lazy(() => import('./pages/InvoicePreview').then((m) => ({ default: m.InvoicePreviewPage })))
const ClientsPage = lazy(() => import('./pages/Clients').then((m) => ({ default: m.ClientsPage })))
const ClientDetailPage = lazy(() => import('./pages/ClientDetail').then((m) => ({ default: m.ClientDetailPage })))
const AnalyticsPage = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.AnalyticsPage })))
const SettingsPage = lazy(() => import('./pages/Settings').then((m) => ({ default: m.SettingsPage })))
const OnboardingPage = lazy(() => import('./pages/Onboarding').then((m) => ({ default: m.OnboardingPage })))
const LandingPage = lazy(() => import('./pages/Landing').then((m) => ({ default: m.LandingPage })))
const PublicInvoicePage = lazy(() => import('./pages/PublicInvoice').then((m) => ({ default: m.PublicInvoicePage })))

function PageFallback() {
  return (
    <div role="status" aria-label="Loading" className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="mt-8 h-64 w-full" />
    </div>
  )
}

function FullFallback() {
  return <div role="status" aria-label="Loading" className="min-h-dvh" />
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, profile, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <FullFallback />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!profile) return <FullFallback />
  if (!profile.onboarded_at && location.pathname !== '/welcome') return <Navigate to="/welcome" replace />
  return <>{children}</>
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { session, ready, recovering } = useAuth()
  if (!ready) return <FullFallback />
  if (session && !recovering) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

/** Signed in → the app. Signed out → the public product page. */
function Root() {
  const { session, ready } = useAuth()
  if (!ready) return <FullFallback />
  if (session) return <Navigate to="/dashboard" replace />
  return <LandingPage />
}

export function App() {
  if (!isConfigured) return <SetupNeeded />
  return (
    <MotionConfig reducedMotion="user">
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<FullFallback />}>
            <Routes>
              <Route path="/" element={<Root />} />
              <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
              <Route path="/signup" element={<PublicOnly><SignupPage /></PublicOnly>} />
              <Route path="/reset-password" element={<PublicOnly><ResetPasswordPage /></PublicOnly>} />
              <Route path="/update-password" element={<UpdatePasswordPage />} />
              <Route path="/i/:token" element={<Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-14"><PageFallback /></div>}><PublicInvoicePage /></Suspense>} />
              <Route path="/welcome" element={<RequireAuth><OnboardingPage /></RequireAuth>} />
              <Route element={<RequireAuth><AppShell /></RequireAuth>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/invoices" element={<Suspense fallback={<PageFallback />}><InvoicesPage /></Suspense>} />
                <Route path="/invoices/new" element={<Suspense fallback={<PageFallback />}><InvoiceEditorPage /></Suspense>} />
                <Route path="/invoices/:id" element={<Suspense fallback={<PageFallback />}><InvoiceDetailPage /></Suspense>} />
                <Route path="/invoices/:id/edit" element={<Suspense fallback={<PageFallback />}><InvoiceEditorPage /></Suspense>} />
                <Route path="/invoices/:id/preview" element={<Suspense fallback={<PageFallback />}><InvoicePreviewPage /></Suspense>} />
                <Route path="/clients" element={<Suspense fallback={<PageFallback />}><ClientsPage /></Suspense>} />
                <Route path="/clients/:id" element={<Suspense fallback={<PageFallback />}><ClientDetailPage /></Suspense>} />
                <Route path="/analytics" element={<Suspense fallback={<PageFallback />}><AnalyticsPage /></Suspense>} />
                <Route path="/settings" element={<Suspense fallback={<PageFallback />}><SettingsPage /></Suspense>} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
    </MotionConfig>
  )
}

function NotFound() {
  return (
    <div className="py-20">
      <p className="eyebrow">404</p>
      <h1 className="display mt-2 text-2xl">This page doesn’t exist.</h1>
      <a href="/dashboard" className="link mt-4 inline-block text-sm">Back to overview</a>
    </div>
  )
}
