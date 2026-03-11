// src/App.jsx
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import LoginPage            from './pages/LoginPage'
import DashboardPage        from './pages/DashboardPage'
import StocksPage           from './pages/StocksPage'
import OrdersPage           from './pages/OrdersPage'
import SalesPage            from './pages/SalesPage'
import NetworkPage          from './pages/NetworkPage'
import WholesalerDashboard  from './pages/WholesalerDashboard'
import RetailerDashboard    from './pages/RetailerDashboard'
import EmployeesPage        from './pages/EmployeesPage'

export default function App() {
  const [session,     setSession]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [userRole,    setUserRole]    = useState(null)
  const [userAccount, setUserAccount] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchUserInfo(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchUserInfo(session.user.id)
      else { setUserRole(null); setUserAccount(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchUserInfo = async (uid) => {
    const { data } = await supabase
      .from('user_accounts')
      .select('id, role, full_name, business_name')
      .eq('supabase_uid', uid)
      .single()
    if (data) {
      setUserRole(data.role)
      setUserAccount(data)
    }
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-gray-500 text-lg">Chargement…</div>
    </div>
  )

  if (!session) return <LoginPage />

  // Router par rôle
  if (userRole === 'DISTRIBUTOR') return <DistributorLayout currentPage={currentPage} setCurrentPage={setCurrentPage} userAccount={userAccount} />
  if (userRole === 'WHOLESALER')  return <WholesalerLayout  currentPage={currentPage} setCurrentPage={setCurrentPage} userAccount={userAccount} />
  if (userRole === 'RETAILER')    return <RetailerLayout    currentPage={currentPage} setCurrentPage={setCurrentPage} userAccount={userAccount} />

  // Rôle non encore chargé
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-gray-400">Identification en cours…</div>
    </div>
  )
}

// ─── Layout Distributeur ──────────────────────────────────────
function DistributorLayout({ currentPage, setCurrentPage, userAccount }) {
  const pages = {
    dashboard: <DashboardPage />,
    stocks:    <StocksPage />,
    orders:    <OrdersPage />,
    sales:     <SalesPage />,
    network:   <NetworkPage />,
    employees: <EmployeesPage ownerId={userAccount?.id} role="DISTRIBUTOR" />,
  }
  const nav = [
    { id: 'dashboard', label: '📊 Tableau de bord' },
    { id: 'stocks',    label: '📦 Stocks réseau'    },
    { id: 'orders',    label: '🛒 Commandes'         },
    { id: 'sales',     label: '💰 Ventes'            },
    { id: 'network',   label: '👥 Réseau'            },
    { id: 'employees', label: '🧑‍💼 Employés'         },
  ]
  return <Shell nav={nav} currentPage={currentPage} setCurrentPage={setCurrentPage}
                userAccount={userAccount} color="blue" subtitle="Distributeur">
    {pages[currentPage]}
  </Shell>
}

// ─── Layout Grossiste ─────────────────────────────────────────
function WholesalerLayout({ currentPage, setCurrentPage, userAccount }) {
  const pages = {
    dashboard: <WholesalerDashboard ownerId={userAccount?.id} />,
    employees: <EmployeesPage ownerId={userAccount?.id} role="WHOLESALER" />,
  }
  const nav = [
    { id: 'dashboard', label: '📊 Tableau de bord' },
    { id: 'employees', label: '🧑‍💼 Employés'        },
  ]
  return <Shell nav={nav} currentPage={currentPage} setCurrentPage={setCurrentPage}
                userAccount={userAccount} color="green" subtitle="Grossiste">
    {pages[currentPage]}
  </Shell>
}

// ─── Layout Détaillant ────────────────────────────────────────
function RetailerLayout({ currentPage, setCurrentPage, userAccount }) {
  const pages = {
    dashboard: <RetailerDashboard ownerId={userAccount?.id} />,
    employees: <EmployeesPage ownerId={userAccount?.id} role="RETAILER" />,
  }
  const nav = [
    { id: 'dashboard', label: '📊 Tableau de bord' },
    { id: 'employees', label: '🧑‍💼 Employés'        },
  ]
  return <Shell nav={nav} currentPage={currentPage} setCurrentPage={setCurrentPage}
                userAccount={userAccount} color="purple" subtitle="Détaillant">
    {pages[currentPage]}
  </Shell>
}

// ─── Shell commun (sidebar + main) ───────────────────────────
function Shell({ nav, currentPage, setCurrentPage, userAccount, color, subtitle, children }) {
  const colors = {
    blue:   { bg: 'bg-blue-900',   border: 'border-blue-800',   active: 'bg-blue-700',   text: 'text-blue-200',   hover: 'hover:bg-blue-800'   },
    green:  { bg: 'bg-green-900',  border: 'border-green-800',  active: 'bg-green-700',  text: 'text-green-200',  hover: 'hover:bg-green-800'  },
    purple: { bg: 'bg-purple-900', border: 'border-purple-800', active: 'bg-purple-700', text: 'text-purple-200', hover: 'hover:bg-purple-800' },
  }
  const c = colors[color] ?? colors.blue

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className={`w-64 ${c.bg} text-white flex flex-col`}>
        <div className={`p-6 border-b ${c.border}`}>
          <h1 className="text-xl font-bold">POSBevMerici</h1>
          <p className={`${c.text} text-sm mt-1`}>Vue {subtitle}</p>
          {userAccount && (
            <p className="text-white text-xs mt-1 font-medium truncate">
              {userAccount.business_name ?? userAccount.full_name}
            </p>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ id, label }) => (
            <button key={id} onClick={() => setCurrentPage(id)}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors
                ${currentPage === id ? `${c.active} text-white` : `${c.text} ${c.hover}`}`}>
              {label}
            </button>
          ))}
        </nav>

        <div className={`p-4 border-t ${c.border}`}>
          <button onClick={() => supabase.auth.signOut()}
            className={`w-full text-left ${c.text} hover:text-white
                        px-4 py-2 rounded-lg ${c.hover} transition-colors`}>
            🚪 Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}