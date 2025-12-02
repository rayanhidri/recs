import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../api'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { setUser } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await login(email, password)
      const { getMe } = await import('../api')
      const res = await getMe()
      setUser(res.data)
      navigate('/')
    } catch (err) {
      setError('invalid email or password')
    }
  }

  return (
    <div className="auth-page">
      <h2>login</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <p className="error">{error}</p>}
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">login</button>
      </form>
      <p className="auth-switch">
        no account? <Link to="/signup">signup</Link>
      </p>
    </div>
  )
}