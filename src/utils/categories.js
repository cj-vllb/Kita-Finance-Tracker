// One category-name rule for every place a category can be created or renamed (Categories page and the inline dialogs).
// Returns an error message, or null when the name is fine.
export const validateCategoryName = (raw, categories, ignoreId) => {
  const name = raw.trim()
  if (!name) return 'Enter a category name.'
  if (name.length > 30) return 'Use 30 characters or fewer.'
  if (categories.some((c) => c.id !== ignoreId && c.name.toLowerCase() === name.toLowerCase())) return 'A category with this name already exists.'
  return null
}
