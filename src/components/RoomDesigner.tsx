import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDecoration } from '../contexts/DecorationContext'
import type { DecorationInventoryItem, DecorationItemType, RoomDecorItem } from '../types'
import './RoomDesigner.css'

const ROOM_ZONES = {
  FLOOR: { startY: 70, endY: 100 },
  WALL: { startY: 15, endY: 70 },
  CEILING: { startY: 0, endY: 15 },
} as const

type EditMode = 'move' | 'rotate' | 'resize'

interface RoomDesignerProps {
  isOpen: boolean
  onClose: () => void
}

interface EditableItem {
  id: string
  src: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  layer: 'front' | 'back'
  originalIndex?: number
  originalLayer?: 'front' | 'back'
}

export default function RoomDesigner({ isOpen, onClose }: RoomDesignerProps) {
  const { roomLayers, getFilteredDecorations, addDecorItem, updateDecorItem, removeDecorItem, setRoomLayer } = useDecoration()

  const overlayRef = useRef<HTMLDivElement>(null)
  const [activeCategory, setActiveCategory] = useState<DecorationItemType>('furniture')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'price'>('name')
  const [items, setItems] = useState<DecorationInventoryItem[]>([])

  const [selected, setSelected] = useState<EditableItem | null>(null)
  const [editMode, setEditMode] = useState<EditMode>('move')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initial, setInitial] = useState({ x: 0, y: 0, rotation: 0, width: 0, height: 0 })

  const [snapGrid, setSnapGrid] = useState(true)
  const [gridPct, setGridPct] = useState(5)
  const [snapZones, setSnapZones] = useState(true)
  const [showInspector, setShowInspector] = useState(() => (typeof window !== 'undefined' ? !window.matchMedia('(max-width: 600px)').matches : true))
  const [showCatalog, setShowCatalog] = useState(true)

  // Align editor canvas precisely over the pet room container
  const [overlayBounds, setOverlayBounds] = useState<{ top: number; left: number; width: number; height: number }>({ top: 0, left: 0, width: 0, height: 0 })

  useEffect(() => {
    if (!isOpen) return
    const updateBounds = () => {
      const container = document.querySelector('.pet-room-container') as HTMLElement | null
      if (!container) return
      const rect = container.getBoundingClientRect()
      const pageRect = document.body.getBoundingClientRect()
      setOverlayBounds({
        top: rect.top - pageRect.top,
        left: rect.left - pageRect.left,
        width: rect.width,
        height: rect.height,
      })
    }
    updateBounds()
    window.addEventListener('resize', updateBounds)
    return () => window.removeEventListener('resize', updateBounds)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const list = getFilteredDecorations(activeCategory)
    setItems(list)
  }, [isOpen, activeCategory, getFilteredDecorations])

  useEffect(() => {
    if (!isOpen) return
    const mq = window.matchMedia('(max-width: 600px)')
    const onChange = () => setShowInspector(!mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [isOpen])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = items
    if (q) list = list.filter(i => i.name.toLowerCase().includes(q))
    list = [...list].sort((a, b) => (sortBy === 'name' ? a.name.localeCompare(b.name) : a.price - b.price))
    return list
  }, [items, query, sortBy])

  const getCanvasScale = useCallback(() => {
    const el = overlayRef.current
    if (!el) return { scale: 1, w: 1, h: 1 }
    const r = el.getBoundingClientRect()
    const refW = 1080
    const refH = 1920
    const widthRatio = r.width / refW
    const heightRatio = r.height / refH
    const scale = Math.min(widthRatio, heightRatio)
    return { scale, w: r.width, h: r.height }
  }, [])

  const toPercent = useCallback((clientX: number, clientY: number) => {
    const el = overlayRef.current
    if (!el) return { x: 50, y: 50 }
    const r = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100)),
    }
  }, [])

  const snap = useCallback((v: number) => {
    if (!snapGrid || gridPct <= 0) return v
    const step = gridPct
    return Math.round(v / step) * step
  }, [snapGrid, gridPct])

  const startEdit = (e: React.TouchEvent | React.MouseEvent, mode: EditMode) => {
    if (!selected) return
    e.preventDefault()
    const cx = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const cy = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    setEditMode(mode)
    setIsDragging(true)
    setDragStart({ x: cx, y: cy })
    // Store initial displayed size in pixels (design size * canvas scale)
    const { scale, w, h } = getCanvasScale()
    // initial holds displayed pixel size for smooth resize, but selected stores design units
    const pxWidth = Math.max(24, Math.min(w, selected.width * scale))
    const pxHeight = Math.max(24, Math.min(h, selected.height * scale))
    setInitial({ x: selected.x, y: selected.y, rotation: selected.rotation, width: pxWidth, height: pxHeight })
  }

  useEffect(() => {
    const move = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !selected || !overlayRef.current) return
      const cx = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
      const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY

      if (editMode === 'move') {
        let { x, y } = toPercent(cx, cy)
        const rect = overlayRef.current.getBoundingClientRect()
        const cw = rect.width || 1
        const ch = rect.height || 1
        const halfWPct = Math.min(50, (selected.width / cw) * 50)
        const halfHPct = Math.min(50, (selected.height / ch) * 50)
        // Allow overshoot so transparent padding can go outside room while visible part aligns to edge
        const overshootPct = 12
        const leftBound = -overshootPct
        const rightBound = 100 + overshootPct
        x = Math.max(leftBound, Math.min(rightBound, x))
        y = Math.max(-overshootPct, Math.min(100 + overshootPct, y))
        if (snapZones) {
          const centers = [
            (ROOM_ZONES.CEILING.startY + ROOM_ZONES.CEILING.endY) / 2,
            (ROOM_ZONES.WALL.startY + ROOM_ZONES.WALL.endY) / 2,
            (ROOM_ZONES.FLOOR.startY + ROOM_ZONES.FLOOR.endY) / 2,
          ]
          const nearest = centers.reduce((p, c) => (Math.abs(c - y) < Math.abs(p - y) ? c : p))
          if (Math.abs(nearest - y) <= 2.5) y = nearest
        }
        setSelected(prev => (prev ? { ...prev, x: snap(x), y: snap(y) } : prev))
      } else if (editMode === 'rotate') {
        const rect = overlayRef.current.getBoundingClientRect()
        const cx0 = rect.left + (rect.width * initial.x) / 100
        const cy0 = rect.top + (rect.height * initial.y) / 100
        const angle = Math.atan2(cy - cy0, cx - cx0) * (180 / Math.PI)
        const angle0 = Math.atan2(dragStart.y - cy0, dragStart.x - cx0) * (180 / Math.PI)
        const delta = angle - angle0
        setSelected(prev => (prev ? { ...prev, rotation: (initial.rotation + delta + 360) % 360 } : prev))
      } else if (editMode === 'resize') {
        const dx = cx - dragStart.x
        const dy = cy - dragStart.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const dir = dx + dy > 0 ? 1 : -1
        const scale = Math.max(0.3, Math.min(3, 1 + (dir * dist) / 160))
        // Compute new displayed pixel size, clamp to canvas, then convert back to design units
        const rect = overlayRef.current!.getBoundingClientRect()
        const displayedW = Math.min(Math.max(24, initial.width * scale), rect.width)
        const displayedH = Math.min(Math.max(24, initial.height * scale), rect.height)
        const { scale: canvasScale } = getCanvasScale()
        const designW = Math.max(8, displayedW / canvasScale)
        const designH = Math.max(8, displayedH / canvasScale)
        setSelected(prev => (prev ? { ...prev, width: designW, height: designH } : prev))
      }
    }
    const end = () => setIsDragging(false)
    if (isDragging) {
      document.addEventListener('mousemove', move)
      document.addEventListener('mouseup', end)
      document.addEventListener('touchmove', move, { passive: false })
      document.addEventListener('touchend', end)
      return () => {
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', end)
        document.removeEventListener('touchmove', move as any)
        document.removeEventListener('touchend', end)
      }
    }
  }, [isDragging, selected, editMode, toPercent, dragStart, initial, snap, snapZones])

  // Keyboard shortcuts: Enter to place, Esc to cancel selection
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (!selected) return
      if (e.key === 'Enter') {
        e.preventDefault()
        placeOrUpdate()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setSelected(null)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, selected])

  const placeOrUpdate = () => {
    if (!selected) return
    const zone = selected.y >= ROOM_ZONES.FLOOR.startY ? 'FLOOR' : selected.y <= ROOM_ZONES.CEILING.endY ? 'CEILING' : 'WALL'
    const item: RoomDecorItem = {
      src: selected.src,
      x: selected.x,
      y: selected.y,
      width: selected.width,
      height: selected.height,
      rotation: selected.rotation,
      zone,
    }
    if (selected.originalIndex !== undefined && selected.originalLayer) {
      updateDecorItem(selected.originalLayer, selected.originalIndex, item, selected.layer)
    } else {
      addDecorItem(item, selected.layer)
    }
    setSelected(null)
  }

  const onCatalogClick = (it: DecorationInventoryItem) => {
    if (it.type !== 'furniture') {
      setRoomLayer(it.type, it.src)
      return
    }
    setSelected({
      id: `new-${Date.now()}`,
      src: it.src,
      x: 50,
      y: 55,
      width: 240,
      height: 240,
      rotation: 0,
      layer: 'back',
    })
    setShowCatalog(false)
  }

  const duplicate = () => {
    if (!selected) return
    setSelected({ ...selected, id: `dup-${Date.now()}`, originalIndex: undefined, originalLayer: selected.layer, x: Math.min(100, selected.x + 4), y: Math.min(100, selected.y + 4) })
  }

  const del = () => {
    if (!selected || selected.originalIndex === undefined || !selected.originalLayer) return
    removeDecorItem(selected.originalLayer, selected.originalIndex)
    setSelected(null)
  }

  const onPickExisting = (layer: 'front' | 'back', index: number) => {
    const arr = layer === 'front' ? roomLayers.frontDecor : roomLayers.backDecor
    const it = arr[index]
    const w = Math.max(24, it.width || 240)
    const h = Math.max(24, it.height || 240)
    setSelected({ id: `existing-${layer}-${index}`, src: it.src, x: it.x, y: it.y, width: w, height: h, rotation: it.rotation || 0, layer, originalIndex: index, originalLayer: layer })
  }

  if (!isOpen) return null

  return (
    <div className="room-designer">
      <div className="rd-toolbar">
        <button className="rd-btn" onClick={onClose}>Exit</button>
        <div className="rd-spacer" />
        <label className="rd-toggle"><input type="checkbox" checked={snapGrid} onChange={(e) => setSnapGrid(e.target.checked)} /> Snap</label>
        <input className="rd-number" type="number" min={1} max={25} value={gridPct} onChange={(e) => setGridPct(Math.max(1, Math.min(25, Number(e.target.value) || 5)))} />
        <label className="rd-toggle"><input type="checkbox" checked={snapZones} onChange={(e) => setSnapZones(e.target.checked)} /> Zones</label>
        <button className="rd-btn" onClick={() => setShowInspector((s) => !s)} title="Toggle properties">Props</button>
        <button className="rd-btn" onClick={() => setShowCatalog((c) => !c)} title="Toggle catalog">Items</button>
      </div>

      <div
        className="rd-canvas"
        ref={overlayRef}
        style={{
          top: overlayBounds.top,
          left: overlayBounds.left,
          width: overlayBounds.width,
          height: overlayBounds.height,
          right: 'auto',
          bottom: 'auto',
          position: 'absolute',
        }}
        onMouseDown={(e) => {
          // clicking the background deselects current item
          if (e.target === e.currentTarget) setSelected(null)
        }}
      >
        <div className="rd-zones">
          <div className="rd-zone rd-ceiling" />
          <div className="rd-zone rd-wall" />
          <div className="rd-zone rd-floor" />
        </div>

        {roomLayers.backDecor.map((d, i) => (
          selected && selected.originalLayer === 'back' && selected.originalIndex === i ? null : (
            <img key={`b-${i}`} className="rd-item rd-back" src={d.src} style={{ left: `${d.x}%`, top: `${d.y}%`, width: d.width ? `${d.width * getCanvasScale().scale}px` : 'auto', height: d.height ? `${d.height * getCanvasScale().scale}px` : 'auto', transform: `translate(-50%, -50%)${d.rotation ? ` rotate(${d.rotation}deg)` : ''}` }} onClick={(e) => { e.stopPropagation(); onPickExisting('back', i) }} alt="" />
          )
        ))}

        {selected && (
          <div className={`rd-selected ${isDragging ? 'drag' : ''}`} style={{ left: `${selected.x}%`, top: `${selected.y}%`, width: `${selected.width * getCanvasScale().scale}px`, height: `${selected.height * getCanvasScale().scale}px`, transform: `translate(-50%, -50%) rotate(${selected.rotation}deg)` }} onPointerDown={(e) => startEdit(e as any, 'move')}>
            <img src={selected.src} alt="" draggable={false} />
            <button className="rd-handle rd-rotate" onPointerDown={(e) => startEdit(e as any, 'rotate')}>↻</button>
            <button className="rd-handle rd-resize" onPointerDown={(e) => startEdit(e as any, 'resize')}>⤡</button>
            <button className="rd-handle rd-place" onClick={(e) => { e.stopPropagation(); placeOrUpdate() }}>✓</button>
          </div>
        )}

        {roomLayers.frontDecor.map((d, i) => (
          selected && selected.originalLayer === 'front' && selected.originalIndex === i ? null : (
            <img key={`f-${i}`} className="rd-item rd-front" src={d.src} style={{ left: `${d.x}%`, top: `${d.y}%`, width: d.width ? `${d.width * getCanvasScale().scale}px` : 'auto', height: d.height ? `${d.height * getCanvasScale().scale}px` : 'auto', transform: `translate(-50%, -50%)${d.rotation ? ` rotate(${d.rotation}deg)` : ''}` }} onClick={(e) => { e.stopPropagation(); onPickExisting('front', i) }} alt="" />
          )
        ))}
      </div>

      <div className={`rd-inspector ${showInspector ? 'open' : 'closed'}`}>
        <div className="rd-section">
          <div className="rd-row">
            <label>X%</label>
            <input className="rd-number" type="number" value={selected?.x ?? ''} onChange={(e) => setSelected(p => (p ? { ...p, x: snap(Math.max(0, Math.min(100, Number(e.target.value) || 0))) } : p))} />
          </div>
          <div className="rd-row">
            <label>Y%</label>
            <input className="rd-number" type="number" value={selected?.y ?? ''} onChange={(e) => setSelected(p => (p ? { ...p, y: snap(Math.max(0, Math.min(100, Number(e.target.value) || 0))) } : p))} />
          </div>
          <div className="rd-row">
            <label>W</label>
            <input className="rd-number" type="number" value={selected?.width ?? ''} onChange={(e) => setSelected(p => (p ? { ...p, width: Math.max(24, Number(e.target.value) || 0) } : p))} />
          </div>
          <div className="rd-row">
            <label>H</label>
            <input className="rd-number" type="number" value={selected?.height ?? ''} onChange={(e) => setSelected(p => (p ? { ...p, height: Math.max(24, Number(e.target.value) || 0) } : p))} />
          </div>
          <div className="rd-row">
            <label>Rot</label>
            <input className="rd-number" type="number" value={selected?.rotation ?? ''} onChange={(e) => setSelected(p => (p ? { ...p, rotation: ((Number(e.target.value) || 0) % 360 + 360) % 360 } : p))} />
          </div>
          <div className="rd-row">
            <label>Layer</label>
            <select className="rd-select" value={selected?.layer ?? 'front'} onChange={(e) => setSelected(p => (p ? { ...p, layer: e.target.value as 'front' | 'back' } : p))}>
              <option value="front">Front</option>
              <option value="back">Back</option>
            </select>
          </div>
        </div>
        <div className="rd-actions">
          <button className="rd-btn" onClick={duplicate} disabled={!selected}>Duplicate</button>
          <button className="rd-btn danger" onClick={del} disabled={!selected || selected.originalIndex === undefined}>Delete</button>
          <button className="rd-btn primary" onClick={placeOrUpdate} disabled={!selected}>{selected?.originalIndex !== undefined ? 'Update' : 'Place'}</button>
        </div>
      </div>

      {showCatalog && (
      <div className="rd-catalog">
        <div className="rd-cat-header">
          <div className="rd-tabs">
            {(['furniture', 'wall', 'floor', 'ceiling', 'trim', 'overlay'] as DecorationItemType[]).map(cat => (
              <button key={cat} className={`rd-tab ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</button>
            ))}
          </div>
          <div className="rd-find">
            <input className="rd-search" placeholder="Search items" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select className="rd-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'name' | 'price')}>
              <option value="name">Name</option>
              <option value="price">Price</option>
            </select>
          </div>
        </div>
        <div className="rd-grid">
          {filtered.map((it) => (
            <button key={it.id} className="rd-slot" onClick={() => onCatalogClick(it)} title={it.name}>
              <img src={it.src} alt={it.name} />
              <div className="rd-label">{it.name}</div>
            </button>
          ))}
        </div>
      </div>
      )}
      {!showCatalog && (
        <button className="rd-fab" onClick={() => setShowCatalog(true)} title="Open items">📦</button>
      )}
    </div>
  )
}


