import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const getToken = () => localStorage.getItem('token')
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`
})

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({ title: '', category: '', description: '', price: '' })
  const [editingId, setEditingId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/auth/me', { headers: authHeaders() })
      .then(r => r.json())
      .then(setUser)

    fetch('/api/products')
      .then(r => r.json())
      .then(setProducts)
  }, [])

  const handleSubmit = async (e) => {
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

  const handleEdit = (product) => {
    setEditingId(product.id)
    setForm({ title: product.title, category: product.category, description: product.description, price: product.price })
  }

  const handleDelete = async (id) => {
    await fetch(`/api/products/${id}`, { method: 'DELETE', headers: authHeaders() })
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Товары</h1>
        <div>
          {user && <span style={{ marginRight: 12 }}>👤 {user.first_name} {user.last_name}</span>}
          <button onClick={handleLogout}>Выйти</button>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32, background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
        <h3>{editingId ? 'Редактировать товар' : 'Добавить товар'}</h3>
        <input placeholder="Название" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
        <input placeholder="Категория" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} required />
        <input placeholder="Описание" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required />
        <input placeholder="Цена" type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} required />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit">{editingId ? 'Сохранить' : 'Создать'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ title: '', category: '', description: '', price: '' }) }}>Отмена</button>}
        </div>
      </form>

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
              <button onClick={() => handleEdit(p)}>✏️</button>
              <button onClick={() => handleDelete(p.id)}>🗑</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}