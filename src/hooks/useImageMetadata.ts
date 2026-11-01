import { useEffect, useState } from 'react'
import type { Size } from '../features/image/imageUtils'

type LoadedMetadata = { file: File; size: Size }

/** Read image dimensions once per file, ignoring stale async results. */
export function useImageMetadata(file: File | null) {
  const [loaded, setLoaded] = useState<LoadedMetadata | null>(null)
  const [failedFile, setFailedFile] = useState<File | null>(null)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    void createImageBitmap(file).then((bitmap) => {
      const size = { width: bitmap.width, height: bitmap.height }
      bitmap.close()
      if (!cancelled) setLoaded({ file, size })
    }).catch(() => {
      if (!cancelled) setFailedFile(file)
    })
    return () => { cancelled = true }
  }, [file])

  return { meta: loaded?.file === file ? loaded.size : null, loadFailed: failedFile === file }
}
