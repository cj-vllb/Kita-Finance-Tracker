import { isValidIconId } from './icons.js'
import { presetByKey } from '../data/presetCategories.js'
// One category-name rule for every place a category can be created or renamed (Categories page and the inline dialogs).
// Returns an error message, or null when the name is fine.
export const validateCategoryName = (raw, categories, ignoreId) => {
  const name = raw.trim()
  if (!name) return 'Enter a category name.'
  if (name.length > 30) return 'Use 30 characters or fewer.'
  if (categories.some((c) => c.id !== ignoreId && c.name.toLowerCase() === name.toLowerCase())) return 'A category with this name already exists.'
  return null
}

// The icon id to draw for a category: its own icon when valid, else its built-in preset's icon, else null (the generic tag icon).
// Shared by the Categories page and the transaction category picker so both always show the same icon.
export const categoryIconId = (c) => (isValidIconId(c?.icon) ? c.icon : presetByKey(c?.presetKey)?.icon || null)
