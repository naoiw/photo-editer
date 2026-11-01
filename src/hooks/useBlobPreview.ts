import { useCallback, useEffect, useState } from 'react'
import { revokeObjectUrl } from '../features/image/imageUtils'

/** Free old preview object URLs whenever the image changes or the page unmounts. */
export function useBlobPreview() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  useEffect(() => () => revokeObjectUrl(previewUrl), [previewUrl])

  const clearPreview = useCallback(() => setPreviewUrl(null), [])
  const showPreview = useCallback((blob: Blob) => setPreviewUrl(URL.createObjectURL(blob)), [])

  return { previewUrl, clearPreview, showPreview }
}
