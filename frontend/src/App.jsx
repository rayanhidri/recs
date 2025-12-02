import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Feed from './pages/Feed'
import Search from './pages/Search'
import Create from './pages/Create'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Signup from './pages/Signup'
import './App.css'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">loading...</div>
  if (!user) return <Navigate to="/login" />
  return children
}

function AppContent() {
  const { user } = useAuth()

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    )
  }

  return (
    <>
      <header className="header">
        <h1 className="logo">recs.</h1>
        <nav className="nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>feed</NavLink>
          <NavLink to="/search" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>search</NavLink>
          <NavLink to="/create" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>+</NavLink>
          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>profile</NavLink>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/search" element={<Search />} />
        <Route path="/create" element={<Create />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:username" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app">
          <AppContent />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App