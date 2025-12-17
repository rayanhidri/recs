import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNotifications, markNotificationsRead } from '../api'

function timeAgo(dateString) {
  const now = new Date()
  const date = new Date(dateString)
  const seconds = Math.floor((now - date) / 1000)
  
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  return `${weeks}w`
}

export default function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await getNotifications()
        setNotifications(res.data)
        await markNotificationsRead()
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
  }, [])

  const getNotificationText = (notif) => {
    switch (notif.type) {
      case 'like':
        return 'liked your rec'
      case 'comment':
        return 'commented on your rec'
      case 'follow':
        return 'started following you'
      default:
        return ''
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return '♥'
      case 'comment':
        return '💬'
      case 'follow':
        return '+'
      default:
        return ''
    }
  }

  const handleClick = (notif) => {
    if (notif.type === 'follow') {
      navigate(`/profile/${notif.from_username}`)
    } else {
      navigate(`/profile/${notif.from_username}`)
    }
  }

  if (loading) return <div className="loading">loading...</div>

  return (
    <div className="notifications-page">
      <h2 className="notifications-title">notifications</h2>
      
      {notifications.length === 0 ? (
        <p className="no-notifications">no notifications yet</p>
      ) : (
        <div className="notifications-list">
          {notifications.map(notif => (
            <div 
              key={notif.id} 
              className={`notif-item ${!notif.is_read ? 'notif-unread' : ''}`}
              onClick={() => handleClick(notif)}
            >
              <div className="notif-avatar-wrapper">
                <img 
                  src={notif.from_user_avatar || 'https://via.placeholder.com/44'} 
                  alt={notif.from_username}
                  className="notif-avatar"
                />
                <span className={`notif-icon notif-icon-${notif.type}`}>
                  {getNotificationIcon(notif.type)}
                </span>
              </div>
              <div className="notif-text">
                <p>
                  <strong>{notif.from_username}</strong> {getNotificationText(notif)}
                </p>
                <span className="notif-time">{timeAgo(notif.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}