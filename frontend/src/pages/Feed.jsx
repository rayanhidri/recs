import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFeed, likeRec, unlikeRec, getComments, createComment } from '../api'

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

function Post({ post, onLike, onNavigate }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(true)

  const hasLinkWithImage = post.link && post.image
  const hasImageOnly = post.image && !post.link

  // Fetch comments automatically on mount
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await getComments(post.id)
        setComments(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingComments(false)
      }
    }
    fetchComments()
  }, [post.id])

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    
    try {
      const res = await createComment(post.id, newComment)
      setComments([...comments, res.data])
      setNewComment('')
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <article className="post">
      <div className="post-header">
        <div className="post-user" onClick={() => onNavigate(`/profile/${post.username}`)}>
          <img 
            src={post.user_avatar || 'https://via.placeholder.com/40'} 
            alt={post.username} 
            className="post-avatar"
          />
          <div className="post-user-info">
            <span className="post-username">{post.username}</span>
            <div className="post-meta">
              <span className="post-category">{post.category}</span>
              <span className="post-time">{timeAgo(post.created_at)}</span>
            </div>
          </div>
        </div>
        {hasLinkWithImage && (
          <img 
            src={post.image} 
            alt={post.title} 
            className="post-thumbnail"
            onClick={() => window.open(post.link, '_blank')}
          />
        )}
      </div>

      {hasImageOnly && (
        <div className="post-image-large">
          <img src={post.image} alt={post.title} />
        </div>
      )}
      
      <div className="post-content">
        <h2 className="post-title">{post.title}</h2>
        {post.description && <p className="post-description">{post.description}</p>}
        {post.link && <span className="post-domain">{getDomain(post.link)}</span>}
      </div>
      
      <div className="post-footer">
        {post.link && (
          <a href={post.link} target="_blank" rel="noopener noreferrer" className="post-open">
            open link
          </a>
        )}
        <button 
          className={`post-like ${post.is_liked ? 'liked' : ''}`}
          onClick={() => onLike(post.id, post.is_liked)}
        >
          {post.is_liked ? '♥' : '♡'} {post.likes_count > 0 && post.likes_count}
        </button>
      </div>

      {/* Comments section - always visible */}
      <div className="comments-section">
        {loadingComments ? (
          <p className="comments-loading">loading comments...</p>
        ) : (
          <>
            {comments.length > 0 && (
              <div className="comments-list">
                {comments.map(comment => (
                  <div key={comment.id} className="comment">
                    <img 
                      src={comment.user_avatar || 'https://via.placeholder.com/28'} 
                      alt={comment.username}
                      className="comment-avatar"
                      onClick={() => onNavigate(`/profile/${comment.username}`)}
                    />
                    <div className="comment-body">
                      <span className="comment-username" onClick={() => onNavigate(`/profile/${comment.username}`)}>
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
          </>
        )}
      </div>
    </article>
  )
}

export default function Feed() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFeed()
      .then(res => setPosts(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const handleLike = async (postId, isLiked) => {
    try {
      if (isLiked) {
        await unlikeRec(postId)
      } else {
        await likeRec(postId)
      }
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            is_liked: !isLiked,
            likes_count: isLiked ? post.likes_count - 1 : post.likes_count + 1
          }
        }
        return post
      }))
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div className="loading">loading...</div>

  if (posts.length === 0) {
    return (
      <div className="empty-feed">
        <p>no recs yet</p>
        <p>follow people to see their recs here</p>
      </div>
    )
  }

  return (
    <main className="feed">
      {posts.map(post => (
        <Post key={post.id} post={post} onLike={handleLike} onNavigate={navigate} />
      ))}
    </main>
  )
}