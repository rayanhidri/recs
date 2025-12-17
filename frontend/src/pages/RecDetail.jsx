import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getRec, likeRec, unlikeRec, getComments, createComment } from '../api'

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

function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return ''
  }
}

export default function RecDetail() {
  const { recId } = useParams()
  const navigate = useNavigate()
  const [rec, setRec] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const recRes = await getRec(recId)
        setRec(recRes.data)
        const commentsRes = await getComments(recId)
        setComments(commentsRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [recId])

  const handleLike = async () => {
    try {
      if (rec.is_liked) {
        await unlikeRec(rec.id)
        setRec({ ...rec, is_liked: false, likes_count: rec.likes_count - 1 })
      } else {
        await likeRec(rec.id)
        setRec({ ...rec, is_liked: true, likes_count: rec.likes_count + 1 })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    
    try {
      const res = await createComment(rec.id, newComment)
      setComments([...comments, res.data])
      setNewComment('')
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div className="loading">loading...</div>
  if (!rec) return <div className="loading">rec not found</div>

  const hasLinkWithImage = rec.link && rec.image
  const hasImageOnly = rec.image && !rec.link

  return (
    <div className="rec-detail-page">
      <button className="back-btn" onClick={() => navigate(-1)}>← back</button>
      
      <article className="post">
        <div className="post-header">
          <div className="post-user" onClick={() => navigate(`/profile/${rec.username}`)}>
            <img 
              src={rec.user_avatar || 'https://via.placeholder.com/40'} 
              alt={rec.username} 
              className="post-avatar"
            />
            <div className="post-user-info">
              <span className="post-username">{rec.username}</span>
              <div className="post-meta">
                <span className="post-category">{rec.category}</span>
                <span className="post-time">{timeAgo(rec.created_at)}</span>
              </div>
            </div>
          </div>
          {hasLinkWithImage && (
            <img 
              src={rec.image} 
              alt={rec.title} 
              className="post-thumbnail"
              onClick={() => window.open(rec.link, '_blank')}
            />
          )}
        </div>

        {hasImageOnly && (
          <div className="post-image-large">
            <img src={rec.image} alt={rec.title} />
          </div>
        )}
        
        <div className="post-content">
          <h2 className="post-title">{rec.title}</h2>
          {rec.description && <p className="post-description">{rec.description}</p>}
          {rec.link && <span className="post-domain">{getDomain(rec.link)}</span>}
        </div>
        
        <div className="post-footer">
          {rec.link && (
            <a href={rec.link} target="_blank" rel="noopener noreferrer" className="post-open">
              open link
            </a>
          )}
          <button 
            className={`post-like ${rec.is_liked ? 'liked' : ''}`}
            onClick={handleLike}
          >
            {rec.is_liked ? '♥' : '♡'} {rec.likes_count > 0 && rec.likes_count}
          </button>
        </div>

        <div className="comments-section">
          {comments.length > 0 && (
            <div className="comments-list">
              {comments.map(comment => (
                <div key={comment.id} className="comment">
                  <img 
                    src={comment.user_avatar || 'https://via.placeholder.com/28'} 
                    alt={comment.username}
                    className="comment-avatar"
                    onClick={() => navigate(`/profile/${comment.username}`)}
                  />
                  <div className="comment-body">
                    <span className="comment-username" onClick={() => navigate(`/profile/${comment.username}`)}>
                      {comment.username}
                    </span>
                    <span className="comment-content">{comment.content}</span>
                    <span className="comment-time">{timeAgo(comment.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleAddComment} className="comment-form">
            <input
              type="text"
              placeholder="add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="comment-input"
            />
            <button type="submit" className="comment-submit">post</button>
          </form>
        </div>
      </article>
    </div>
  )
}