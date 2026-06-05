import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFeed, likeRec, unlikeRec, getComments, createComment, createRec, getConversations, shareRecToChat } from '../api'

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
  return `${Math.floor(days / 7)}w`
}

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return '' }
}

function QuotedCard({ rec, onNavigate }) {
  return (
    <div className="quoted-rec" onClick={() => rec.link && window.open(rec.link, '_blank')}>
      <div className="quoted-rec-header">
        <img
          src={rec.user_avatar || 'https://via.placeholder.com/20'}
          alt={rec.username}
          className="quoted-rec-avatar"
          onClick={(e) => { e.stopPropagation(); onNavigate(`/profile/${rec.username}`) }}
        />
        <span className="quoted-rec-username" onClick={(e) => { e.stopPropagation(); onNavigate(`/profile/${rec.username}`) }}>
          {rec.username}
        </span>
        <span className="quoted-rec-category">{rec.category}</span>
      </div>
      <div className="quoted-rec-body">
        {rec.image && <img src={rec.image} alt={rec.title} className="quoted-rec-image" />}
        <div className="quoted-rec-text">
          {rec.title && <p className="quoted-rec-title">{rec.title}</p>}
          {rec.description && <p className="quoted-rec-desc">{rec.description}</p>}
          {rec.link && <span className="quoted-rec-domain">{getDomain(rec.link)}</span>}
        </div>
      </div>
    </div>
  )
}

function Post({ post, onLike, onNavigate, onQuoted }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(true)
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [quoteText, setQuoteText] = useState('')
  const [quotingLoading, setQuotingLoading] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [conversations, setConversations] = useState([])
  const [sendingTo, setSendingTo] = useState(null)
  const [sentTo, setSentTo] = useState(null)

  const hasLinkWithImage = post.link && post.image
  const hasImageOnly = post.image && !post.link
  const isQuoteRec = !!post.quoted_rec

  useEffect(() => {
    getComments(post.id)
      .then(res => setComments(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoadingComments(false))
  }, [post.id])

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    try {
      const res = await createComment(post.id, newComment)
      setComments([...comments, res.data])
      setNewComment('')
    } catch (err) { console.error(err) }
  }

  const handleQuoteSubmit = async () => {
    setQuotingLoading(true)
    try {
      await createRec({
        category: post.category,
        title: '',
        description: quoteText.trim(),
        quote_of_id: post.id
      })
      setShowQuoteModal(false)
      setQuoteText('')
      if (onQuoted) onQuoted()
    } catch (err) {
      console.error(err)
    } finally {
      setQuotingLoading(false)
    }
  }

  const openSendModal = async () => {
    setShowSendModal(true)
    setSentTo(null)
    try {
      const res = await getConversations()
      setConversations(res.data)
    } catch (err) { console.error(err) }
  }

  const handleSendToConversation = async (conv) => {
    setSendingTo(conv.id)
    try {
      await shareRecToChat(conv.id, post.id)
      setSentTo(conv.id)
    } catch (err) {
      console.error(err)
    } finally {
      setSendingTo(null)
    }
  }

  return (
    <article className="post">
      {isQuoteRec && (
        <div className="rerec-label">
          re-rec'd by{' '}
          <span onClick={() => onNavigate(`/profile/${post.username}`)}>{post.username}</span>
        </div>
      )}

      <div className="post-header">
        <div className="post-user" onClick={() => onNavigate(`/profile/${isQuoteRec ? post.quoted_rec.username : post.username}`)}>
          <img
            src={(isQuoteRec ? post.quoted_rec.user_avatar : post.user_avatar) || 'https://via.placeholder.com/40'}
            alt={post.username}
            className="post-avatar"
          />
          <div className="post-user-info">
            <span className="post-username">{isQuoteRec ? post.quoted_rec.username : post.username}</span>
            <div className="post-meta">
              <span className="post-category">{isQuoteRec ? post.quoted_rec.category : post.category}</span>
              <span className="post-time">{timeAgo(post.created_at)}</span>
            </div>
          </div>
        </div>
        {!isQuoteRec && hasLinkWithImage && (
          <img
            src={post.image}
            alt={post.title}
            className="post-thumbnail"
            onClick={() => window.open(post.link, '_blank')}
          />
        )}
        {isQuoteRec && post.quoted_rec.image && post.quoted_rec.link && (
          <img
            src={post.quoted_rec.image}
            alt={post.quoted_rec.title}
            className="post-thumbnail"
            onClick={() => window.open(post.quoted_rec.link, '_blank')}
          />
        )}
      </div>

      {!isQuoteRec && hasImageOnly && (
        <div className="post-image-large"><img src={post.image} alt={post.title} /></div>
      )}

      <div className="post-content">
        {isQuoteRec ? (
          <>
            {post.description && <p className="post-quote-text">{post.description}</p>}
            <h2 className="post-title">{post.quoted_rec.title}</h2>
            {post.quoted_rec.description && <p className="post-description">{post.quoted_rec.description}</p>}
            {post.quoted_rec.link && <span className="post-domain">{getDomain(post.quoted_rec.link)}</span>}
          </>
        ) : (
          <>
            <h2 className="post-title">{post.title}</h2>
            {post.description && <p className="post-description">{post.description}</p>}
            {post.link && <span className="post-domain">{getDomain(post.link)}</span>}
          </>
        )}
      </div>

      <div className="post-footer">
        {(isQuoteRec ? post.quoted_rec.link : post.link) && (
          <a href={isQuoteRec ? post.quoted_rec.link : post.link} target="_blank" rel="noopener noreferrer" className="post-open">
            open link
          </a>
        )}
        <button
          className={`post-like ${post.is_liked ? 'liked' : ''}`}
          onClick={() => onLike(post.id, post.is_liked)}
        >
          {post.is_liked ? '♥' : '♡'} {post.likes_count > 0 && post.likes_count}
        </button>
        <button className="post-action-btn" onClick={() => setShowQuoteModal(true)} title="re-rec">
          ↩
        </button>
        <button className="post-action-btn" onClick={openSendModal} title="send to chat">
          ↗
        </button>
      </div>

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

      {/* Quote modal */}
      {showQuoteModal && (
        <div className="modal-overlay" onClick={() => setShowQuoteModal(false)}>
          <div className="modal quote-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>re-rec</h3>
              <button className="modal-close" onClick={() => setShowQuoteModal(false)}>×</button>
            </div>
            <textarea
              className="quote-text-input"
              placeholder="add your take... (optional)"
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              rows={3}
              autoFocus
            />
            <QuotedCard rec={isQuoteRec ? post.quoted_rec : post} onNavigate={onNavigate} />
            <button
              className="quote-submit-btn"
              onClick={handleQuoteSubmit}
              disabled={quotingLoading}
            >
              {quotingLoading ? 're-rec\'ing...' : 're-rec'}
            </button>
          </div>
        </div>
      )}

      {/* Send to chat modal */}
      {showSendModal && (
        <div className="modal-overlay" onClick={() => setShowSendModal(false)}>
          <div className="modal send-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>send to...</h3>
              <button className="modal-close" onClick={() => setShowSendModal(false)}>×</button>
            </div>
            <div className="modal-content">
              {conversations.length === 0 ? (
                <p className="empty-modal">no conversations yet</p>
              ) : (
                conversations.map(conv => (
                  <div key={conv.id} className="modal-user send-conv-item" onClick={() => handleSendToConversation(conv)}>
                    <img src={conv.other_avatar || 'https://via.placeholder.com/40'} alt="" className="modal-avatar" />
                    <span className="modal-username">{conv.other_username}</span>
                    {sendingTo === conv.id && <span className="send-status">sending...</span>}
                    {sentTo === conv.id && <span className="send-status sent">sent ✓</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

export default function Feed() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFeed = () => {
    getFeed()
      .then(res => setPosts(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchFeed() }, [])

  const handleLike = async (postId, isLiked) => {
    try {
      if (isLiked) { await unlikeRec(postId) } else { await likeRec(postId) }
      setPosts(posts.map(post =>
        post.id === postId
          ? { ...post, is_liked: !isLiked, likes_count: isLiked ? post.likes_count - 1 : post.likes_count + 1 }
          : post
      ))
    } catch (err) { console.error(err) }
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
        <Post key={post.id} post={post} onLike={handleLike} onNavigate={navigate} onQuoted={fetchFeed} />
      ))}
    </main>
  )
}
