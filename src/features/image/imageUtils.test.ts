import { describe, expect, it } from 'vitest'
import {
  clampImageScale,
  filenameWithoutExtension,
  getPixelCropRect,
  getScaledSourceSize,
  getSourceIntersection,
  rescaleCropRect,
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

  it('clamps image scale to 25%–800%', () => {
    expect(clampImageScale(0.1)).toBe(0.25)
    expect(clampImageScale(12)).toBe(8)
    expect(clampImageScale(1.22)).toBe(1.2)
    expect(clampImageScale(1.23)).toBe(1.25)
    expect(clampImageScale(1.256)).toBe(1.25)
    expect(clampImageScale(Number.NaN)).toBe(1)
  })

  it('scales source dimensions by the clamped factor', () => {
    expect(getScaledSourceSize(800, 600, 2)).toEqual({ width: 1600, height: 1200 })
    expect(getScaledSourceSize(800, 600, 0.1)).toEqual({ width: 200, height: 150 })
  })

  it('keeps the crop focused on the same source point after scaling', () => {
    const crop = getPixelCropRect(800, 600, 400, 300)
    const next = rescaleCropRect(crop, 1, 2, 800, 600)
    expect(next.width).toBe(400)
    expect(next.height).toBe(300)
    expect(next.x).toBeCloseTo(600)
    expect(next.y).toBeCloseTo(450)
  })
})
