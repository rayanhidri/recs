import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Feed from './pages/Feed'
import Search from './pages/Search'
import Create from './pages/Create'
import Profile from './pages/Profile'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
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
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App