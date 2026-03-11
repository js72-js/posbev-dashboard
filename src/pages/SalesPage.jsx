// src/pages/SalesPage.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function SalesPage() {
  const [sales,   setSales]   = useState([])
  const [period,  setPeriod]  = useState('month')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadSales() }, [period])

  const loadSales = async () => {
    setLoading(true)
    const now   = Date.now()
    const since = period === 'day'   ? now - 86400000
                : period === 'week'  ? now - 7  * 86400000
                : period === 'month' ? now - 30 * 86400000
                :                     now - 365 * 86400000

    const { data } = await supabase
      .from('sales')
      .select(`
        id, sale_number, total_amount, payment_status,
        payment_method, timestamp,
        seller:user_accounts!seller_id(full_name, business_name, role)
      `)
      .gte('timestamp', since)
      .order('timestamp', { ascending: false })
      .limit(200)

    setSales(data ?? [])
    setLoading(false)
  }

  const totalCA = sales
    .filter(s => s.payment_status === 'VALIDATED')
    .reduce((s, v) => s + v.total_amount, 0)

  const fmt = (n) => new Intl.NumberFormat('fr-FR', {
    style:'currency', currency:'EUR'
  }).format(n)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Ventes réseau</h2>
        <div className="flex gap-2">
          {['day','week','month','year'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors
                ${period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
              {{ day:"Auj.", week:"Semaine",
                 month:"Mois", year:"Année" }[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4
                      flex items-center justify-between">
        <span className="text-blue-700 font-medium">
          CA validé — {sales.filter(s => s.payment_status === 'VALIDATED').length} vente(s)
        </span>
        <span className="text-blue-900 text-xl font-bold">{fmt(totalCA)}</span>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Chargement…</div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left p-3">N° vente</th>
                <th className="text-left p-3">Vendeur</th>
                <th className="text-left p-3">Rôle</th>
                <th className="text-right p-3">Montant</th>
                <th className="text-left p-3">Paiement</th>
                <th className="text-left p-3">Date</th>
                <th className="text-center p-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">
                    {s.sale_number ?? '#' + s.id}
                  </td>
                  <td className="p-3">
                    {s.seller?.business_name ?? s.seller?.full_name ?? '—'}
                  </td>
                  <td className="p-3 text-gray-500 text-xs">
                    {s.seller?.role ?? '—'}
                  </td>
                  <td className="p-3 text-right font-medium">{fmt(s.total_amount)}</td>
                  <td className="p-3 text-gray-500">
                    {{ CASH:'Espèces', CARD:'Carte',
                       CREDIT:'Crédit', MIXED:'Mixte' }[s.payment_method]
                     ?? s.payment_method ?? '—'}
                  </td>
                  <td className="p-3 text-gray-500">
                    {new Date(s.timestamp).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                      ${s.payment_status === 'VALIDATED'
                        ? 'bg-green-100 text-green-700'
                        : s.payment_status === 'HELD'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'}`}>
                      {s.payment_status === 'VALIDATED' ? 'Validée'
                       : s.payment_status === 'HELD'    ? 'En attente'
                       : s.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-400">
                    Aucune vente sur cette période
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}