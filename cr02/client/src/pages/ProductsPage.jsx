import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const getToken = () => localStorage.getItem('token')
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`
})

const ROLE_LABELS = {
  user: 'Пользователь',
  seller: 'Продавец',
  admin: 'Администратор',
}

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [users, setUsers] = useState([])
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('products') // 'products' | 'users'

  // Форма товара
  const [form, setForm] = useState({ title: '', category: '', description: '', price: '' })
  const [editingId, setEditingId] = useState(null)

  // Форма пользователя
  const [userForm, setUserForm] = useState({ first_name: '', last_name: '', email: '', role: 'user' })
  const [editingUserId, setEditingUserId] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/auth/me', { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        setUser(data)
        // Загружаем товары для всех ролей
        fetch('/api/products', { headers: authHeaders() })
          .then(r => r.json())
          .then(setProducts)

        // Загружаем пользователей только для админа
        if (data.role === 'admin') {
          fetch('/api/users', { headers: authHeaders() })
            .then(r => r.json())
            .then(setUsers)
        }
      })
  }, [])

  // --- Продукты ---
  const handleSubmitProduct = async (e) => {
    e.preventDefault()
    const payload = { ...form, price: Number(form.price) }

    if (editingId) {
      const res = await fetch(`/api/products/${editingId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      })
      const updated = await res.json()
      setProducts(prev => prev.map(p => p.id === editingId ? updated : p))
      setEditingId(null)
    } else {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      })
      const created = await res.json()
      setProducts(prev => [...prev, created])
    }
    setForm({ title: '', category: '', description: '', price: '' })
  }

  const handleEditProduct = (product) => {
    setEditingId(product.id)
    setForm({ title: product.title, category: product.category, description: product.description, price: product.price })
  }

  const handleDeleteProduct = async (id) => {
    await fetch(`/api/products/${id}`, { method: 'DELETE', headers: authHeaders() })
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  // --- Пользователи ---
  const handleEditUser = (u) => {
    setEditingUserId(u.id)
    setUserForm({ first_name: u.first_name, last_name: u.last_name, email: u.email, role: u.role })
  }

  const handleSubmitUser = async (e) => {
    e.preventDefault()
    const res = await fetch(`/api/users/${editingUserId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(userForm)
    })
    const updated = await res.json()
    setUsers(prev => prev.map(u => u.id === editingUserId ? updated : u))
    setEditingUserId(null)
    setUserForm({ first_name: '', last_name: '', email: '', role: 'user' })
  }

  const handleBlockUser = async (id) => {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE', headers: authHeaders() })
    const updated = await res.json()
    setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, blocked: true } : u))
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const canEditProducts = user?.role === 'seller' || user?.role === 'admin'
  const canDeleteProducts = user?.role === 'admin'
  const isAdmin = user?.role === 'admin'

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24, fontFamily: 'sans-serif' }}>
      {/* Шапка */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Товары</h1>
        <div>
          {user && (
            <span style={{ marginRight: 12 }}>
              👤 {user.first_name} {user.last_name}
              <span style={{
                marginLeft: 8,
                fontSize: 12,
                background: '#e0e0e0',
                borderRadius: 4,
                padding: '2px 6px'
              }}>
                {ROLE_LABELS[user.role] || user.role}
              </span>
            </span>
          )}
          <button onClick={handleLogout}>Выйти</button>
        </div>
      </div>

      {/* Табы (только для админа показываем вкладку пользователей) */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button
            onClick={() => setTab('products')}
            style={{ fontWeight: tab === 'products' ? 'bold' : 'normal', borderBottom: tab === 'products' ? '2px solid #333' : 'none' }}
          >
            Товары
          </button>
          <button
            onClick={() => setTab('users')}
            style={{ fontWeight: tab === 'users' ? 'bold' : 'normal', borderBottom: tab === 'users' ? '2px solid #333' : 'none' }}
          >
            Пользователи
          </button>
        </div>
      )}

      {/* === ВКЛАДКА ТОВАРЫ === */}
      {tab === 'products' && (
        <>
          {/* Форма товара — только для seller и admin */}
          {canEditProducts && (
            <form
              onSubmit={handleSubmitProduct}
              style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32, background: '#f5f5f5', padding: 16, borderRadius: 8 }}
            >
              <h3 style={{ margin: 0 }}>{editingId ? 'Редактировать товар' : 'Добавить товар'}</h3>
              <input placeholder="Название" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
              <input placeholder="Категория" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} required />
              <input placeholder="Описание" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required />
              <input placeholder="Цена" type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} required />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit">{editingId ? 'Сохранить' : 'Создать'}</button>
                {editingId && (
                  <button type="button" onClick={() => { setEditingId(null); setForm({ title: '', category: '', description: '', price: '' }) }}>
                    Отмена
                  </button>
                )}
              </div>
            </form>
          )}

          {products.length === 0 && <p>Товаров пока нет</p>}
          {products.map(p => (
            <div key={p.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>{p.title}</strong> — {p.category}<br />
                  <small>{p.description}</small><br />
                  <b>{p.price} ₽</b>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  {canEditProducts && (
                    <button onClick={() => handleEditProduct(p)}>Редактировать</button>
                  )}
                  {canDeleteProducts && (
                    <button onClick={() => handleDeleteProduct(p.id)}>Удалить</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* === ВКЛАДКА ПОЛЬЗОВАТЕЛИ === */}
      {tab === 'users' && isAdmin && (
        <>
          {/* Форма редактирования пользователя */}
          {editingUserId && (
            <form
              onSubmit={handleSubmitUser}
              style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32, background: '#f5f5f5', padding: 16, borderRadius: 8 }}
            >
              <h3 style={{ margin: 0 }}>Редактировать пользователя</h3>
              <input placeholder="Имя" value={userForm.first_name} onChange={e => setUserForm(p => ({ ...p, first_name: e.target.value }))} required />
              <input placeholder="Фамилия" value={userForm.last_name} onChange={e => setUserForm(p => ({ ...p, last_name: e.target.value }))} required />
              <input placeholder="Email" value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} required />
              <select value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value }))}>
                <option value="user">Пользователь</option>
                <option value="seller">Продавец</option>
                <option value="admin">Администратор</option>
              </select>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit">Сохранить</button>
                <button type="button" onClick={() => { setEditingUserId(null); setUserForm({ first_name: '', last_name: '', email: '', role: 'user' }) }}>
                  Отмена
                </button>
              </div>
            </form>
          )}

          {users.length === 0 && <p>Пользователей нет</p>}
          {users.map(u => (
            <div key={u.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12, opacity: u.blocked ? 0.5 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>{u.first_name} {u.last_name}</strong>
                  <span style={{ marginLeft: 8, fontSize: 12, background: '#e0e0e0', borderRadius: 4, padding: '2px 6px' }}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                  {u.blocked && (
                    <span style={{ marginLeft: 8, fontSize: 12, background: '#ffcccc', borderRadius: 4, padding: '2px 6px' }}>
                      Заблокирован
                    </span>
                  )}
                  <br />
                  <small>{u.email}</small>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <button onClick={() => handleEditUser(u)}>Изменить</button>
                  {!u.blocked && (
                    <button onClick={() => handleBlockUser(u.id)} title="Заблокировать">Заблокировать</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}