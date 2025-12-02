import { useState } from 'react'

const mockPosts = [
  {
    id: 1,
    username: 'marie',
    type: 'music',
    title: 'noir désir - tostaky',
    comment: "l'album qui m'a fait aimer le rock français. chaque track est une claque.",
    image: 'https://upload.wikimedia.org/wikipedia/en/2/2e/Tostaky_album.jpg',
    likes: 24,
    liked: false,
  },
  {
    id: 2,
    username: 'thomas',
    type: 'film',
    title: 'aftersun',
    comment: 'je suis resté assis 10 min après le générique. devastating.',
    image: 'https://upload.wikimedia.org/wikipedia/en/c/c2/Aftersun_%282022_film%29.jpg',
    likes: 41,
    liked: true,
  },
  {
    id: 3,
    username: 'léa',
    type: 'article',
    title: 'the age of average',
    comment: "pourquoi tout se ressemble maintenant. airports, cafés, logos. mind blowing read.",
    image: 'https://images.unsplash.com/photo-1432821596592-e2c18b78144f?w=800',
    likes: 67,
    liked: false,
  },
]

function Post({ post, onLike }) {
  return (
    <article className="post">
      <div className="post-header">
        <span className="username">{post.username}</span>
        <span className="media-type">{post.type}</span>
      </div>
      
      <div className="post-image-container">
        <img src={post.image} alt={post.title} className="post-image" />
      </div>
      
      <div className="post-content">
        <h2 className="post-title">{post.title}</h2>
        <p className="post-comment">{post.comment}</p>
      </div>
      
      <div className="post-actions">
        <button 
          className={`like-button ${post.liked ? 'liked' : ''}`}
          onClick={() => onLike(post.id)}
        >
          {post.liked ? '♥' : '♡'} {post.likes}
        </button>
      </div>
    </article>
  )
}

export default function Feed() {
  const [posts, setPosts] = useState(mockPosts)

  const handleLike = (postId) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          liked: !post.liked,
          likes: post.liked ? post.likes - 1 : post.likes + 1
        }
      }
      return post
    }))
  }

  return (
    <main className="feed">
      {posts.map(post => (
        <Post key={post.id} post={post} onLike={handleLike} />
      ))}
    </main>
  )
}