import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMe, getUser, getUserRecs, followUser, unfollowUser, updateMe, getFollowers, getFollowing, deleteRec } from '../api'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [user, setUser] = useState(null)
  const [recs, setRecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState('')
  const [showModal, setShowModal] = useState(null)
  const [modalUsers, setModalUsers] = useState([])
  const [loadingModal, setLoadingModal] = useState(false)
  const [uploading, setUploading] = useState(false)

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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'recs_unsigned')
    formData.append('cloud_name', 'dzbhkicv0')

    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/dzbhkicv0/image/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      setAvatar(data.secure_url)
    } catch (err) {
      console.error('Upload failed:', err)
      alert('upload failed')
    } finally {
      setUploading(false)
    }
  }

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

  const handleDeleteRec = async (recId) => {
    if (window.confirm('delete this rec?')) {
      try {
        await deleteRec(recId)
        setRecs(recs.filter(r => r.id !== recId))
        setUser({ ...user, recs_count: user.recs_count - 1 })
      } catch (err) {
        console.error(err)
      }
    }
  }

  const openModal = async (type) => {
    setShowModal(type)
    setLoadingModal(true)
    try {
      const res = type === 'followers' 
        ? await getFollowers(user.username)
        : await getFollowing(user.username)
      setModalUsers(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingModal(false)
    }
  }

  const closeModal = () => {
    setShowModal(null)
    setModalUsers([])
  }

  if (loading) return <div className="loading">loading...</div>
  if (!user) return <div className="loading">user not found</div>

  return (
    <div className="profile">
      <div className="profile-header">
        <div className="avatar-container">
          {editing ? (
            <div className="avatar-edit">
              <img 
                src={avatar || 'https://via.placeholder.com/100'} 
                alt="preview" 
                className="profile-avatar"
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="file-input"
                id="avatar-upload"
              />
              <label htmlFor="avatar-upload" className="upload-button">
                {uploading ? 'uploading...' : 'choose photo'}
              </label>
            </div>
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
          <div className="stat clickable" onClick={() => openModal('followers')}>
            <span className="stat-number">{user.tuned_in}</span>
            <span className="stat-label">tuned in</span>
          </div>
          <div className="stat clickable" onClick={() => openModal('following')}>
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
                <img 
                  src={rec.image} 
                  alt={rec.title} 
                  className="profile-rec-image clickable"
                  onClick={() => rec.link && window.open(rec.link, '_blank')}
                />
              )}
              <div className="profile-rec-info">
                <span className="profile-rec-type">{rec.category}</span>
                <h3 className="profile-rec-title">{rec.title}</h3>
                {rec.description && <p className="profile-rec-desc">{rec.description}</p>}
                {rec.link && (
                  <a href={rec.link} target="_blank" rel="noopener noreferrer" className="profile-rec-link">
                    open link ↗
                  </a>
                )}
              </div>
              {isOwnProfile && (
                <button 
                  className="delete-rec-btn"
                  onClick={() => handleDeleteRec(rec.id)}
                >
                  ×
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{showModal === 'followers' ? 'tuned in' : 'tuned to'}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-content">
              {loadingModal ? (
                <p>loading...</p>
              ) : modalUsers.length === 0 ? (
                <p className="empty-modal">no one yet</p>
              ) : (
                modalUsers.map(u => (
                  <div key={u.id} className="modal-user" onClick={() => { closeModal(); navigate(`/profile/${u.username}`); }}>
                    <img src={u.avatar || 'https://via.placeholder.com/40'} alt={u.username} className="modal-avatar" />
                    <div className="modal-user-info">
                      <span className="modal-username">{u.username}</span>
                      <span className="modal-bio">{u.bio || 'no bio'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}