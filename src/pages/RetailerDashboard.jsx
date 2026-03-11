// src/pages/RetailerDashboard.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function RetailerDashboard({ ownerId }) {
  const [tab,       setTab]       = useState('overview')
  const [stocks,    setStocks]    = useState([])
  const [sales,     setSales]     = useState([])
  const [credits,   setCredits]   = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => { loadData() }, [tab])

  const loadData = async () => {
    setLoading(true)
    if (tab === 'overview' || tab === 'stock') {
      const { data } = await supabase
        .from('client_stocks')
        .select('id, quantity, product:products(name, unit, retail_price)')
        .eq('client_id', ownerId)
        .gt('quantity', 0)
        .order('quantity', { ascending: false })
      setStocks(data ?? [])
    }
    if (tab === 'overview' || tab === 'sales') {
      const { data } = await supabase
        .from('sales')
        .select('id, sale_number, total_amount, status, payment_status, sale_date')
        .eq('seller_id', ownerId)
        .order('sale_date', { ascending: false })
        .limit(30)
      setSales(data ?? [])
    }
    if (tab === 'overview' || tab === 'credits') {
      const { data } = await supabase
        .from('receivables')
        .select('id, client_name, amount, due_date, status, created_date')
        .eq('creditor_id', ownerId)
        .order('created_date', { ascending: false })
      setCredits(data ?? [])
    }
    setLoading(false)
  }

  const closeCredit = async (id) => {
    const { error } = await supabase
      .from('receivables')
      .update({ status: 'PAID', last_modified: Date.now() })
      .eq('id', id)
    if (!error) loadData()
  }

  const closeSale = async (id) => {
    const { error } = await supabase
      .from('sales')
      .update({ status: 'COMPLETED', last_modified: Date.now() })
      .eq('id', id)
    if (!error) loadData()
  }

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0)
  const fmtDate = (ts) => ts ? new Date(ts).toLocaleDateString('fr-FR') : '—'

  const totalStockValue  = stocks.reduce((s, cs) => s + cs.quantity * (cs.product?.retail_price ?? 0), 0)
  const totalSales       = sales.filter(s => s.status === 'COMPLETED').reduce((s, v) => s + v.total_amount, 0)
  const pendingCredits   = credits.filter(c => c.status !== 'PAID').reduce((s, c) => s + c.amount, 0)

  const statusBadge = (s, map) => {
    const cls = map[s] ?? 'bg-gray-100 text-gray-600'
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{s ?? '—'}</span>
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Tableau de bord Détaillant</h2>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-gray-500 text-sm">Valeur stock</div>
          <div className="text-2xl font-bold text-purple-700 mt-1">{fmt(totalStockValue)}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-gray-500 text-sm">CA (ventes clôturées)</div>
          <div className="text-2xl font-bold text-green-700 mt-1">{fmt(totalSales)}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-gray-500 text-sm">Crédits en attente</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{fmt(pendingCredits)}</div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'overview', label: '📊 Aperçu'   },
          { id: 'stock',    label: '📦 Stock'     },
          { id: 'sales',    label: '💰 Ventes'    },
          { id: 'credits',  label: '📋 Crédits'   },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === id ? 'bg-purple-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Chargement…</div>
      ) : (
        <>
          {/* Stock */}
          {(tab === 'stock' || tab === 'overview') && (
            <div className="bg-white rounded-xl shadow mb-6">
              <div className="p-4 border-b font-semibold text-gray-700">📦 Mon stock</div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left p-3">Produit</th>
                    <th className="text-left p-3">Unité</th>
                    <th className="text-right p-3">Quantité</th>
                    <th className="text-right p-3">Prix détail</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.length === 0 ? (
                    <tr><td colSpan={4} className="p-4 text-gray-400 text-center">Aucun stock</td></tr>
                  ) : stocks.map(cs => (
                    <tr key={cs.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{cs.product?.name ?? '—'}</td>
                      <td className="p-3 text-gray-500">{cs.product?.unit ?? '—'}</td>
                      <td className="p-3 text-right font-semibold">{cs.quantity}</td>
                      <td className="p-3 text-right">{fmt(cs.product?.retail_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Ventes */}
          {(tab === 'sales' || tab === 'overview') && (
            <div className="bg-white rounded-xl shadow mb-6">
              <div className="p-4 border-b font-semibold text-gray-700">💰 Ventes récentes</div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left p-3">N° vente</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-right p-3">Montant</th>
                    <th className="text-center p-3">Statut</th>
                    <th className="text-center p-3">Paiement</th>
                    <th className="text-center p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.length === 0 ? (
                    <tr><td colSpan={6} className="p-4 text-gray-400 text-center">Aucune vente</td></tr>
                  ) : sales.map(s => (
                    <tr key={s.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-mono text-sm">{s.sale_number ?? `#${s.id}`}</td>
                      <td className="p-3 text-gray-500">{fmtDate(s.sale_date)}</td>
                      <td className="p-3 text-right font-semibold">{fmt(s.total_amount)}</td>
                      <td className="p-3 text-center">
                        {statusBadge(s.status, {
                          PENDING:   'bg-yellow-100 text-yellow-700',
                          COMPLETED: 'bg-green-100  text-green-700',
                          CANCELLED: 'bg-red-100    text-red-700',
                        })}
                      </td>
                      <td className="p-3 text-center">
                        {statusBadge(s.payment_status, {
                          PAID:    'bg-green-100  text-green-700',
                          CREDIT:  'bg-orange-100 text-orange-700',
                          PENDING: 'bg-yellow-100 text-yellow-700',
                        })}
                      </td>
                      <td className="p-3 text-center">
                        {s.status === 'PENDING' && (
                          <button onClick={() => closeSale(s.id)}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                            Clôturer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Crédits */}
          {(tab === 'credits' || tab === 'overview') && (
            <div className="bg-white rounded-xl shadow mb-6">
              <div className="p-4 border-b font-semibold text-gray-700">📋 Crédits clients</div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left p-3">Client</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Échéance</th>
                    <th className="text-right p-3">Montant</th>
                    <th className="text-center p-3">Statut</th>
                    <th className="text-center p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {credits.length === 0 ? (
                    <tr><td colSpan={6} className="p-4 text-gray-400 text-center">Aucun crédit</td></tr>
                  ) : credits.map(c => (
                    <tr key={c.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{c.client_name ?? '—'}</td>
                      <td className="p-3 text-gray-500">{fmtDate(c.created_date)}</td>
                      <td className="p-3 text-gray-500">{fmtDate(c.due_date)}</td>
                      <td className="p-3 text-right font-semibold">{fmt(c.amount)}</td>
                      <td className="p-3 text-center">
                        {statusBadge(c.status, {
                          PENDING:   'bg-orange-100 text-orange-700',
                          PAID:      'bg-green-100  text-green-700',
                          OVERDUE:   'bg-red-100    text-red-700',
                        })}
                      </td>
                      <td className="p-3 text-center">
                        {c.status !== 'PAID' && (
                          <button onClick={() => closeCredit(c.id)}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                            Clôturer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}