// src/pages/EmployeesPage.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const WHOLESALER_PERMS = [
  { key: 'perm_register_retailers', label: 'Enregistrer des détaillants' },
  { key: 'perm_deliver_retailers',  label: 'Livrer aux détaillants'      },
  { key: 'perm_view_stock',         label: 'Voir le stock'               },
  { key: 'perm_handle_orders',      label: 'Traiter les commandes'       },
]
const RETAILER_PERMS = [
  { key: 'perm_make_sales',        label: 'Faire des ventes'              },
  { key: 'perm_close_own_credits', label: 'Clôturer ses propres crédits'  },
  { key: 'perm_view_stock',        label: 'Voir le stock'                 },
  { key: 'perm_close_own_sales',   label: 'Clôturer ses ventes en attente'},
]

const emptyForm = {
  full_name: '', employee_number: '', email: '', pin: '',
  perm_register_retailers: false, perm_deliver_retailers: false,
  perm_view_stock: false, perm_handle_orders: false,
  perm_make_sales: false, perm_close_own_credits: false, perm_close_own_sales: false,
}

export default function EmployeesPage({ ownerId, role }) {
  const [employees, setEmployees] = useState([])
  const [form,      setForm]      = useState(emptyForm)
  const [editing,   setEditing]   = useState(null)   // id ou null
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState(null)

  const perms = role === 'WHOLESALER' ? WHOLESALER_PERMS : RETAILER_PERMS

  useEffect(() => { loadEmployees() }, [ownerId])

  const loadEmployees = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('owner_id', ownerId)
      .order('full_name')
    setEmployees(data ?? [])
    setLoading(false)
  }

  const saveEmployee = async () => {
    if (!form.full_name || !form.email) {
      setMsg({ type: 'error', text: 'Nom et email obligatoires' })
      return
    }
    setSaving(true)
    setMsg(null)
    const now = Date.now()
    const payload = {
      owner_id:       ownerId,
      full_name:      form.full_name,
      employee_number:form.employee_number,
      email:          form.email,
      pin:            form.pin || null,
      last_modified:  now,
      perm_register_retailers: form.perm_register_retailers,
      perm_deliver_retailers:  form.perm_deliver_retailers,
      perm_view_stock:         form.perm_view_stock,
      perm_handle_orders:      form.perm_handle_orders,
      perm_make_sales:         form.perm_make_sales,
      perm_close_own_credits:  form.perm_close_own_credits,
      perm_close_own_sales:    form.perm_close_own_sales,
    }

    let error
    if (editing) {
      ;({ error } = await supabase.from('employees').update(payload).eq('id', editing))
    } else {
      ;({ error } = await supabase.from('employees').insert({ ...payload, created_date: now }))
    }

    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      setMsg({ type: 'success', text: editing ? 'Employé mis à jour !' : 'Employé créé !' })
      setForm(emptyForm)
      setEditing(null)
      loadEmployees()
    }
    setSaving(false)
  }

  const editEmployee = (emp) => {
    setEditing(emp.id)
    setForm({ ...emptyForm, ...emp })
    setMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleActive = async (emp) => {
    await supabase.from('employees')
      .update({ active: !emp.active, last_modified: Date.now() })
      .eq('id', emp.id)
    loadEmployees()
  }

  const cancelEdit = () => { setEditing(null); setForm(emptyForm); setMsg(null) }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">🧑‍💼 Gestion des employés</h2>

      {/* Formulaire */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h3 className="font-semibold text-gray-700 mb-4">
          {editing ? '✏️ Modifier un employé' : '➕ Ajouter un employé'}
        </h3>
        {msg && (
          <div className={`mb-4 p-3 rounded-lg text-sm
            ${msg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {msg.text}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          {[
            { key: 'full_name',        label: 'Nom complet *',    placeholder: 'Jean Dupont'        },
            { key: 'employee_number',  label: 'Matricule',        placeholder: 'EMP-001'            },
            { key: 'email',            label: 'Email *',          placeholder: 'jean@entreprise.com'},
            { key: 'pin',              label: 'PIN (4 chiffres)', placeholder: '1234'               },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-sm text-gray-600 mb-1 block">{label}</label>
              <input
                value={form[key]}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                type={key === 'pin' ? 'password' : 'text'}
                maxLength={key === 'pin' ? 4 : undefined}
                className="w-full border rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          ))}
        </div>

        {/* Permissions */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Permissions :</div>
          <div className="grid grid-cols-2 gap-2">
            {perms.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer
                                          bg-gray-50 rounded-lg p-3 hover:bg-gray-100">
                <input type="checkbox"
                  checked={form[key] ?? false}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600"/>
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={saveEmployee} disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm
                       font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Enregistrement…' : (editing ? '💾 Mettre à jour' : '✅ Créer l\'employé')}
          </button>
          {editing && (
            <button onClick={cancelEdit}
              className="px-4 py-2 border text-gray-600 rounded-lg text-sm hover:bg-gray-50">
              Annuler
            </button>
          )}
        </div>
      </div>

      {/* Liste employés */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b font-semibold text-gray-700">
          Employés ({employees.length})
        </div>
        {loading ? (
          <div className="p-8 text-gray-400 text-center">Chargement…</div>
        ) : employees.length === 0 ? (
          <div className="p-8 text-gray-400 text-center">Aucun employé</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left p-3">Nom</th>
                <th className="text-left p-3">Matricule</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Permissions</th>
                <th className="text-center p-3">Actif</th>
                <th className="text-center p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className={`border-t hover:bg-gray-50 ${!emp.active ? 'opacity-50' : ''}`}>
                  <td className="p-3 font-medium">{emp.full_name}</td>
                  <td className="p-3 font-mono text-gray-500">{emp.employee_number || '—'}</td>
                  <td className="p-3 text-gray-500">{emp.email}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {perms.filter(p => emp[p.key]).map(p => (
                        <span key={p.key}
                          className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {p.label.split(' ').slice(0, 2).join(' ')}
                        </span>
                      ))}
                      {perms.filter(p => emp[p.key]).length === 0 && (
                        <span className="text-gray-400 text-xs">Aucune permission</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => toggleActive(emp)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer
                        ${emp.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {emp.active ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => editEmployee(emp)}
                      className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-xs
                                 hover:bg-blue-100 transition-colors">
                      ✏️ Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}