import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FunctionAnimation,
  SkinViewer,
  SwimAnimation,
  WalkingAnimation,
  type PlayerAnimation,
} from 'skinview3d'
import './App.css'

type SkinSize = 32 | 64 | 128 | 256 | 512 | 1024 | 2048
type Mode = 'simple' | 'detailed'
type Face = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'
type AnimationMode = 'walk' | 'swim' | 'sleep'
type ModelType = 'default' | 'slim'

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

const OUTPUT_SIZES: SkinSize[] = [32, 64, 128, 256, 512, 1024, 2048]
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
  targetResolution: number,
): HTMLCanvasElement {
  const normalized = normalizeCrop(crop)
  const sourceX = (normalized.x / 100) * image.naturalWidth
  const sourceY = (normalized.y / 100) * image.naturalHeight
  const sourceW = (normalized.w / 100) * image.naturalWidth
  const sourceH = (normalized.h / 100) * image.naturalHeight

  const canvas = document.createElement('canvas')
  canvas.width = targetResolution
  canvas.height = targetResolution
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return canvas
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
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

function createAnimation(mode: AnimationMode): PlayerAnimation {
  if (mode === 'walk') {
    const animation = new WalkingAnimation()
    animation.speed = 1.6
    return animation
  }
  if (mode === 'swim') {
    const animation = new SwimAnimation()
    animation.speed = 1.3
    return animation
  }
  const animation = new FunctionAnimation((player, progress) => {
    player.rotation.z = -Math.PI / 2
    player.position.y = -2
    const breathing = Math.sin(progress * 2) * 0.05
    player.skin.head.rotation.x = 0.16 + breathing
    player.skin.leftArm.rotation.x = -1.4 + breathing
    player.skin.rightArm.rotation.x = -1.4 - breathing
    player.skin.leftLeg.rotation.x = 0.08
    player.skin.rightLeg.rotation.x = -0.08
  })
  animation.speed = 0.7
  return animation
}

function App() {
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string>('')
  const [sourceMeta, setSourceMeta] = useState<string>('')
  const [mode, setMode] = useState<Mode>('simple')
  const [skinSize, setSkinSize] = useState<SkinSize>(256)
  const [crop, setCrop] = useState<CropState>(DEFAULT_CROP)
  const [adjustments, setAdjustments] = useState<AdjustmentState>(DEFAULT_ADJUSTMENTS)
  const [placement, setPlacement] = useState<PlacementState>(DEFAULT_PLACEMENT)
  const [regionEdits, setRegionEdits] = useState<Record<string, RegionEdit>>({})
  const [selectedRegionId, setSelectedRegionId] = useState<string>(BASE_TEMPLATE[0].id)
  const [viewerModel, setViewerModel] = useState<ModelType>('default')
  const [viewerAnimationMode, setViewerAnimationMode] = useState<AnimationMode>('walk')
  const [autoRotate, setAutoRotate] = useState<boolean>(true)
  const [status, setStatus] = useState<string>('Upload a source image to start converting.')

  const skinCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const viewerHostRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<SkinViewer | null>(null)
  const previewSkinRef = useRef<HTMLCanvasElement | null>(null)

  const processResolution = useMemo(() => {
    return Math.min(Math.max(skinSize, 1024), 2048)
  }, [skinSize])

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
    const host = viewerHostRef.current
    if (!host) {
      return
    }
    const canvas = document.createElement('canvas')
    host.replaceChildren(canvas)

    const viewer = new SkinViewer({
      canvas,
      width: host.clientWidth || 380,
      height: Math.max(320, Math.round((host.clientWidth || 380) * 1.04)),
      model: 'default',
    })
    viewer.controls.enablePan = false
    viewer.controls.enableDamping = true
    viewer.controls.minDistance = 18
    viewer.controls.maxDistance = 85
    viewer.controls.rotateSpeed = 0.85
    viewer.autoRotate = true
    viewer.autoRotateSpeed = 0.8
    viewer.animation = createAnimation('walk')
    viewerRef.current = viewer

    const onResize = () => {
      const width = host.clientWidth || 380
      viewer.setSize(width, Math.max(320, Math.round(width * 1.04)))
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      viewer.dispose()
      viewerRef.current = null
    }
  }, [])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) {
      return
    }
    viewer.autoRotate = autoRotate
    viewer.animation = createAnimation(viewerAnimationMode)
  }, [viewerAnimationMode, autoRotate])

  useEffect(() => {
    if (!sourceImage || !skinCanvasRef.current) {
      const viewer = viewerRef.current
      if (viewer) {
        viewer.loadSkin(null)
      }
      return
    }

    const processed = buildProcessedCanvas(sourceImage, crop, adjustments, processResolution)
    const outputCanvas = skinCanvasRef.current
    outputCanvas.width = skinSize
    outputCanvas.height = skinSize
    const ctx = outputCanvas.getContext('2d')
    if (!ctx) {
      return
    }

    ctx.clearRect(0, 0, skinSize, skinSize)
    ctx.imageSmoothingEnabled = skinSize >= 256
    ctx.imageSmoothingQuality = 'high'

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
        ctx.translate(
          region.rect.x + region.rect.w / 2 + offsetX,
          region.rect.y + region.rect.h / 2 + offsetY,
        )
        ctx.rotate((edit.placement.rotate * Math.PI) / 180)
        ctx.scale(edit.placement.flipX ? -1 : 1, 1)
        ctx.drawImage(processed, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH)
        ctx.restore()
      }
    }

    if (selectedRegion) {
      ctx.save()
      ctx.strokeStyle = '#4ade80'
      ctx.lineWidth = Math.max(1, Math.round(skinSize / 256))
      ctx.strokeRect(
        selectedRegion.rect.x + 0.5,
        selectedRegion.rect.y + 0.5,
        selectedRegion.rect.w - 1,
        selectedRegion.rect.h - 1,
      )
      ctx.restore()
    }

    const previewCanvas = document.createElement('canvas')
    previewCanvas.width = 64
    previewCanvas.height = 64
    const previewCtx = previewCanvas.getContext('2d')
    if (previewCtx) {
      previewCtx.imageSmoothingEnabled = false
      previewCtx.drawImage(outputCanvas, 0, 0, 64, 64)
      previewSkinRef.current = previewCanvas
      const viewer = viewerRef.current
      if (viewer) {
        viewer.loadSkin(previewCanvas, { model: viewerModel })
      }
    }
  }, [
    sourceImage,
    crop,
    adjustments,
    processResolution,
    skinSize,
    mode,
    regions,
    regionEdits,
    selectedRegion,
    viewerModel,
  ])

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
      setSourceMeta(`${image.naturalWidth}x${image.naturalHeight}`)
      setStatus(`Loaded ${file.name}. Ready for HD export and 3D preview.`)
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
    setStatus(`Applied detail edit to ${selectedRegion.label}.`)
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
    setStatus(`Cleared detail edit on ${selectedRegion.label}.`)
  }

  const resetAll = (): void => {
    setCrop(DEFAULT_CROP)
    setAdjustments(DEFAULT_ADJUSTMENTS)
    setPlacement(DEFAULT_PLACEMENT)
    setRegionEdits({})
    setMode('simple')
    setViewerAnimationMode('walk')
    setStatus('Reset completed. Back to simple mode.')
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

  return (
    <main className="app">
      <header className="panel hero">
        <div>
          <h1>Minecraft Image to Skin</h1>
          <p>Simple by default. Advanced tools, high resolutions, and 3D animation preview ready.</p>
        </div>
      </header>

      <section className="panel compact">
        <label className="upload">
          <span>Source image (webp/png/jpeg/jpg)</span>
          <input
            type="file"
            accept=".webp,.png,.jpg,.jpeg,image/webp,image/png,image/jpeg"
            onChange={handleUpload}
          />
        </label>

        <div className="controls-row">
          <label>
            Mode
            <select value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
              <option value="simple">Simple</option>
              <option value="detailed">Detailed</option>
            </select>
          </label>
          <label>
            Export size
            <select
              value={skinSize}
              onChange={(event) => setSkinSize(Number(event.target.value) as SkinSize)}
            >
              {OUTPUT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} x {size}
                </option>
              ))}
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
        <p className="muted">
          Source: {sourceMeta || '-'} | Processing pipeline: {processResolution}x{processResolution} (HD)
        </p>
      </section>

      <section className="preview-grid">
        <article className="panel">
          <h2>Skin Output</h2>
          <canvas ref={skinCanvasRef} width={skinSize} height={skinSize} className="skin-canvas" />
          <p className="muted">Export target: {skinSize}x{skinSize}</p>
        </article>

        <article className="panel">
          <h2>3D Preview (360)</h2>
          <div className="viewer-host" ref={viewerHostRef} />
          <div className="controls-row">
            <label>
              Model
              <select
                value={viewerModel}
                onChange={(event) => setViewerModel(event.target.value as ModelType)}
              >
                <option value="default">Steve (Wide)</option>
                <option value="slim">Alex (Slim)</option>
              </select>
            </label>
            <label>
              Animation
              <select
                value={viewerAnimationMode}
                onChange={(event) => setViewerAnimationMode(event.target.value as AnimationMode)}
              >
                <option value="walk">Walk</option>
                <option value="swim">Swim</option>
                <option value="sleep">Sleep</option>
              </select>
            </label>
            <label className="inline-check">
              <input
                type="checkbox"
                checked={autoRotate}
                onChange={(event) => setAutoRotate(event.target.checked)}
              />
              Auto rotate
            </label>
          </div>
          <p className="muted">Drag to rotate. Scroll to zoom.</p>
        </article>
      </section>

      <details className="panel">
        <summary>Advanced image tools (crop + smoothing/sharpen + color)</summary>
        <div className="advanced-wrap">
          <div className="source-preview">
            {sourceUrl ? <img src={sourceUrl} alt="Source preview" /> : <p>Upload an image to preview.</p>}
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
          <div className="slider-grid">
            <label>
              Crop X ({Math.round(crop.x)}%)
              <input
                type="range"
                min={0}
                max={95}
                value={crop.x}
                onChange={(event) => updateCrop('x', Number(event.target.value))}
              />
            </label>
            <label>
              Crop Y ({Math.round(crop.y)}%)
              <input
                type="range"
                min={0}
                max={95}
                value={crop.y}
                onChange={(event) => updateCrop('y', Number(event.target.value))}
              />
            </label>
            <label>
              Crop Width ({Math.round(crop.w)}%)
              <input
                type="range"
                min={5}
                max={100}
                value={crop.w}
                onChange={(event) => updateCrop('w', Number(event.target.value))}
              />
            </label>
            <label>
              Crop Height ({Math.round(crop.h)}%)
              <input
                type="range"
                min={5}
                max={100}
                value={crop.h}
                onChange={(event) => updateCrop('h', Number(event.target.value))}
              />
            </label>
            <label>
              Brightness ({adjustments.brightness}%)
              <input
                type="range"
                min={40}
                max={180}
                value={adjustments.brightness}
                onChange={(event) => updateAdjustments('brightness', Number(event.target.value))}
              />
            </label>
            <label>
              Contrast ({adjustments.contrast}%)
              <input
                type="range"
                min={40}
                max={180}
                value={adjustments.contrast}
                onChange={(event) => updateAdjustments('contrast', Number(event.target.value))}
              />
            </label>
            <label>
              Saturation ({adjustments.saturation}%)
              <input
                type="range"
                min={0}
                max={220}
                value={adjustments.saturation}
                onChange={(event) => updateAdjustments('saturation', Number(event.target.value))}
              />
            </label>
            <label>
              Smoothing / Blur ({adjustments.blur.toFixed(1)}px)
              <input
                type="range"
                min={0}
                max={6}
                step={0.1}
                value={adjustments.blur}
                onChange={(event) => updateAdjustments('blur', Number(event.target.value))}
              />
            </label>
            <label>
              Sharpen ({Math.round(adjustments.sharpen)}%)
              <input
                type="range"
                min={0}
                max={100}
                value={adjustments.sharpen}
                onChange={(event) => updateAdjustments('sharpen', Number(event.target.value))}
              />
            </label>
          </div>
        </div>
      </details>

      {mode === 'detailed' ? (
        <details className="panel" open={false}>
          <summary>Detailed region mapper (front/back/side per body part)</summary>
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

          <div className="slider-grid">
            <label>
              Scale ({placement.scale}%)
              <input
                type="range"
                min={25}
                max={250}
                value={placement.scale}
                onChange={(event) => updatePlacement('scale', Number(event.target.value))}
              />
            </label>
            <label>
              Offset X ({placement.offsetX}%)
              <input
                type="range"
                min={-100}
                max={100}
                value={placement.offsetX}
                onChange={(event) => updatePlacement('offsetX', Number(event.target.value))}
              />
            </label>
            <label>
              Offset Y ({placement.offsetY}%)
              <input
                type="range"
                min={-100}
                max={100}
                value={placement.offsetY}
                onChange={(event) => updatePlacement('offsetY', Number(event.target.value))}
              />
            </label>
            <label>
              Rotation ({placement.rotate}deg)
              <input
                type="range"
                min={-180}
                max={180}
                value={placement.rotate}
                onChange={(event) => updatePlacement('rotate', Number(event.target.value))}
              />
            </label>
            <label className="inline-check">
              <input
                type="checkbox"
                checked={placement.flipX}
                onChange={(event) => updatePlacement('flipX', event.target.checked)}
              />
              Flip Horizontal
            </label>
          </div>

          <div className="controls-row">
            <button type="button" onClick={applyDetailToRegion} disabled={!sourceImage}>
              Apply to Selected Region
            </button>
            <button type="button" onClick={clearSelectedDetail}>
              Clear Selected Region
            </button>
          </div>
        </details>
      ) : null}
    </main>
  )
}

export default App
