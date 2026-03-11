// src/pages/StocksPage.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function StocksPage() {
  const [tab,        setTab]        = useState('central')
  const [categories, setCategories] = useState([])
  const [products,   setProducts]   = useState([])
  const [clients,    setClients]    = useState([])
  const [stocks,     setStocks]     = useState([])
  const [search,     setSearch]     = useState('')
  const [expanded,   setExpanded]   = useState({})
  const [loading,    setLoading]    = useState(true)

  useEffect(() => { loadData() }, [tab])

  const loadData = async () => {
    setLoading(true)
    setSearch('')

    if (tab === 'central') {
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('products')
          .select('id, name, category_id, stock_quantity, min_stock, wholesale_price, purchase_price, unit')
          .order('name')
      ])
      const catList = cats ?? []
      setCategories(catList)
      setProducts(prods ?? [])
      const allOpen = {}
      catList.forEach(c => { allOpen[c.id] = true })
      setExpanded(allOpen)
    } else {
      const role = tab === 'wholesalers' ? 'WHOLESALER' : 'RETAILER'
      const [{ data: users }, { data: stockData }] = await Promise.all([
        supabase.from('user_accounts').select('id, full_name, business_name').eq('role', role).order('business_name'),
        supabase.from('client_stocks').select('id, quantity, client_id, product_id, product:products(name, unit)').gt('quantity', 0)
      ])
      setClients(users ?? [])
      setStocks(stockData ?? [])
    }
    setLoading(false)
  }

  const toggleCategory = (catId) =>
    setExpanded(prev => ({ ...prev, [catId]: !prev[catId] }))

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()))

  const productsByCategory = categories.map(cat => ({
    ...cat,
    products: filteredProducts.filter(p => p.category_id === cat.id)
  })).filter(cat => cat.products.length > 0)

  const uncategorized = filteredProducts.filter(
    p => !categories.find(c => c.id === p.category_id))

  const totalStockValue = products.reduce(
    (s, p) => s + p.stock_quantity * p.purchase_price, 0)

  const stocksForClient = (clientId) =>
    stocks.filter(s => s.client_id === clientId)

  const fmt = (n) => new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR'
  }).format(n ?? 0)

  const stockStatus = (qty, min) => {
    if (qty <= 0)       return { label: 'Épuisé',  cls: 'bg-red-100    text-red-700'    }
    if (qty <= min)     return { label: 'Rupture', cls: 'bg-red-100    text-red-700'    }
    if (qty <= min * 2) return { label: 'Faible',  cls: 'bg-yellow-100 text-yellow-700' }
    return                     { label: 'OK',      cls: 'bg-green-100  text-green-700'  }
  }

  const categoryIcon = (name) => {
    const n = name?.toLowerCase() ?? ''
    if (n.includes('bière') || n.includes('biere')) return '🍺'
    if (n.includes('whisky'))   return '🥃'
    if (n.includes('eau'))      return '💧'
    if (n.includes('champagne'))return '🍾'
    if (n.includes('jus'))      return '🧃'
    if (n.includes('soda'))     return '🥤'
    if (n.includes('apéritif') || n.includes('aperitif')) return '🍹'
    if (n.includes('spiritueux')) return '🍶'
    return '📦'
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Stocks réseau</h2>
        <div className="flex gap-2">
          {[
            { id: 'central',     label: '📦 Stock central' },
            { id: 'wholesalers', label: '🏭 Grossistes'    },
            { id: 'retailers',   label: '🏪 Détaillants'   },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${tab === id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Chargement…</div>

      ) : tab === 'central' ? (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div>
              <span className="text-blue-700 font-medium">Valeur totale stock central</span>
              <span className="text-blue-500 text-sm ml-2">
                {products.length} produit(s) · {categories.length} catégorie(s)
              </span>
            </div>
            <span className="text-blue-900 text-xl font-bold">{fmt(totalStockValue)}</span>
          </div>

          <div className="mb-4 flex gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Rechercher un produit…"
              className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            {search && (
              <button onClick={() => setSearch('')}
                className="px-3 py-2 text-gray-500 border rounded-lg hover:bg-gray-50 text-sm">✕</button>
            )}
          </div>

          <div className="space-y-3">
            {productsByCategory.map(cat => (
              <div key={cat.id} className="bg-white rounded-xl shadow overflow-hidden">
                <button onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{categoryIcon(cat.name)}</span>
                    <span className="font-semibold text-gray-800">{cat.name}</span>
                    <span className="text-gray-400 text-sm">{cat.products.length} produit(s)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm">
                      Total : {cat.products.reduce((s, p) => s + p.stock_quantity, 0)} unités
                    </span>
                    <span className="text-gray-400">{expanded[cat.id] ? '▲' : '▼'}</span>
                  </div>
                </button>

                {expanded[cat.id] && (
                  <table className="w-full text-sm border-t">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="text-left p-3">Produit</th>
                        <th className="text-left p-3">Unité</th>
                        <th className="text-right p-3">Stock</th>
                        <th className="text-right p-3">Min</th>
                        <th className="text-right p-3">Prix achat</th>
                        <th className="text-right p-3">Prix gros</th>
                        <th className="text-center p-3">État</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.products.map(p => {
                        const status = stockStatus(p.stock_quantity, p.min_stock ?? 0)
                        return (
                          <tr key={p.id} className="border-t hover:bg-gray-50">
                            <td className="p-3 font-medium">{p.name}</td>
                            <td className="p-3 text-gray-500">{p.unit ?? '—'}</td>
                            <td className="p-3 text-right font-semibold">{p.stock_quantity}</td>
                            <td className="p-3 text-right text-gray-400">{p.min_stock ?? 0}</td>
                            <td className="p-3 text-right">{fmt(p.purchase_price)}</td>
                            <td className="p-3 text-right">{fmt(p.wholesale_price)}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            ))}

            {uncategorized.length > 0 && (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="p-4 font-semibold text-gray-500 border-b">
                  📦 Sans catégorie ({uncategorized.length})
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {uncategorized.map(p => (
                      <tr key={p.id} className="border-t hover:bg-gray-50">
                        <td className="p-3 font-medium">{p.name}</td>
                        <td className="p-3 text-right">{p.stock_quantity}</td>
                        <td className="p-3 text-right">{fmt(p.purchase_price)}</td>
                        <td className="p-3 text-right">{fmt(p.wholesale_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {productsByCategory.length === 0 && uncategorized.length === 0 && (
              <div className="text-gray-400 text-center py-12">
                {search ? `Aucun produit pour "${search}"` : 'Aucun produit'}
              </div>
            )}
          </div>
        </>

      ) : (
        <div className="space-y-4">
          {clients.map(client => {
            const clientStocks = stocksForClient(client.id)
            const total = clientStocks.reduce((s, cs) => s + cs.quantity, 0)
            return (
              <details key={client.id} className="bg-white rounded-xl shadow overflow-hidden">
                <summary className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50">
                  <div>
                    <span className="font-semibold">{client.business_name ?? client.full_name}</span>
                    <span className="text-gray-400 text-sm ml-2">{clientStocks.length} produit(s)</span>
                  </div>
                  <span className="text-gray-500 text-sm">{total} unité(s)</span>
                </summary>
                <table className="w-full text-sm border-t">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="text-left p-3">Produit</th>
                      <th className="text-left p-3">Unité</th>
                      <th className="text-right p-3">Quantité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientStocks.length === 0 ? (
                      <tr><td colSpan={3} className="p-3 text-gray-400 text-center">Aucun stock</td></tr>
                    ) : clientStocks.map(cs => (
                      <tr key={cs.id} className="border-t hover:bg-gray-50">
                        <td className="p-3">{cs.product?.name ?? '—'}</td>
                        <td className="p-3 text-gray-500">{cs.product?.unit ?? '—'}</td>
                        <td className="p-3 text-right font-medium">{cs.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )
          })}
          {clients.length === 0 && (
            <div className="text-gray-400 text-center py-12">
              Aucun {tab === 'wholesalers' ? 'grossiste' : 'détaillant'} trouvé
            </div>
          )}
        </div>
      )}
    </div>
  )
}