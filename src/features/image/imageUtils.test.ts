import { describe, expect, it } from 'vitest'
import {
  filenameWithoutExtension,
  getPixelCropRect,
  getSourceIntersection,
  softClampCropRect,
} from './imageUtils'

describe('image utilities', () => {
  it('places a pixel-sized crop rect at the center of the source', () => {
    expect(getPixelCropRect(1600, 900, 400, 300)).toEqual({
      x: 600,
      y: 300,
      width: 400,
      height: 300,
    })
  })

  it('centers a crop larger than the source with negative offsets', () => {
    expect(getPixelCropRect(800, 600, 1000, 800)).toEqual({
      x: -100,
      y: -100,
      width: 1000,
      height: 800,
    })
  })

  it('allows limited overhang while clamping further movement', () => {
    const clamped = softClampCropRect({ x: -500, y: -500, width: 400, height: 300 }, 800, 600, 0.25)
    expect(clamped.x).toBeCloseTo(-100)
    expect(clamped.y).toBeCloseTo(-75)
    expect(clamped.width).toBe(400)
    expect(clamped.height).toBe(300)
  })

  it('maps the visible source intersection into crop-local coordinates', () => {
    expect(getSourceIntersection({ x: -50, y: -20, width: 200, height: 100 }, 800, 600)).toEqual({
      sx: 0,
      sy: 0,
      sw: 150,
      sh: 80,
      dx: 50,
      dy: 20,
    })
  })

  it('returns null when the crop does not intersect the source', () => {
    expect(getSourceIntersection({ x: 900, y: 0, width: 100, height: 100 }, 800, 600)).toBeNull()
  })

  it('removes the final extension from a filename', () => {
    expect(filenameWithoutExtension('photo.final.png')).toBe('photo.final')
  })
})
