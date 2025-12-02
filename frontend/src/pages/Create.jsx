import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRec } from '../api'

const defaultCategories = ['music', 'film', 'article', 'podcast', 'video', 'book', 'fashion']

export default function Create() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState(defaultCategories)
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    category: 'music',
    title: '',
    description: '',
    link: '',
    image: ''
  })

  const handleAddCategory = () => {
    if (customCategory.trim() && !categories.includes(customCategory.toLowerCase())) {
      const newCat = customCategory.toLowerCase()
      setCategories([...categories, newCat])
      setForm({...form, category: newCat})
      setCustomCategory('')
      setShowCustomInput(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createRec(form)
      navigate('/')
    } catch (err) {
      console.error(err)
      alert('failed to create rec')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create">
      <h2 className="create-title">new rec</h2>
      
      <form onSubmit={handleSubmit} className="create-form">
        <div className="form-group">
          <label>category</label>
          <div className="category-pills">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                className={`category-pill ${form.category === cat ? 'active' : ''}`}
                onClick={() => setForm({...form, category: cat})}
              >
                {cat}
              </button>
            ))}
            <button
              type="button"
              className="category-pill add-pill"
              onClick={() => setShowCustomInput(!showCustomInput)}
            >
              +
            </button>
          </div>
          
          {showCustomInput && (
            <div className="custom-category">
              <input
                type="text"
                placeholder="new category..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
              <button type="button" onClick={handleAddCategory}>add</button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>title</label>
          <input
            type="text"
            placeholder="name of the thing..."
            value={form.title}
            onChange={(e) => setForm({...form, title: e.target.value})}
            required
          />
        </div>

        <div className="form-group">
          <label>description</label>
          <textarea
            placeholder="your take..."
            value={form.description}
            onChange={(e) => setForm({...form, description: e.target.value})}
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>link</label>
          <input
            type="url"
            placeholder="https://..."
            value={form.link}
            onChange={(e) => setForm({...form, link: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label>image url</label>
          <input
            type="url"
            placeholder="https://image-url..."
            value={form.image}
            onChange={(e) => setForm({...form, image: e.target.value})}
          />
        </div>

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'posting...' : 'post rec'}
        </button>
      </form>
    </div>
  )
}