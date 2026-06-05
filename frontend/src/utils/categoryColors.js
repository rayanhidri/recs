const COLORS = {
  music:   { background: '#fef3c7', color: '#92400e' },
  film:    { background: '#ede9fe', color: '#5b21b6' },
  book:    { background: '#d1fae5', color: '#065f46' },
  podcast: { background: '#cffafe', color: '#155e75' },
  video:   { background: '#fee2e2', color: '#991b1b' },
  article: { background: '#e0e7ff', color: '#3730a3' },
  fashion: { background: '#fce7f3', color: '#9d174d' },
}

const DEFAULT = { background: '#f3f4f6', color: '#374151' }

export function getCategoryStyle(category) {
  return COLORS[category?.toLowerCase()] ?? DEFAULT
}
