// src/pages/WholesalerDashboard.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function WholesalerDashboard({ ownerId }) {
  const [tab,       setTab]       = useState('overview')
  const [stocks,    setStocks]    = useState([])
  const [orders,    setOrders]    = useState([])
  const [retailers, setRetailers] = useState([])
  const [newRetailer, setNewRetailer] = useState({ full_name: '', business_name: '', phone: '', email: '' })
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState(null)

  useEffect(() => { loadData() }, [tab])

  const loadData = async () => {
    setLoading(true)
    if (tab === 'overview' || tab === 'stock') {
      const { data } = await supabase
        .from('client_stocks')
        .select('id, quantity, product:products(name, unit, wholesale_price)')
        .eq('client_id', ownerId)
        .gt('quantity', 0)
        .order('quantity', { ascending: false })
      setStocks(data ?? [])
    }
    if (tab === 'overview' || tab === 'orders') {
      const { data } = await supabase
        .from('purchases')
        .select('id, order_number, total_amount, status, created_date')
        .eq('buyer_id', ownerId)
        .order('created_date', { ascending: false })
        .limit(20)
      setOrders(data ?? [])
    }
    if (tab === 'retailers') {
      const { data } = await supabase
        .from('user_accounts')
        .select('id, full_name, business_name, phone, email, created_date')
        .eq('role', 'RETAILER')
        .order('business_name')
      setRetailers(data ?? [])
    }
    setLoading(false)
  }

  const createRetailer = async () => {
    if (!newRetailer.full_name || !newRetailer.email) {
      setMsg({ type: 'error', text: 'Nom et email obligatoires' })
      return
    }
    setSaving(true)
    setMsg(null)
    const now = Date.now()
    const { error } = await supabase.from('user_accounts').insert({
      full_name:     newRetailer.full_name,
      business_name: newRetailer.business_name,
      phone:         newRetailer.phone,
      email:         newRetailer.email,
      role:          'RETAILER',
      created_date:  now,
      last_modified: now,
      synced:        true,
    })
    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      setMsg({ type: 'success', text: 'Détaillant créé avec succès !' })
      setNewRetailer({ full_name: '', business_name: '', phone: '', email: '' })
      loadData()
    }
    setSaving(false)
  }

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0)
  const fmtDate = (ts) => ts ? new Date(ts).toLocaleDateString('fr-FR') : '—'

  const statusBadge = (s) => {
    const map = {
      PENDING:   'bg-yellow-100 text-yellow-700',
      CONFIRMED: 'bg-blue-100   text-blue-700',
      DELIVERED: 'bg-green-100  text-green-700',
      CANCELLED: 'bg-red-100    text-red-700',
    }
    return map[s] ?? 'bg-gray-100 text-gray-600'
  }

  const totalStockValue = stocks.reduce((s, cs) => s + cs.quantity * (cs.product?.wholesale_price ?? 0), 0)

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Tableau de bord Grossiste</h2>

      {/* KPIs overview */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-gray-500 text-sm">Produits en stock</div>
          <div className="text-2xl font-bold text-gray-800 mt-1">{stocks.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-gray-500 text-sm">Valeur stock</div>
          <div className="text-2xl font-bold text-green-700 mt-1">{fmt(totalStockValue)}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-gray-500 text-sm">Commandes</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{orders.length}</div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'overview',  label: '📊 Aperçu'       },
          { id: 'stock',     label: '📦 Mon stock'     },
          { id: 'orders',    label: '🛒 Commandes'     },
          { id: 'retailers', label: '🏪 Détaillants'   },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === id ? 'bg-green-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Chargement…</div>
      ) : (
        <>
          {/* Mon stock */}
          {(tab === 'stock' || tab === 'overview') && (
            <div className="bg-white rounded-xl shadow mb-6">
              <div className="p-4 border-b font-semibold text-gray-700">📦 Mon stock</div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left p-3">Produit</th>
                    <th className="text-left p-3">Unité</th>
                    <th className="text-right p-3">Quantité</th>
                    <th className="text-right p-3">Valeur</th>
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
                      <td className="p-3 text-right">{fmt(cs.quantity * (cs.product?.wholesale_price ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Commandes */}
          {(tab === 'orders' || tab === 'overview') && (
            <div className="bg-white rounded-xl shadow mb-6">
              <div className="p-4 border-b font-semibold text-gray-700">🛒 Commandes au distributeur</div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left p-3">N° commande</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-right p-3">Montant</th>
                    <th className="text-center p-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={4} className="p-4 text-gray-400 text-center">Aucune commande</td></tr>
                  ) : orders.map(o => (
                    <tr key={o.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-mono text-sm">{o.order_number ?? `#${o.id}`}</td>
                      <td className="p-3 text-gray-500">{fmtDate(o.created_date)}</td>
                      <td className="p-3 text-right font-semibold">{fmt(o.total_amount)}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(o.status)}`}>
                          {o.status ?? '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Détaillants */}
          {tab === 'retailers' && (
            <div className="space-y-4">
              {/* Formulaire création */}
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="font-semibold text-gray-700 mb-4">➕ Enregistrer un nouveau détaillant</h3>
                {msg && (
                  <div className={`mb-4 p-3 rounded-lg text-sm
                    ${msg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {msg.text}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'full_name',     label: 'Nom complet *',      placeholder: 'Jean Martin' },
                    { key: 'business_name', label: "Nom de l'établissement", placeholder: 'Épicerie Martin' },
                    { key: 'email',         label: 'Email *',            placeholder: 'jean@epicerie.com' },
                    { key: 'phone',         label: 'Téléphone',          placeholder: '+33 6 00 00 00 00' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-sm text-gray-600 mb-1 block">{label}</label>
                      <input
                        value={newRetailer[key]}
                        onChange={e => setNewRetailer(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/>
                    </div>
                  ))}
                </div>
                <button onClick={createRetailer} disabled={saving}
                  className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg text-sm
                             font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Enregistrement…' : '✅ Enregistrer le détaillant'}
                </button>
              </div>

              {/* Liste détaillants */}
              <div className="bg-white rounded-xl shadow">
                <div className="p-4 border-b font-semibold text-gray-700">
                  🏪 Détaillants ({retailers.length})
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="text-left p-3">Établissement</th>
                      <th className="text-left p-3">Responsable</th>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">Téléphone</th>
                      <th className="text-left p-3">Depuis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retailers.length === 0 ? (
                      <tr><td colSpan={5} className="p-4 text-gray-400 text-center">Aucun détaillant</td></tr>
                    ) : retailers.map(r => (
                      <tr key={r.id} className="border-t hover:bg-gray-50">
                        <td className="p-3 font-medium">{r.business_name ?? '—'}</td>
                        <td className="p-3">{r.full_name}</td>
                        <td className="p-3 text-gray-500">{r.email}</td>
                        <td className="p-3 text-gray-500">{r.phone ?? '—'}</td>
                        <td className="p-3 text-gray-400">{fmtDate(r.created_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}