import { afterEach, describe, expect, it, vi } from 'vitest'
import { createImageCanvas, drawImageAtCrop } from './canvas'

afterEach(() => vi.unstubAllGlobals())

describe('canvas drawing helpers', () => {
  function setupCanvas(contextAvailable = true) {
    const context = {
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'low',
    }
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(contextAvailable ? context : null),
    }
    vi.stubGlobal('document', { createElement: vi.fn().mockReturnValue(canvas) })
    return { canvas, context }
  }

  it('initializes opaque colors behind a crop', () => {
    const { canvas, context } = setupCanvas()
    expect(createImageCanvas(400, 300, 'red').canvas).toBe(canvas)
    expect(canvas.width).toBe(400)
    expect(canvas.height).toBe(300)
    expect(context.fillStyle).toBe('#e03131')
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 400, 300)
  })

  it('preserves transparency without painting a background', () => {
    const { context } = setupCanvas()
    createImageCanvas(120, 80, 'transparent')
    expect(context.fillRect).not.toHaveBeenCalled()
  })

  it('rejects an unavailable 2D context', () => {
    setupCanvas(false)
    expect(() => createImageCanvas(80, 60, 'black')).toThrow('画像処理を開始できませんでした。')
  })

  it('draws scaled image data at the negative crop offset', () => {
    const { context } = setupCanvas()
    const image = { width: 800, height: 600 } as ImageBitmap
    const { context: output } = createImageCanvas(200, 100, 'transparent')
    drawImageAtCrop(output, image, { x: 100, y: 75, width: 200, height: 100 }, 2)
    expect(context.imageSmoothingEnabled).toBe(true)
    expect(context.imageSmoothingQuality).toBe('high')
    expect(context.drawImage).toHaveBeenCalledWith(image, 0, 0, 800, 600, -100, -75, 1600, 1200)
  })

  it('disables image smoothing at a 1:1 scale', () => {
    const { context } = setupCanvas()
    const image = { width: 40, height: 30 } as ImageBitmap
    const { context: output } = createImageCanvas(40, 30, 'transparent')
    drawImageAtCrop(output, image, { x: 0, y: 0, width: 40, height: 30 }, 1)
    expect(context.imageSmoothingEnabled).toBe(false)
  })
})
