import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LoginPage.css'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const form = e.target
    const email = form.email.value
    const password = form.password.value

    if (isLogin) {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem('token', data.accessToken)
        navigate('/products')
      } else {
        alert(data.error)
      }
    } else {
      const first_name = form.first_name.value
      const last_name = form.last_name.value
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, first_name, last_name })
      })
      const data = await res.json()
      if (res.ok) {
        setIsLogin(true)
      } else {
        alert(data.error)
      }
    }
  }

  return (
    <div className="auth-page">
      <div className="container">
        <h2>{isLogin ? 'Вход' : 'Регистрация'}</h2>
        <form className="form" onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <input name="first_name" type="text" placeholder="Имя" required />
              <input name="last_name" type="text" placeholder="Фамилия" required />
            </>
          )}
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Пароль" required />
          {!isLogin && (
            <input name="confirm_password" type="password" placeholder="Подтвердите пароль" required />
          )}
          <button type="submit">{isLogin ? 'Вход' : 'Регистрация'}</button>
        </form>
        <p className="toggle" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Создать аккаунт" : 'Войти в аккаунт'}
        </p>
      </div>
    </div>
  )
}