// Category colors. `key` is what the database stores. Old keys stay valid and are shown as their nearest simple color.
export const CATEGORY_COLORS = [
  ['red', 'Red', '#D64545'], ['orange', 'Orange', '#E8833A'], ['yellow', 'Yellow', '#D9A400'], ['green', 'Green', '#2E9E5B'],
  ['teal', 'Teal', '#1F8A8A'], ['cyan', 'Cyan', '#1AA6C4'], ['blue', 'Blue', '#3B82C4'], ['violet', 'Violet', '#5B4FD1'],
  ['purple', 'Purple', '#9B4DCA'], ['pink', 'Pink', '#E0589B'], ['brown', 'Brown', '#8B5E3C'], ['grey', 'Gray', '#7A807C'], // stored as 'grey' (the original key) so existing rows stay valid
]
// Values stored before 1.1.1 -> the simple color they are shown as. Nothing in the database is rewritten.
const LEGACY = { brick: 'red', amber: 'orange', slate: 'blue', gray: 'grey' }
export const DEFAULT_COLOR = 'grey'
export const normalizeColor = (key) => { const k = LEGACY[key] || key; return CATEGORY_COLORS.some(([x]) => x === k) ? k : DEFAULT_COLOR }
export const colorHex = (key) => CATEGORY_COLORS.find(([k]) => k === normalizeColor(key))[2]
export const colorName = (key) => CATEGORY_COLORS.find(([k]) => k === normalizeColor(key))[1]
