import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRec } from '../api'

const defaultCategories = ['music', 'film', 'article', 'podcast', 'video', 'book', 'fashion']

export default function Create() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState(defaultCategories)
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

const handleRecImageUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  setUploadingImage(true)
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
    setForm({ ...form, image: data.secure_url })
  } catch (err) {
    console.error('Upload failed:', err)
    alert('upload failed')
  } finally {
    setUploadingImage(false)
  }
}
  const [fetchingPreview, setFetchingPreview] = useState(false)
  const [form, setForm] = useState({
    category: 'music',
    title: '',
    description: '',
    link: '',
    image: ''
  })

  // Auto-fetch link preview
  const fetchLinkPreview = async (url) => {
    if (!url.startsWith('http')) return
    setFetchingPreview(true)
    try {
      const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`)
      const data = await res.json()
      if (data.status === 'success') {
        const { title, image } = data.data
        setForm(prev => ({
          ...prev,
          title: prev.title || title || '',
          image: prev.image || image?.url || ''
        }))
      }
    } catch (err) {
      console.error('Failed to fetch preview:', err)
    } finally {
      setFetchingPreview(false)
    }
  }

  const handleLinkChange = (e) => {
    const url = e.target.value
    setForm({ ...form, link: url })
  }

  const handleLinkBlur = () => {
    if (form.link && !form.image) {
      fetchLinkPreview(form.link)
    }
  }

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
          <label>link</label>
          <input
            type="url"
            placeholder="https://..."
            value={form.link}
            onChange={handleLinkChange}
            onBlur={handleLinkBlur}
          />
          {fetchingPreview && <span className="fetching-text">fetching preview...</span>}
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
  <label>image {form.image && '✓'}</label>
  <div className="image-upload-options">
    <input
      type="file"
      accept="image/*"
      onChange={handleRecImageUpload}
      className="file-input"
      id="rec-image-upload"
    />
    <label htmlFor="rec-image-upload" className="upload-button">
      {uploadingImage ? 'uploading...' : 'upload image'}
    </label>
    <span className="or-divider">or</span>
    <input
      type="url"
      placeholder="paste image url..."
      value={form.image}
      onChange={(e) => setForm({...form, image: e.target.value})}
      className="url-input"
    />
  </div>
  {form.image && (
    <img src={form.image} alt="preview" className="image-preview" />
  )}
</div>

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'posting...' : 'post rec'}
        </button>
      </form>
    </div>
  )
}