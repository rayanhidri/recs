import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { signup, login, getMe, googleAuth } from '../api'
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

  const handleGoogle = async (credentialResponse) => {
    try {
      await googleAuth(credentialResponse.credential)
      const res = await getMe()
      setUser(res.data)
      navigate('/')
    } catch (err) {
      setError('google sign-in failed')
    }
  }

  return (
    <div className="auth-page">
      <h2>signup</h2>
      <div className="auth-google-first">
        <GoogleLogin onSuccess={handleGoogle} onError={() => setError('google sign-in failed')} />
      </div>
      <div className="auth-divider">or sign up with email</div>
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