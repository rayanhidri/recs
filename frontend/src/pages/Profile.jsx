import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMe, getUser, getUserRecs, followUser, unfollowUser, updateMe, getFollowers, getFollowing, deleteRec, getPinnedRecs, getMyPinnedRecs, updatePinnedRecs } from '../api'
import { getCategoryStyle } from '../utils/categoryColors'
import { useAuth } from '../context/AuthContext'
import StartChatButton from '../components/StartChatButton'

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
  const [pinned, setPinned] = useState([])
  const [showPinModal, setShowPinModal] = useState(false)
  const [selectedPins, setSelectedPins] = useState([])
  const [savingPins, setSavingPins] = useState(false)

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

        const pinnedRes = isOwnProfile
          ? await getMyPinnedRecs()
          : await getPinnedRecs(userRes.data.username)
        setPinned(pinnedRes.data)
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

  const openPinModal = () => {
    setSelectedPins(pinned.map(p => p.id))
    setShowPinModal(true)
  }

  const togglePinSelection = (recId) => {
    setSelectedPins(prev =>
      prev.includes(recId)
        ? prev.filter(id => id !== recId)
        : prev.length < 3 ? [...prev, recId] : prev
    )
  }

  const savePins = async () => {
    setSavingPins(true)
    try {
      await updatePinnedRecs(selectedPins)
      const res = await getMyPinnedRecs()
      setPinned(res.data)
      setShowPinModal(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingPins(false)
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
          <>
            <button 
              className={`tune-button ${user.is_following ? 'tuned' : ''}`}
              onClick={handleFollow}
            >
              {user.is_following ? 'tuned' : 'tune in'}
            </button>
            <StartChatButton userId={user.id} username={user.username} />
          </>
        )}
      </div>

      {/* Right now section */}
      {(pinned.length > 0 || isOwnProfile) && (
        <div className="right-now-section">
          <div className="right-now-header">
            <span className="right-now-label">right now</span>
            {isOwnProfile && (
              <button className="right-now-edit" onClick={openPinModal}>
                {pinned.length === 0 ? '+ add' : 'edit'}
              </button>
            )}
          </div>
          {pinned.length === 0 ? (
            <p className="right-now-empty" onClick={openPinModal}>
              what are you into right now?
            </p>
          ) : (
            <div className="right-now-grid">
              {pinned.map(rec => (
                <div
                  key={rec.id}
                  className="pinned-card"
                  onClick={() => rec.link && window.open(rec.link, '_blank')}
                >
                  <div className="pinned-card-img">
                    {rec.image
                      ? <img src={rec.image} alt={rec.title} />
                      : <div className="pinned-card-placeholder">{rec.category}</div>
                    }
                  </div>
                  <p className="pinned-card-title">{rec.title}</p>
                  <span className="pinned-card-category" style={getCategoryStyle(rec.category)}>{rec.category}</span>
                </div>
              ))}
              {isOwnProfile && pinned.length < 3 && [...Array(3 - pinned.length)].map((_, i) => (
                <div key={`empty-${i}`} className="pinned-card pinned-card-empty" onClick={openPinModal}>
                  <div className="pinned-card-img pinned-card-img-empty">+</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
                <span className="profile-rec-type" style={getCategoryStyle(rec.category)}>{rec.category}</span>
                <h3 className="profile-rec-title">{rec.title}</h3>
                {rec.description && <p className="profile-rec-desc">{rec.description}</p>}
                {rec.link && (
                  <a href={rec.link} target="_blank" rel="noopener noreferrer" className="profile-rec-link">
                    open link ↗
                  </a>
                )}
              </div>
              {isOwnProfile && (
                <div className="profile-rec-actions">
                  <button className="edit-rec-btn" onClick={() => navigate(`/edit/${rec.id}`)}>edit</button>
                  <button className="delete-rec-btn" onClick={() => handleDeleteRec(rec.id)}>×</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showPinModal && (
        <div className="modal-overlay" onClick={() => setShowPinModal(false)}>
          <div className="modal pin-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>right now <span className="pin-modal-count">{selectedPins.length}/3</span></h3>
              <button className="modal-close" onClick={() => setShowPinModal(false)}>×</button>
            </div>
            <p className="pin-modal-hint">pick up to 3 recs you're into right now</p>
            <div className="pin-picker-grid">
              {recs.map(rec => {
                const selected = selectedPins.includes(rec.id)
                const maxed = selectedPins.length >= 3 && !selected
                return (
                  <div
                    key={rec.id}
                    className={`pin-picker-item ${selected ? 'selected' : ''} ${maxed ? 'maxed' : ''}`}
                    onClick={() => !maxed && togglePinSelection(rec.id)}
                  >
                    <div className="pin-picker-img">
                      {rec.image
                        ? <img src={rec.image} alt={rec.title} />
                        : <div className="pin-picker-placeholder">{rec.category[0]}</div>
                      }
                      {selected && <div className="pin-picker-check">✓</div>}
                    </div>
                    <p className="pin-picker-title">{rec.title || rec.category}</p>
                  </div>
                )
              })}
            </div>
            <button className="pin-save-btn" onClick={savePins} disabled={savingPins}>
              {savingPins ? 'saving...' : 'save'}
            </button>
          </div>
        </div>
      )}

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
