// src/pages/OrdersPage.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function OrdersPage() {
  const [orders,  setOrders]  = useState([])
  const [filter,  setFilter]  = useState('ALL')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()

    // Realtime : badge temps réel
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'purchases' },
          () => loadOrders())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [filter])

  const loadOrders = async () => {
    setLoading(true)
    let query = supabase
      .from('purchases')
      .select(`
        id, order_number, status, total_amount, created_date,
        initiated_by, is_external_supplier,
        buyer:user_accounts!buyer_id(full_name, business_name, role)
      `)
      .order('created_date', { ascending: false })
      .limit(100)

    if (filter !== 'ALL') query = query.eq('status', filter)

    const { data } = await query
    setOrders(data ?? [])
    setLoading(false)
  }

  const statusColor = (s) => ({
    PENDING:          'bg-yellow-100 text-yellow-800',
    PENDING_APPROVAL: 'bg-orange-100 text-orange-800',
    CONFIRMED:        'bg-blue-100   text-blue-800',
    RECEIVED:         'bg-green-100  text-green-800',
    CANCELLED:        'bg-red-100    text-red-800',
  }[s] ?? 'bg-gray-100 text-gray-800')

  const statusLabel = (s) => ({
    PENDING:          'En attente',
    PENDING_APPROVAL: 'Approbation',
    CONFIRMED:        'Confirmée',
    RECEIVED:         'Reçue',
    CANCELLED:        'Annulée',
  }[s] ?? s)

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Commandes réseau
      </h2>

      <div className="flex gap-2 mb-4">
        {['ALL','PENDING','PENDING_APPROVAL','CONFIRMED','RECEIVED','CANCELLED']
          .map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors
                ${filter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
              {s === 'ALL' ? 'Toutes' : statusLabel(s)}
            </button>
          ))}
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Chargement…</div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left p-3">N° commande</th>
                <th className="text-left p-3">Client</th>
                <th className="text-left p-3">Rôle</th>
                <th className="text-left p-3">Type</th>
                <th className="text-right p-3">Montant</th>
                <th className="text-left p-3">Date</th>
                <th className="text-center p-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">
                    {o.order_number ?? '#' + o.id}
                  </td>
                  <td className="p-3">
                    {o.buyer?.business_name ?? o.buyer?.full_name ?? '—'}
                  </td>
                  <td className="p-3 text-gray-500 text-xs">
                    {o.buyer?.role ?? '—'}
                  </td>
                  <td className="p-3 text-gray-500 text-xs">
                    {o.initiated_by === 'SUPPLIER' ? '📦 Livraison' : '🛒 Commande'}
                  </td>
                  <td className="p-3 text-right font-medium">
                    {new Intl.NumberFormat('fr-FR', {
                      style:'currency', currency:'EUR'
                    }).format(o.total_amount)}
                  </td>
                  <td className="p-3 text-gray-500">
                    {new Date(o.created_date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs
                                      font-medium ${statusColor(o.status)}`}>
                      {statusLabel(o.status)}
                    </span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7}
                      className="p-6 text-center text-gray-400">
                    Aucune commande
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