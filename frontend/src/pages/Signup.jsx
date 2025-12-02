import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signup, login, getMe } from '../api'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { setUser } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await signup(username, email, password)
      await login(email, password)
      const res = await getMe()
      setUser(res.data)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'signup failed')
    }
  }

  return (
    <div className="auth-page">
      <h2>signup</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <p className="error">{error}</p>}
        <input
          type="text"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
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
        <button type="submit">signup</button>
      </form>
      <p className="auth-switch">
        already have an account? <Link to="/login">login</Link>
      </p>
    </div>
  )
}