/** Uploads are stored as "<12 hex>_<original name>"; people should only see their own file name. */
export const displayFileName = (stored?: string | null) => (stored || "").replace(/^[0-9a-f]{12}_/i, "")
