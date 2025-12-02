import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const mockUsers = [
  { id: 1, username: 'marie', bio: 'music lover, film addict', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200', tuned: false },
  { id: 2, username: 'thomas', bio: 'cinema et podcasts', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', tuned: true },
  { id: 3, username: 'léa', bio: 'articles, books, thoughts', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200', tuned: false },
  { id: 4, username: 'jules', bio: 'rap fr, underground stuff', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200', tuned: false },
  { id: 5, username: 'camille', bio: 'fashion et design', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200', tuned: true },
]

export default function Search() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState(mockUsers)

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(query.toLowerCase()) ||
    user.bio.toLowerCase().includes(query.toLowerCase())
  )

  const handleTune = (userId) => {
    setUsers(users.map(user => {
      if (user.id === userId) {
        return { ...user, tuned: !user.tuned }
      }
      return user
    }))
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
        {filteredUsers.map(user => (
          <div key={user.id} className="search-user">
            <img 
              src={user.avatar} 
              alt={user.username} 
              className="search-avatar"
              onClick={() => navigate(`/profile/${user.username}`)}
            />
            <div className="search-user-info" onClick={() => navigate(`/profile/${user.username}`)}>
              <span className="search-username">{user.username}</span>
              <span className="search-bio">{user.bio}</span>
            </div>
            <button 
              className={`tune-button ${user.tuned ? 'tuned' : ''}`}
              onClick={() => handleTune(user.id)}
            >
              {user.tuned ? 'tuned' : 'tune in'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}