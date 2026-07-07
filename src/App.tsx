import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type SkinSize = 32 | 64 | 128
type Mode = 'simple' | 'detailed'
type Face = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

interface SkinRegion {
  id: string
  label: string
  part: string
  face: Face
  rect: Rect
}

interface CropState {
  x: number
  y: number
  w: number
  h: number
}

interface AdjustmentState {
  brightness: number
  contrast: number
  saturation: number
  blur: number
  sharpen: number
}

interface PlacementState {
  scale: number
  offsetX: number
  offsetY: number
  rotate: number
  flipX: boolean
}

interface RegionEdit {
  crop: CropState
  placement: PlacementState
}

const DEFAULT_CROP: CropState = { x: 0, y: 0, w: 100, h: 100 }
const DEFAULT_ADJUSTMENTS: AdjustmentState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  sharpen: 0,
}
const DEFAULT_PLACEMENT: PlacementState = {
  scale: 100,
  offsetX: 0,
  offsetY: 0,
  rotate: 0,
  flipX: false,
}

const BASE_TEMPLATE: SkinRegion[] = [
  { id: 'head-front', label: 'Head Front', part: 'Head', face: 'front', rect: { x: 8, y: 8, w: 8, h: 8 } },
  { id: 'head-back', label: 'Head Back', part: 'Head', face: 'back', rect: { x: 24, y: 8, w: 8, h: 8 } },
  { id: 'head-left', label: 'Head Left', part: 'Head', face: 'left', rect: { x: 16, y: 8, w: 8, h: 8 } },
  { id: 'head-right', label: 'Head Right', part: 'Head', face: 'right', rect: { x: 0, y: 8, w: 8, h: 8 } },
  { id: 'body-front', label: 'Body Front', part: 'Body', face: 'front', rect: { x: 20, y: 20, w: 8, h: 12 } },
  { id: 'body-back', label: 'Body Back', part: 'Body', face: 'back', rect: { x: 32, y: 20, w: 8, h: 12 } },
  { id: 'body-left', label: 'Body Left', part: 'Body', face: 'left', rect: { x: 16, y: 20, w: 4, h: 12 } },
  { id: 'body-right', label: 'Body Right', part: 'Body', face: 'right', rect: { x: 28, y: 20, w: 4, h: 12 } },
  { id: 'r-arm-front', label: 'Right Arm Front', part: 'Arms', face: 'front', rect: { x: 44, y: 20, w: 4, h: 12 } },
  { id: 'r-arm-back', label: 'Right Arm Back', part: 'Arms', face: 'back', rect: { x: 52, y: 20, w: 4, h: 12 } },
  { id: 'r-arm-left', label: 'Right Arm Side L', part: 'Arms', face: 'left', rect: { x: 40, y: 20, w: 4, h: 12 } },
  { id: 'r-arm-right', label: 'Right Arm Side R', part: 'Arms', face: 'right', rect: { x: 48, y: 20, w: 4, h: 12 } },
  { id: 'l-arm-front', label: 'Left Arm Front', part: 'Arms', face: 'front', rect: { x: 36, y: 52, w: 4, h: 12 } },
  { id: 'l-arm-back', label: 'Left Arm Back', part: 'Arms', face: 'back', rect: { x: 44, y: 52, w: 4, h: 12 } },
  { id: 'l-arm-left', label: 'Left Arm Side L', part: 'Arms', face: 'left', rect: { x: 32, y: 52, w: 4, h: 12 } },
  { id: 'l-arm-right', label: 'Left Arm Side R', part: 'Arms', face: 'right', rect: { x: 40, y: 52, w: 4, h: 12 } },
  { id: 'r-leg-front', label: 'Right Leg Front', part: 'Legs', face: 'front', rect: { x: 4, y: 20, w: 4, h: 12 } },
  { id: 'r-leg-back', label: 'Right Leg Back', part: 'Legs', face: 'back', rect: { x: 12, y: 20, w: 4, h: 12 } },
  { id: 'r-leg-left', label: 'Right Leg Side L', part: 'Legs', face: 'left', rect: { x: 0, y: 20, w: 4, h: 12 } },
  { id: 'r-leg-right', label: 'Right Leg Side R', part: 'Legs', face: 'right', rect: { x: 8, y: 20, w: 4, h: 12 } },
  { id: 'l-leg-front', label: 'Left Leg Front', part: 'Legs', face: 'front', rect: { x: 20, y: 52, w: 4, h: 12 } },
  { id: 'l-leg-back', label: 'Left Leg Back', part: 'Legs', face: 'back', rect: { x: 28, y: 52, w: 4, h: 12 } },
  { id: 'l-leg-left', label: 'Left Leg Side L', part: 'Legs', face: 'left', rect: { x: 16, y: 52, w: 4, h: 12 } },
  { id: 'l-leg-right', label: 'Left Leg Side R', part: 'Legs', face: 'right', rect: { x: 24, y: 52, w: 4, h: 12 } },
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeCrop(crop: CropState): CropState {
  const w = clamp(crop.w, 5, 100)
  const h = clamp(crop.h, 5, 100)
  const x = clamp(crop.x, 0, 100 - w)
  const y = clamp(crop.y, 0, 100 - h)
  return { x, y, w, h }
}

function scaleTemplate(size: SkinSize): SkinRegion[] {
  const factor = size / 64
  return BASE_TEMPLATE.map((item) => ({
    ...item,
    rect: {
      x: Math.round(item.rect.x * factor),
      y: Math.round(item.rect.y * factor),
      w: Math.max(1, Math.round(item.rect.w * factor)),
      h: Math.max(1, Math.round(item.rect.h * factor)),
    },
  }))
}

function faceSlice(face: Face, width: number, height: number): Rect {
  switch (face) {
    case 'front':
      return { x: width * 0.2, y: height * 0.08, w: width * 0.6, h: height * 0.84 }
    case 'back':
      return { x: width * 0.05, y: height * 0.08, w: width * 0.6, h: height * 0.84 }
    case 'left':
      return { x: 0, y: height * 0.08, w: width * 0.45, h: height * 0.84 }
    case 'right':
      return { x: width * 0.55, y: height * 0.08, w: width * 0.45, h: height * 0.84 }
    case 'top':
      return { x: width * 0.2, y: 0, w: width * 0.6, h: height * 0.4 }
    case 'bottom':
      return { x: width * 0.2, y: height * 0.6, w: width * 0.6, h: height * 0.4 }
    default:
      return { x: 0, y: 0, w: width, h: height }
  }
}

function sharpenImage(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number,
): Uint8ClampedArray {
  if (strength <= 0) {
    return data
  }
  const out = new Uint8ClampedArray(data.length)
  const amount = clamp(strength / 100, 0, 1)
  const sample = (x: number, y: number, channel: number): number => {
    const sx = clamp(x, 0, width - 1)
    const sy = clamp(y, 0, height - 1)
    const index = (sy * width + sx) * 4 + channel
    return data[index]
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let c = 0; c < 3; c += 1) {
        const original = sample(x, y, c)
        const sharpened =
          sample(x, y, c) * 5 -
          sample(x - 1, y, c) -
          sample(x + 1, y, c) -
          sample(x, y - 1, c) -
          sample(x, y + 1, c)
        const blended = original * (1 - amount) + sharpened * amount
        const i = (y * width + x) * 4 + c
        out[i] = clamp(Math.round(blended), 0, 255)
      }
      const alphaIndex = (y * width + x) * 4 + 3
      out[alphaIndex] = data[alphaIndex]
    }
  }
  return out
}

function buildProcessedCanvas(
  image: HTMLImageElement,
  crop: CropState,
  adjustments: AdjustmentState,
): HTMLCanvasElement {
  const normalized = normalizeCrop(crop)
  const sourceX = (normalized.x / 100) * image.naturalWidth
  const sourceY = (normalized.y / 100) * image.naturalHeight
  const sourceW = (normalized.w / 100) * image.naturalWidth
  const sourceH = (normalized.h / 100) * image.naturalHeight

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return canvas
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) blur(${adjustments.blur}px)`
  ctx.drawImage(image, sourceX, sourceY, sourceW, sourceH, 0, 0, canvas.width, canvas.height)
  ctx.filter = 'none'

  if (adjustments.sharpen > 0) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const sharpened = sharpenImage(
      imageData.data,
      canvas.width,
      canvas.height,
      adjustments.sharpen,
    )
    imageData.data.set(sharpened)
    ctx.putImageData(imageData, 0, 0)
  }

  return canvas
}

function App() {
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string>('')
  const [mode, setMode] = useState<Mode>('simple')
  const [skinSize, setSkinSize] = useState<SkinSize>(64)
  const [crop, setCrop] = useState<CropState>(DEFAULT_CROP)
  const [adjustments, setAdjustments] = useState<AdjustmentState>(DEFAULT_ADJUSTMENTS)
  const [placement, setPlacement] = useState<PlacementState>(DEFAULT_PLACEMENT)
  const [regionEdits, setRegionEdits] = useState<Record<string, RegionEdit>>({})
  const [selectedRegionId, setSelectedRegionId] = useState<string>(BASE_TEMPLATE[0].id)
  const [status, setStatus] = useState<string>('Upload a source image to start converting.')
  const skinCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const regions = useMemo(() => scaleTemplate(skinSize), [skinSize])
  const selectedRegion = useMemo(
    () => regions.find((region) => region.id === selectedRegionId),
    [regions, selectedRegionId],
  )

  useEffect(() => {
    return () => {
      if (sourceUrl) {
        URL.revokeObjectURL(sourceUrl)
      }
    }
  }, [sourceUrl])

  useEffect(() => {
    if (!sourceImage || !skinCanvasRef.current) {
      return
    }

    const processed = buildProcessedCanvas(sourceImage, crop, adjustments)
    const canvas = skinCanvasRef.current
    canvas.width = skinSize
    canvas.height = skinSize
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    ctx.clearRect(0, 0, skinSize, skinSize)
    ctx.imageSmoothingEnabled = false

    for (const region of regions) {
      const src = faceSlice(region.face, processed.width, processed.height)
      ctx.drawImage(
        processed,
        src.x,
        src.y,
        src.w,
        src.h,
        region.rect.x,
        region.rect.y,
        region.rect.w,
        region.rect.h,
      )
    }

    if (mode === 'detailed') {
      for (const [regionId, edit] of Object.entries(regionEdits)) {
        const region = regions.find((item) => item.id === regionId)
        if (!region) {
          continue
        }

        const sourceRect = normalizeCrop(edit.crop)
        const sx = (sourceRect.x / 100) * processed.width
        const sy = (sourceRect.y / 100) * processed.height
        const sw = (sourceRect.w / 100) * processed.width
        const sh = (sourceRect.h / 100) * processed.height

        const offsetX = (edit.placement.offsetX / 100) * region.rect.w
        const offsetY = (edit.placement.offsetY / 100) * region.rect.h
        const drawW = region.rect.w * (edit.placement.scale / 100)
        const drawH = region.rect.h * (edit.placement.scale / 100)

        ctx.save()
        ctx.beginPath()
        ctx.rect(region.rect.x, region.rect.y, region.rect.w, region.rect.h)
        ctx.clip()
        ctx.translate(region.rect.x + region.rect.w / 2 + offsetX, region.rect.y + region.rect.h / 2 + offsetY)
        ctx.rotate((edit.placement.rotate * Math.PI) / 180)
        ctx.scale(edit.placement.flipX ? -1 : 1, 1)
        ctx.drawImage(processed, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH)
        ctx.restore()
      }
    }

    if (selectedRegion) {
      ctx.save()
      ctx.strokeStyle = '#50fa7b'
      ctx.lineWidth = Math.max(1, Math.round(skinSize / 64))
      ctx.strokeRect(
        selectedRegion.rect.x + 0.5,
        selectedRegion.rect.y + 0.5,
        selectedRegion.rect.w - 1,
        selectedRegion.rect.h - 1,
      )
      ctx.restore()
    }
  }, [sourceImage, crop, adjustments, skinSize, mode, regions, regionEdits, selectedRegion])

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    const lowerName = file.name.toLowerCase()
    const valid = ['.png', '.jpg', '.jpeg', '.webp'].some((ext) => lowerName.endsWith(ext))
    if (!valid) {
      setStatus('Unsupported format. Please upload webp, png, jpeg, or jpg.')
      return
    }

    const nextUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      if (sourceUrl) {
        URL.revokeObjectURL(sourceUrl)
      }
      setSourceUrl(nextUrl)
      setSourceImage(image)
      setStatus(`Loaded ${file.name}. Ready to export ${skinSize}x${skinSize} skin.`)
    }
    image.onerror = () => {
      URL.revokeObjectURL(nextUrl)
      setStatus('Image could not be decoded. Try another file.')
    }
    image.src = nextUrl
  }

  const updateCrop = (key: keyof CropState, value: number): void => {
    setCrop((current) => normalizeCrop({ ...current, [key]: value }))
  }

  const updateAdjustments = (key: keyof AdjustmentState, value: number): void => {
    setAdjustments((current) => ({ ...current, [key]: value }))
  }

  const updatePlacement = (key: keyof PlacementState, value: number | boolean): void => {
    setPlacement((current) => ({ ...current, [key]: value }))
  }

  const applyDetailToRegion = (): void => {
    if (!selectedRegion) {
      return
    }
    setRegionEdits((current) => ({
      ...current,
      [selectedRegion.id]: { crop, placement },
    }))
    setStatus(`Applied detailed mapping to ${selectedRegion.label}.`)
  }

  const clearSelectedDetail = (): void => {
    if (!selectedRegion) {
      return
    }
    setRegionEdits((current) => {
      const clone = { ...current }
      delete clone[selectedRegion.id]
      return clone
    })
    setStatus(`Cleared detailed mapping on ${selectedRegion.label}.`)
  }

  const resetAll = (): void => {
    setCrop(DEFAULT_CROP)
    setAdjustments(DEFAULT_ADJUSTMENTS)
    setPlacement(DEFAULT_PLACEMENT)
    setRegionEdits({})
    setStatus('Reset crop, filters, and detailed edits.')
  }

  const downloadSkin = (): void => {
    const canvas = skinCanvasRef.current
    if (!canvas) {
      return
    }
    const link = document.createElement('a')
    link.download = `minecraft-skin-${skinSize}x${skinSize}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const groupedRegions = useMemo(() => {
    const groups = new Map<string, SkinRegion[]>()
    for (const region of regions) {
      if (!groups.has(region.part)) {
        groups.set(region.part, [])
      }
      groups.get(region.part)?.push(region)
    }
    return Array.from(groups.entries())
  }, [regions])

  return (
    <main className="app">
      <header className="app-header">
        <h1>Minecraft Image to Skin Converter</h1>
        <p>Fast converter for 32 / 64 / 128 skins with simple mode + detailed part editing.</p>
      </header>

      <section className="panel">
        <label className="upload">
          <span>Source Image (webp/png/jpeg/jpg)</span>
          <input type="file" accept=".webp,.png,.jpg,.jpeg,image/webp,image/png,image/jpeg" onChange={handleUpload} />
        </label>
        <div className="row">
          <label>
            Mode
            <select value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
              <option value="simple">Simple (1-click)</option>
              <option value="detailed">Detailed (region based)</option>
            </select>
          </label>
          <label>
            Skin Size
            <select
              value={skinSize}
              onChange={(event) => setSkinSize(Number(event.target.value) as SkinSize)}
            >
              <option value={32}>32 x 32</option>
              <option value={64}>64 x 64</option>
              <option value={128}>128 x 128</option>
            </select>
          </label>
          <button type="button" onClick={downloadSkin} disabled={!sourceImage}>
            Download PNG
          </button>
          <button type="button" onClick={resetAll}>
            Reset
          </button>
        </div>
        <p className="status">{status}</p>
      </section>

      <section className="workspace">
        <article className="panel">
          <h2>Source + Crop</h2>
          <div className="source-preview">
            {sourceUrl ? <img src={sourceUrl} alt="Source preview" /> : <p>Upload an image to preview and crop.</p>}
            {sourceUrl ? (
              <span
                className="crop-box"
                style={{
                  left: `${crop.x}%`,
                  top: `${crop.y}%`,
                  width: `${crop.w}%`,
                  height: `${crop.h}%`,
                }}
              />
            ) : null}
          </div>
          <div className="control-grid">
            <label>
              Crop X ({Math.round(crop.x)}%)
              <input type="range" min={0} max={95} value={crop.x} onChange={(event) => updateCrop('x', Number(event.target.value))} />
            </label>
            <label>
              Crop Y ({Math.round(crop.y)}%)
              <input type="range" min={0} max={95} value={crop.y} onChange={(event) => updateCrop('y', Number(event.target.value))} />
            </label>
            <label>
              Crop Width ({Math.round(crop.w)}%)
              <input type="range" min={5} max={100} value={crop.w} onChange={(event) => updateCrop('w', Number(event.target.value))} />
            </label>
            <label>
              Crop Height ({Math.round(crop.h)}%)
              <input type="range" min={5} max={100} value={crop.h} onChange={(event) => updateCrop('h', Number(event.target.value))} />
            </label>
          </div>
        </article>

        <article className="panel">
          <h2>Image Adjustments</h2>
          <div className="control-grid">
            <label>
              Brightness ({adjustments.brightness}%)
              <input type="range" min={40} max={180} value={adjustments.brightness} onChange={(event) => updateAdjustments('brightness', Number(event.target.value))} />
            </label>
            <label>
              Contrast ({adjustments.contrast}%)
              <input type="range" min={40} max={180} value={adjustments.contrast} onChange={(event) => updateAdjustments('contrast', Number(event.target.value))} />
            </label>
            <label>
              Saturation ({adjustments.saturation}%)
              <input type="range" min={0} max={220} value={adjustments.saturation} onChange={(event) => updateAdjustments('saturation', Number(event.target.value))} />
            </label>
            <label>
              Smoothing / Blur ({adjustments.blur.toFixed(1)}px)
              <input type="range" min={0} max={6} step={0.1} value={adjustments.blur} onChange={(event) => updateAdjustments('blur', Number(event.target.value))} />
            </label>
            <label>
              Sharpen ({Math.round(adjustments.sharpen)}%)
              <input type="range" min={0} max={100} value={adjustments.sharpen} onChange={(event) => updateAdjustments('sharpen', Number(event.target.value))} />
            </label>
          </div>
        </article>

        <article className="panel skin-result">
          <h2>Skin Output</h2>
          <canvas ref={skinCanvasRef} width={skinSize} height={skinSize} />
          <p>Active output format: {skinSize}x{skinSize}</p>
        </article>
      </section>

      {mode === 'detailed' ? (
        <section className="panel detailed">
          <h2>Detailed Region Mapper</h2>
          <p>Select head/body/arms/legs front-back-side region and apply custom crop placement.</p>
          <div className="region-groups">
            {groupedRegions.map(([group, groupRegions]) => (
              <div key={group} className="region-group">
                <h3>{group}</h3>
                <div className="region-buttons">
                  {groupRegions.map((region) => (
                    <button
                      key={region.id}
                      type="button"
                      className={region.id === selectedRegionId ? 'active' : ''}
                      onClick={() => setSelectedRegionId(region.id)}
                    >
                      {region.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="control-grid">
            <label>
              Scale ({placement.scale}%)
              <input type="range" min={25} max={250} value={placement.scale} onChange={(event) => updatePlacement('scale', Number(event.target.value))} />
            </label>
            <label>
              Offset X ({placement.offsetX}%)
              <input type="range" min={-100} max={100} value={placement.offsetX} onChange={(event) => updatePlacement('offsetX', Number(event.target.value))} />
            </label>
            <label>
              Offset Y ({placement.offsetY}%)
              <input type="range" min={-100} max={100} value={placement.offsetY} onChange={(event) => updatePlacement('offsetY', Number(event.target.value))} />
            </label>
            <label>
              Rotation ({placement.rotate}deg)
              <input type="range" min={-180} max={180} value={placement.rotate} onChange={(event) => updatePlacement('rotate', Number(event.target.value))} />
            </label>
            <label className="check">
              <input type="checkbox" checked={placement.flipX} onChange={(event) => updatePlacement('flipX', event.target.checked)} />
              Flip Horizontal
            </label>
          </div>
          <div className="row">
            <button type="button" onClick={applyDetailToRegion} disabled={!sourceImage}>
              Apply to Selected Region
            </button>
            <button type="button" onClick={clearSelectedDetail}>
              Clear Selected Region
            </button>
          </div>
        </section>
      ) : null}
    </main>
  )
}

export default App
