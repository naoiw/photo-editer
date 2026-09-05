import { useEffect, useState } from 'react'
import { revokeObjectUrl } from '../features/image/imageUtils'

export function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setUrl(null)
      return
    }
    const nextUrl = URL.createObjectURL(file)
    setUrl(nextUrl)
    return () => revokeObjectUrl(nextUrl)
  }, [file])

  return url
}
