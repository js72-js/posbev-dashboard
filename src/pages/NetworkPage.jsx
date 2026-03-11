// src/pages/NetworkPage.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const emptyWholesaler = {
  full_name: '', business_name: '', phone: '', email: '', address: ''
}

export default function NetworkPage() {
  const [wholesalers,    setWholesalers]    = useState([])
  const [retailers,      setRetailers]      = useState([])
  const [loading,        setLoading]        = useState(true)
  const [showForm,       setShowForm]       = useState(false)
  const [form,           setForm]           = useState(emptyWholesaler)
  const [editing,        setEditing]        = useState(null)  // id ou null
  const [saving,         setSaving]         = useState(false)
  const [msg,            setMsg]            = useState(null)
  const [confirmDisable, setConfirmDisable] = useState(null)  // id ou null

  useEffect(() => {
    loadNetwork()
    const channel = supabase
      .channel('network-changes')
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'user_accounts' },
          () => loadNetwork())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const loadNetwork = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('user_accounts')
      .select('id, full_name, business_name, role, parent_id, phone, email, is_active, address, created_date')
      .in('role', ['WHOLESALER', 'RETAILER'])
      .order('business_name')
    const ws = data?.filter(u => u.role === 'WHOLESALER') ?? []
    const rs = data?.filter(u => u.role === 'RETAILER')   ?? []
    setWholesalers(ws)
    setRetailers(rs)
    setLoading(false)
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyWholesaler)
    setMsg(null)
    setShowForm(true)
  }

  const openEdit = (ws) => {
    setEditing(ws.id)
    setForm({
      full_name:     ws.full_name     ?? '',
      business_name: ws.business_name ?? '',
      phone:         ws.phone         ?? '',
      email:         ws.email         ?? '',
      address:       ws.address       ?? '',
    })
    setMsg(null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveWholesaler = async () => {
    if (!form.full_name || !form.email) {
      setMsg({ type: 'error', text: 'Nom complet et email sont obligatoires' })
      return
    }
    setSaving(true)
    setMsg(null)
    const now = Date.now()

    let error
    if (editing) {
      ;({ error } = await supabase.from('user_accounts').update({
        full_name:     form.full_name,
        business_name: form.business_name,
        phone:         form.phone,
        email:         form.email,
        address:       form.address,
        last_modified: now,
      }).eq('id', editing))
    } else {
      ;({ error } = await supabase.from('user_accounts').insert({
        full_name:     form.full_name,
        business_name: form.business_name,
        phone:         form.phone,
        email:         form.email,
        address:       form.address,
        role:          'WHOLESALER',
        is_active:     true,
        created_date:  now,
        last_modified: now,
        synced:        true,
      }))
    }

    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      setMsg({ type: 'success', text: editing ? 'Grossiste mis à jour !' : 'Grossiste créé avec succès !' })
      setForm(emptyWholesaler)
      setEditing(null)
      setShowForm(false)
      loadNetwork()
    }
    setSaving(false)
  }

  const toggleActive = async (ws) => {
    await supabase.from('user_accounts')
      .update({ is_active: !ws.is_active, last_modified: Date.now() })
      .eq('id', ws.id)
    setConfirmDisable(null)
    loadNetwork()
  }

  const fmtDate = (ts) => ts ? new Date(ts).toLocaleDateString('fr-FR') : '—'

  if (loading) return (
    <div className="p-6 text-gray-400 text-center py-12">Chargement…</div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Réseau de distribution</h2>
        <button onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm
                     font-medium hover:bg-blue-700 transition-colors">
          ➕ Nouveau grossiste
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Grossistes"  value={wholesalers.length}                         color="blue"  />
        <StatCard label="Détaillants" value={retailers.length}                           color="green" />
        <StatCard label="Actifs"      value={wholesalers.filter(w => w.is_active).length} color="gray" />
      </div>

      {/* Message global */}
      {msg && !showForm && (
        <div className={`mb-4 p-3 rounded-lg text-sm
          ${msg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {msg.text}
        </div>
      )}

      {/* Formulaire création/modification */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6 border-l-4 border-blue-500">
          <h3 className="font-semibold text-gray-700 mb-4">
            {editing ? '✏️ Modifier le grossiste' : '➕ Créer un nouveau grossiste'}
          </h3>
          {msg && (
            <div className={`mb-4 p-3 rounded-lg text-sm
              ${msg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {msg.text}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[
              { key: 'full_name',     label: 'Nom du responsable *', placeholder: 'Jean Dupont'           },
              { key: 'business_name', label: "Nom de l'entreprise",  placeholder: 'Grossiste Dupont & Fils'},
              { key: 'email',         label: 'Email *',              placeholder: 'jean@grossiste.com'    },
              { key: 'phone',         label: 'Téléphone',            placeholder: '+33 6 00 00 00 00'     },
              { key: 'address',       label: 'Adresse',              placeholder: '12 rue du Commerce, Paris', col: 2 },
            ].map(({ key, label, placeholder, col }) => (
              <div key={key} className={col === 2 ? 'col-span-2' : ''}>
                <label className="text-sm text-gray-600 mb-1 block">{label}</label>
                <input
                  value={form[key]}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            ))}
          </div>

          {/* Note mot de passe */}
          {!editing && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              ⚠️ Après création, allez dans <strong>Supabase → Authentication → Users</strong> pour créer
              le compte de connexion avec l'email <strong>{form.email || 'saisi ci-dessus'}</strong> et
              communiquer le mot de passe au grossiste.
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={saveWholesaler} disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm
                         font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Enregistrement…' : (editing ? '💾 Mettre à jour' : '✅ Créer le grossiste')}
            </button>
            <button onClick={() => { setShowForm(false); setMsg(null) }}
              className="px-4 py-2 border text-gray-600 rounded-lg text-sm hover:bg-gray-50">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste grossistes */}
      <div className="space-y-4">
        {wholesalers.map(ws => {
          const wsRetailers = retailers.filter(r => r.parent_id === ws.id)
          return (
            <details key={ws.id} className="bg-white rounded-xl shadow overflow-hidden" open>
              <summary className="p-4 cursor-pointer hover:bg-gray-50 flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0
                  ${ws.is_active ? 'bg-blue-500' : 'bg-gray-300'}`}/>
                <div className="flex-1">
                  <span className="font-semibold">{ws.business_name ?? ws.full_name}</span>
                  <span className="text-gray-400 text-sm ml-2">{ws.full_name}</span>
                  {ws.phone && <span className="text-gray-400 text-sm ml-2">📞 {ws.phone}</span>}
                </div>
                <span className="text-gray-400 text-xs">{fmtDate(ws.created_date)}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                  ${ws.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {ws.is_active ? 'Actif' : 'Inactif'}
                </span>
                <span className="text-gray-400 text-sm">{wsRetailers.length} détaillant(s)</span>
              </summary>

              <div className="border-t">
                {/* Actions grossiste */}
                <div className="flex gap-2 px-4 py-3 bg-gray-50 border-b">
                  <button onClick={(e) => { e.preventDefault(); openEdit(ws) }}
                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-xs
                               hover:bg-blue-100 transition-colors">
                    ✏️ Modifier
                  </button>
                  {confirmDisable === ws.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">Confirmer ?</span>
                      <button onClick={(e) => { e.preventDefault(); toggleActive(ws) }}
                        className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700">
                        Oui
                      </button>
                      <button onClick={(e) => { e.preventDefault(); setConfirmDisable(null) }}
                        className="px-3 py-1 border text-gray-600 rounded text-xs hover:bg-gray-100">
                        Non
                      </button>
                    </div>
                  ) : (
                    <button onClick={(e) => { e.preventDefault(); setConfirmDisable(ws.id) }}
                      className={`px-3 py-1 rounded text-xs transition-colors
                        ${ws.is_active
                          ? 'bg-red-50   text-red-600   hover:bg-red-100'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                      {ws.is_active ? '🚫 Désactiver' : '✅ Réactiver'}
                    </button>
                  )}
                  <span className="ml-auto text-xs text-gray-400">
                    📧 {ws.email}
                  </span>
                </div>

                {/* Détaillants rattachés */}
                {wsRetailers.length === 0 ? (
                  <p className="px-8 py-3 text-gray-400 text-sm">Aucun détaillant rattaché</p>
                ) : wsRetailers.map(r => (
                  <div key={r.id}
                       className="flex items-center gap-3 px-8 py-3 border-b last:border-0 hover:bg-gray-50">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                      ${r.is_active ? 'bg-green-400' : 'bg-gray-300'}`}/>
                    <div className="flex-1">
                      <span className="text-sm font-medium">{r.business_name ?? r.full_name}</span>
                      {r.phone && <span className="text-gray-400 text-xs ml-2">{r.phone}</span>}
                    </div>
                    <span className="text-gray-400 text-xs">{r.email}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs
                      ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {r.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )
        })}

        {wholesalers.length === 0 && (
          <div className="text-gray-400 text-center py-12">
            Aucun grossiste dans le réseau —
            <button onClick={openCreate} className="text-blue-500 ml-1 hover:underline">
              en créer un
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  const colors = {
    blue:  'border-blue-500  text-blue-700',
    green: 'border-green-500 text-green-700',
    gray:  'border-gray-400  text-gray-700',
  }
  return (
    <div className={`bg-white rounded-xl p-4 shadow border-l-4 ${colors[color]}`}>
      <p className="text-gray-500 text-sm">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colors[color].split(' ')[1]}`}>{value}</p>
    </div>
  )
}