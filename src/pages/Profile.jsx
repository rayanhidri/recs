import { useState } from 'react'

const mockUser = {
  username: 'rayan',
  bio: 'music, films, et trucs cool.',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
  recs: 12,
  tunedIn: 48,
  tunedTo: 124,
  isOwnProfile: true,
}

const mockRecs = [
  {
    id: 1,
    type: 'music',
    title: 'frank ocean - blonde',
    image: 'https://upload.wikimedia.org/wikipedia/en/a/a0/Blonde_-_Frank_Ocean.jpeg',
  },
  {
    id: 2,
    type: 'film',
    title: 'la haine',
    image: 'https://upload.wikimedia.org/wikipedia/en/2/2b/La_Haine.jpg',
  },
  {
    id: 3,
    type: 'article',
    title: 'how to do nothing',
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
  },
]

export default function Profile() {
  const [user, setUser] = useState(mockUser)
  const [recs] = useState(mockRecs)
  const [isTuned, setIsTuned] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editBio, setEditBio] = useState(user.bio)

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setUser({ ...user, avatar: URL.createObjectURL(file) })
    }
  }

  const handleSaveBio = () => {
    setUser({ ...user, bio: editBio })
    setIsEditing(false)
  }

  return (
    <div className="profile">
      <div className="profile-header">
        <div className="avatar-container">
          <img src={user.avatar} alt={user.username} className="profile-avatar" />
          {user.isOwnProfile && (
            <label className="avatar-edit">
              <input type="file" accept="image/*" onChange={handleAvatarChange} hidden />
              ✎
            </label>
          )}
        </div>
        
        <h2 className="profile-username">{user.username}</h2>
        
        {isEditing ? (
          <div className="edit-bio">
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              rows={2}
            />
            <div className="edit-bio-buttons">
              <button onClick={handleSaveBio}>save</button>
              <button onClick={() => setIsEditing(false)} className="cancel">cancel</button>
            </div>
          </div>
        ) : (
          <p className="profile-bio" onClick={() => user.isOwnProfile && setIsEditing(true)}>
            {user.bio}
            {user.isOwnProfile && <span className="bio-edit-hint"> ✎</span>}
          </p>
        )}
        
        <div className="profile-stats">
          <div className="stat">
            <span className="stat-number">{user.recs}</span>
            <span className="stat-label">recs</span>
          </div>
          <div className="stat">
            <span className="stat-number">{user.tunedIn}</span>
            <span className="stat-label">tuned in</span>
          </div>
          <div className="stat">
            <span className="stat-number">{user.tunedTo}</span>
            <span className="stat-label">tuned to</span>
          </div>
        </div>

        {!user.isOwnProfile && (
          <button 
            className={`tune-button ${isTuned ? 'tuned' : ''}`}
            onClick={() => setIsTuned(!isTuned)}
          >
            {isTuned ? 'tuned' : 'tune in'}
          </button>
        )}
      </div>

      <div className="profile-recs">
        {recs.map(rec => (
          <div key={rec.id} className="profile-rec">
            <img src={rec.image} alt={rec.title} className="profile-rec-image" />
            <div className="profile-rec-info">
              <span className="profile-rec-type">{rec.type}</span>
              <h3 className="profile-rec-title">{rec.title}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}