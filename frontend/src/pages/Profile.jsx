import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getMe, getUser, getUserRecs, followUser, unfollowUser, updateMe } from '../api'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { username } = useParams()
  const { user: currentUser } = useAuth()
  const [user, setUser] = useState(null)
  const [recs, setRecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState('')

  const isOwnProfile = !username || username === currentUser?.username

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = isOwnProfile 
          ? await getMe() 
          : await getUser(username)
        setUser(userRes.data)
        setBio(userRes.data.bio || '')
        setAvatar(userRes.data.avatar || '')

        const recsRes = await getUserRecs(userRes.data.username)
        setRecs(recsRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [username, isOwnProfile])

  const handleFollow = async () => {
    try {
      if (user.is_following) {
        await unfollowUser(user.username)
        setUser({ ...user, is_following: false, tuned_in: user.tuned_in - 1 })
      } else {
        await followUser(user.username)
        setUser({ ...user, is_following: true, tuned_in: user.tuned_in + 1 })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSave = async () => {
    try {
      const res = await updateMe({ bio, avatar })
      setUser(res.data)
      setEditing(false)
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div className="loading">loading...</div>
  if (!user) return <div className="loading">user not found</div>

  return (
    <div className="profile">
      <div className="profile-header">
        <div className="avatar-container">
          {editing ? (
            <input
              type="url"
              placeholder="avatar url..."
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              className="edit-input"
            />
          ) : (
            <img 
              src={user.avatar || 'https://via.placeholder.com/100'} 
              alt={user.username} 
              className="profile-avatar" 
            />
          )}
        </div>
        
        <h2 className="profile-username">{user.username}</h2>
        
        {editing ? (
          <textarea
            placeholder="write your bio..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="edit-bio"
            rows={3}
          />
        ) : (
          <p className="profile-bio">{user.bio || 'no bio yet'}</p>
        )}
        
        <div className="profile-stats">
          <div className="stat">
            <span className="stat-number">{user.recs_count}</span>
            <span className="stat-label">recs</span>
          </div>
          <div className="stat">
            <span className="stat-number">{user.tuned_in}</span>
            <span className="stat-label">tuned in</span>
          </div>
          <div className="stat">
            <span className="stat-number">{user.tuned_to}</span>
            <span className="stat-label">tuned to</span>
          </div>
        </div>

        {isOwnProfile ? (
          editing ? (
            <div className="edit-buttons">
              <button className="save-button" onClick={handleSave}>save</button>
              <button className="cancel-button" onClick={() => setEditing(false)}>cancel</button>
            </div>
          ) : (
            <button className="edit-button" onClick={() => setEditing(true)}>edit profile</button>
          )
        ) : (
          <button 
            className={`tune-button ${user.is_following ? 'tuned' : ''}`}
            onClick={handleFollow}
          >
            {user.is_following ? 'tuned' : 'tune in'}
          </button>
        )}
      </div>

      <div className="profile-recs">
        {recs.length === 0 ? (
          <p className="no-recs">no recs yet</p>
        ) : (
          recs.map(rec => (
            <div key={rec.id} className="profile-rec">
              {rec.image && (
                <img src={rec.image} alt={rec.title} className="profile-rec-image" />
              )}
              <div className="profile-rec-info">
                <span className="profile-rec-type">{rec.category}</span>
                <h3 className="profile-rec-title">{rec.title}</h3>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}