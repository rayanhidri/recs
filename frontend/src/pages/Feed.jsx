import { useState, useEffect } from 'react'
import { getFeed, likeRec, unlikeRec } from '../api'

function Post({ post, onLike }) {
  return (
    <article className="post">
      <div className="post-header">
        <span className="username">{post.username}</span>
        <span className="media-type">{post.category}</span>
      </div>
      
      {post.image && (
        <div className="post-image-container">
          <img src={post.image} alt={post.title} className="post-image" />
        </div>
      )}
      
      <div className="post-content">
        <h2 className="post-title">{post.title}</h2>
        <p className="post-comment">{post.description}</p>
        {post.link && (
          <a href={post.link} target="_blank" rel="noopener noreferrer" className="post-link">
            open link ↗
          </a>
        )}
      </div>
      
      <div className="post-actions">
        <button 
          className={`like-button ${post.is_liked ? 'liked' : ''}`}
          onClick={() => onLike(post.id, post.is_liked)}
        >
          {post.is_liked ? '♥' : '♡'} {post.likes_count}
        </button>
      </div>
    </article>
  )
}

export default function Feed() {
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
        <Post key={post.id} post={post} onLike={handleLike} />
      ))}
    </main>
  )
}