import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getRec, updateRec } from '../api'

const defaultCategories = ['music', 'film', 'article', 'podcast', 'video', 'book', 'fashion']

export default function EditRec() {
  const { recId } = useParams()
  const navigate = useNavigate()

  const [categories, setCategories] = useState(defaultCategories)
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [fetchingPreview, setFetchingPreview] = useState(false)
  const [form, setForm] = useState({
    category: 'music',
    title: '',
    description: '',
    link: '',
    image: ''
  })

  useEffect(() => {
    getRec(recId)
      .then(res => {
        const rec = res.data
        setForm({
          category: rec.category,
          title: rec.title,
          description: rec.description,
          link: rec.link,
          image: rec.image
        })
        if (!defaultCategories.includes(rec.category)) {
          setCategories([...defaultCategories, rec.category])
        }
      })
      .catch(() => navigate('/'))
      .finally(() => setFetching(false))
  }, [recId, navigate])

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
      setForm(prev => ({ ...prev, image: data.secure_url }))
    } catch (err) {
      alert('upload failed')
    } finally {
      setUploadingImage(false)
    }
  }

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
    } catch {}
    finally { setFetchingPreview(false) }
  }

  const handleLinkBlur = () => {
    if (form.link && !form.image) fetchLinkPreview(form.link)
  }

  const handleAddCategory = () => {
    const newCat = customCategory.trim().toLowerCase()
    if (newCat && !categories.includes(newCat)) {
      setCategories([...categories, newCat])
      setForm({ ...form, category: newCat })
      setCustomCategory('')
      setShowCustomInput(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateRec(recId, form)
      navigate(-1)
    } catch (err) {
      alert('failed to save')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <div className="loading">loading...</div>

  return (
    <div className="create">
      <h2 className="create-title">edit rec</h2>

      <form onSubmit={handleSubmit} className="create-form">
        <div className="form-group">
          <label>category</label>
          <div className="category-pills">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                className={`category-pill ${form.category === cat ? 'active' : ''}`}
                onClick={() => setForm({ ...form, category: cat })}
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
            onChange={(e) => setForm({ ...form, link: e.target.value })}
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
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>description</label>
          <textarea
            placeholder="your take..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
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
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              className="url-input"
            />
          </div>
          {form.image && <img src={form.image} alt="preview" className="image-preview" />}
        </div>

        <div className="edit-rec-actions">
          <button type="button" className="edit-cancel-btn" onClick={() => navigate(-1)}>
            cancel
          </button>
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'saving...' : 'save'}
          </button>
        </div>
      </form>
    </div>
  )
}
