import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { followUser, unfollowUser } from '../api'
import api from '../api'

export default function Search() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  const searchUsers = async (q) => {
    if (!q.trim()) {
      setUsers([])
      return
    }
    setLoading(true)
    try {
      const res = await api.get(`/users/search?q=${q}`)
      setUsers(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const handleTune = async (username, isFollowing) => {
    try {
      if (isFollowing) {
        await unfollowUser(username)
      } else {
        await followUser(username)
      }
      setUsers(users.map(user => {
        if (user.username === username) {
          return { ...user, is_following: !isFollowing }
        }
        return user
      }))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="search">
      <div className="search-bar">
        <input
          type="text"
          placeholder="search users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="search-results">
        {loading && <p className="loading-text">searching...</p>}
        {users.map(user => (
          <div key={user.id} className="search-user">
            <img 
              src={user.avatar || 'https://via.placeholder.com/48'} 
              alt={user.username} 
              className="search-avatar"
              onClick={() => navigate(`/profile/${user.username}`)}
            />
            <div className="search-user-info" onClick={() => navigate(`/profile/${user.username}`)}>
              <span className="search-username">{user.username}</span>
              <span className="search-bio">{user.bio || 'no bio'}</span>
            </div>
            <button 
              className={`tune-button ${user.is_following ? 'tuned' : ''}`}
              onClick={() => handleTune(user.username, user.is_following)}
            >
              {user.is_following ? 'tuned' : 'tune in'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}