// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function KpiCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue:  'border-blue-500  text-blue-700',
    green: 'border-green-500 text-green-700',
    red:   'border-red-500   text-red-700',
    amber: 'border-amber-500 text-amber-700',
  }
  return (
    <div className={`bg-white rounded-xl p-5 shadow border-l-4 ${colors[color]}`}>
      <p className="text-gray-500 text-sm">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colors[color].split(' ')[1]}`}>
        {value}
      </p>
      {sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const [kpis,    setKpis]    = useState(null)
  const [period,  setPeriod]  = useState('month')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadKpis() }, [period])

  const loadKpis = async () => {
    setLoading(true)
    const now   = Date.now()
    const since = period === 'day'   ? now - 86400000
                : period === 'week'  ? now - 7  * 86400000
                : period === 'month' ? now - 30 * 86400000
                :                     now - 365 * 86400000

    // CA total réseau (toutes ventes VALIDATED)
    const { data: sales } = await supabase
      .from('sales')
      .select('total_amount, seller_id')
      .eq('payment_status', 'VALIDATED')
      .gte('timestamp', since)

    const totalCA = sales?.reduce((s, v) => s + v.total_amount, 0) ?? 0

    // Nombre de commandes reçues
    const { count: orderCount } = await supabase
      .from('purchases')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'RECEIVED')
      .gte('created_date', since)

    // Créances ouvertes
    const { data: receivables } = await supabase
      .from('receivables')
      .select('amount_due, amount_paid')
      .eq('status', 'OPEN')

    const totalCredit = receivables?.reduce(
      (s, r) => s + (r.amount_due - r.amount_paid), 0) ?? 0

    // Valeur stock distributeur
    const { data: products } = await supabase
      .from('products')
      .select('stock_quantity, purchase_price')

    const stockValue = products?.reduce(
      (s, p) => s + p.stock_quantity * p.purchase_price, 0) ?? 0

    setKpis({ totalCA, orderCount, totalCredit, stockValue, salesCount: sales?.length ?? 0 })
    setLoading(false)
  }

  const fmt = (n) => new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR'
  }).format(n ?? 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Tableau de bord</h2>
        <div className="flex gap-2">
          {['day','week','month','year'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors
                ${period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
            >
              {{ day:'Aujourd\'hui', week:'Semaine',
                 month:'Mois', year:'Année' }[p]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Chargement…</div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <KpiCard label="CA réseau"
            value={fmt(kpis.totalCA)}
            sub={`${kpis.salesCount} vente(s)`}
            color="blue"/>
          <KpiCard label="Commandes reçues"
            value={kpis.orderCount ?? 0}
            color="green"/>
          <KpiCard label="Créances ouvertes"
            value={fmt(kpis.totalCredit)}
            color="red"/>
          <KpiCard label="Valeur stock central"
            value={fmt(kpis.stockValue)}
            color="amber"/>
        </div>
      )}

      <RecentActivity />
    </div>
  )
}

function RecentActivity() {
  const [activity, setActivity] = useState([])

  useEffect(() => {
    supabase
      .from('purchases')
      .select(`
        id, order_number, status, total_amount, created_date,
        buyer:user_accounts!buyer_id(full_name, business_name, role)
      `)
      .order('created_date', { ascending: false })
      .limit(10)
      .then(({ data }) => setActivity(data ?? []))
  }, [])

  const statusColor = (s) => ({
    PENDING:         'bg-yellow-100 text-yellow-800',
    PENDING_APPROVAL:'bg-orange-100 text-orange-800',
    CONFIRMED:       'bg-blue-100   text-blue-800',
    RECEIVED:        'bg-green-100  text-green-800',
    CANCELLED:       'bg-red-100    text-red-800',
  }[s] ?? 'bg-gray-100 text-gray-800')

  const statusLabel = (s) => ({
    PENDING:         'En attente',
    PENDING_APPROVAL:'Approbation',
    CONFIRMED:       'Confirmée',
    RECEIVED:        'Reçue',
    CANCELLED:       'Annulée',
  }[s] ?? s)

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold text-gray-700 mb-4">
        Activité récente — Commandes
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b">
            <th className="pb-2">N°</th>
            <th className="pb-2">Client</th>
            <th className="pb-2">Rôle</th>
            <th className="pb-2">Montant</th>
            <th className="pb-2">Date</th>
            <th className="pb-2">Statut</th>
          </tr>
        </thead>
        <tbody>
          {activity.map(row => (
            <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="py-2 font-mono text-xs">
                {row.order_number ?? '#' + row.id}
              </td>
              <td className="py-2">
                {row.buyer?.business_name ?? row.buyer?.full_name ?? '—'}
              </td>
              <td className="py-2 text-gray-500">
                {row.buyer?.role ?? '—'}
              </td>
              <td className="py-2 font-medium">
                {new Intl.NumberFormat('fr-FR', {
                  style:'currency', currency:'EUR'
                }).format(row.total_amount)}
              </td>
              <td className="py-2 text-gray-500">
                {new Date(row.created_date).toLocaleDateString('fr-FR')}
              </td>
              <td className="py-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                  ${statusColor(row.status)}`}>
                  {statusLabel(row.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}