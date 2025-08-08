import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDecoration } from '../contexts/DecorationContext'
import type { DecorationInventoryItem, DecorationItemType, RoomDecorItem } from '../types'
import './MobileRoomDesigner.css'

const ZONES = { FLOOR: { startY: 70, endY: 100 }, WALL: { startY: 15, endY: 70 }, CEILING: { startY: 0, endY: 15 } } as const

type EditMode = 'move' | 'rotate' | 'resize'

export default function MobileRoomDesigner({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { roomLayers, getFilteredDecorations, addDecorItem, updateDecorItem, removeDecorItem, setRoomLayer } = useDecoration()

  const overlayRef = useRef<HTMLDivElement>(null)
  const [sheetPct, setSheetPct] = useState<number>(65) // bottom sheet height (% of viewport)
  const [category, setCategory] = useState<DecorationItemType>('furniture')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<DecorationInventoryItem[]>([])
  const [snap, setSnap] = useState(true)

  // Placement selection (design units; rendered scaled)
  const [sel, setSel] = useState<{
    src: string; x: number; y: number; width: number; height: number; rotation: number; layer: 'front' | 'back';
    originalIndex?: number; originalLayer?: 'front' | 'back'
  } | null>(null)
  const [mode, setMode] = useState<EditMode>('move')
  const [drag, setDrag] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const initial = useRef({ x: 0, y: 0, rot: 0, w: 0, h: 0 })

  // Align overlay with pet room
  const [bounds, setBounds] = useState<{ top: number; left: number; width: number; height: number }>({ top: 0, left: 0, width: 0, height: 0 })
  useEffect(() => {
    if (!isOpen) return
    const update = () => {
      const el = document.querySelector('.pet-room-container') as HTMLElement | null
      if (!el) return
      const r = el.getBoundingClientRect(); const b = document.body.getBoundingClientRect()
      setBounds({ top: r.top - b.top, left: r.left - b.left, width: r.width, height: r.height })
    }
    update(); window.addEventListener('resize', update); return () => window.removeEventListener('resize', update)
  }, [isOpen])

  // Load items
  useEffect(() => { if (isOpen) setItems(getFilteredDecorations(category)) }, [isOpen, category, getFilteredDecorations])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? items.filter(i => i.name.toLowerCase().includes(q)) : items
  }, [items, query])

  const canvasScale = useCallback(() => {
    const refW = 1080, refH = 1920
    const wr = bounds.width / refW, hr = bounds.height / refH
    return Math.min(wr || 1, hr || 1)
  }, [bounds])

  const toPct = useCallback((clientX: number, clientY: number) => {
    const r = overlayRef.current?.getBoundingClientRect(); if (!r) return { x: 50, y: 50 }
    return { x: ((clientX - r.left) / r.width) * 100, y: ((clientY - r.top) / r.height) * 100 }
  }, [])

  const startEdit = (e: React.PointerEvent, m: EditMode) => {
    if (!sel) return
    setMode(m); setDrag(true)
    dragStart.current = { x: e.clientX, y: e.clientY }
    initial.current = { x: sel.x, y: sel.y, rot: sel.rotation, w: sel.width, h: sel.height }
  }

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!drag || !sel) return
      if (mode === 'move') {
        let { x, y } = toPct(e.clientX, e.clientY)
        const over = 12; x = Math.max(-over, Math.min(100 + over, x)); y = Math.max(-over, Math.min(100 + over, y))
        if (snap) { x = Math.round(x / 5) * 5; y = Math.round(y / 5) * 5 }
        setSel(prev => prev ? { ...prev, x, y } : prev)
      } else if (mode === 'rotate') {
        const r = overlayRef.current!.getBoundingClientRect(); const cx0 = r.left + (r.width * initial.current.x) / 100; const cy0 = r.top + (r.height * initial.current.y) / 100
        const ang = Math.atan2(e.clientY - cy0, e.clientX - cx0) * (180 / Math.PI)
        const ang0 = Math.atan2(dragStart.current.y - cy0, dragStart.current.x - cx0) * (180 / Math.PI)
        const delta = ang - ang0
        setSel(prev => prev ? { ...prev, rotation: (initial.current.rot + delta + 360) % 360 } : prev)
      } else {
        const dx = e.clientX - dragStart.current.x; const dy = e.clientY - dragStart.current.y
        const dist = Math.sqrt(dx * dx + dy * dy); const dir = dx + dy > 0 ? 1 : -1
        const scale = Math.max(0.3, Math.min(3, 1 + (dir * dist) / 160))
        const sc = canvasScale(); const r = overlayRef.current!.getBoundingClientRect()
        const dispW = Math.min(Math.max(24, initial.current.w * sc * scale), r.width); const dispH = Math.min(Math.max(24, initial.current.h * sc * scale), r.height)
        const designW = dispW / sc; const designH = dispH / sc
        setSel(prev => prev ? { ...prev, width: designW, height: designH } : prev)
      }
    }
    const up = () => setDrag(false)
    if (drag) {
      document.addEventListener('pointermove', move, { passive: false }); document.addEventListener('pointerup', up)
      return () => { document.removeEventListener('pointermove', move as any); document.removeEventListener('pointerup', up) }
    }
  }, [drag, mode, sel, snap, toPct, canvasScale])

  const place = () => {
    if (!sel) return
    const zone = sel.y >= ZONES.FLOOR.startY ? 'FLOOR' : sel.y <= ZONES.CEILING.endY ? 'CEILING' : 'WALL'
    const item: RoomDecorItem = { src: sel.src, x: sel.x, y: sel.y, width: sel.width, height: sel.height, rotation: sel.rotation, zone }
    if (sel.originalIndex !== undefined && sel.originalLayer) updateDecorItem(sel.originalLayer, sel.originalIndex, item, sel.layer)
    else addDecorItem(item, sel.layer)
    setSel(null); setSheetPct(65)
  }

  const remove = () => {
    if (!sel || sel.originalIndex === undefined || !sel.originalLayer) return
    removeDecorItem(sel.originalLayer, sel.originalIndex); setSel(null)
  }

  const pickExisting = (layer: 'front' | 'back', index: number) => {
    const arr = layer === 'front' ? roomLayers.frontDecor : roomLayers.backDecor
    const it = arr[index]
    setSel({ src: it.src, x: it.x, y: it.y, width: Math.max(24, it.width || 240), height: Math.max(24, it.height || 240), rotation: it.rotation || 0, layer, originalIndex: index, originalLayer: layer })
    setSheetPct(30)
  }

  if (!isOpen) return null

  const sc = canvasScale()

  return (
    <div className="mrd-root">
      {/* Top bar */}
      <div className="mrd-top">
        <button className="mrd-btn" onClick={onClose}>Exit</button>
        <div className="mrd-spacer" />
        <label className="mrd-toggle"><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} /> Snap</label>
      </div>

      {/* Overlay aligned to pet room */}
      <div ref={overlayRef} className="mrd-canvas" style={{ top: bounds.top, left: bounds.left, width: bounds.width, height: bounds.height }}>
        {roomLayers.backDecor.map((d, i) => (
          sel && sel.originalLayer === 'back' && sel.originalIndex === i ? null : (
            <img key={`b-${i}`} className="mrd-item" src={d.src} style={{ left: `${d.x}%`, top: `${d.y}%`, width: d.width ? d.width * sc : undefined, height: d.height ? d.height * sc : undefined, transform: `translate(-50%, -50%)${d.rotation ? ` rotate(${d.rotation}deg)` : ''}`, zIndex: 10 }} onClick={(e) => { e.stopPropagation(); pickExisting('back', i) }} alt="" />
          )
        ))}

        {sel && (
          <div className={`mrd-selected ${drag ? 'drag' : ''}`} style={{ left: `${sel.x}%`, top: `${sel.y}%`, width: sel.width * sc, height: sel.height * sc, transform: `translate(-50%, -50%) rotate(${sel.rotation}deg)` }} onPointerDown={(e) => startEdit(e, 'move')}>
            <img src={sel.src} alt="" draggable={false} />
            <button className="mrd-hdl mrd-rot" onPointerDown={(e) => startEdit(e, 'rotate')}>↻</button>
            <button className="mrd-hdl mrd-res" onPointerDown={(e) => startEdit(e, 'resize')}>⤡</button>
          </div>
        )}

        {roomLayers.frontDecor.map((d, i) => (
          sel && sel.originalLayer === 'front' && sel.originalIndex === i ? null : (
            <img key={`f-${i}`} className="mrd-item" src={d.src} style={{ left: `${d.x}%`, top: `${d.y}%`, width: d.width ? d.width * sc : undefined, height: d.height ? d.height * sc : undefined, transform: `translate(-50%, -50%)${d.rotation ? ` rotate(${d.rotation}deg)` : ''}`, zIndex: 40 + i }} onClick={(e) => { e.stopPropagation(); pickExisting('front', i) }} alt="" />
          )
        ))}
      </div>

      {/* Floating action bar for selected item */}
      {sel && (
        <div className="mrd-actionbar">
          <button className="mrd-pill" onClick={() => setSel(p => p ? { ...p, layer: p.layer === 'front' ? 'back' : 'front' } : p)}>{sel.layer === 'front' ? 'Front' : 'Back'}</button>
          <button className="mrd-pill danger" disabled={sel.originalIndex === undefined} onClick={remove}>Delete</button>
          <button className="mrd-pill primary" onClick={place}>{sel.originalIndex !== undefined ? 'Update' : 'Place'}</button>
        </div>
      )}

      {/* Bottom sheet catalog */}
      <div className="mrd-sheet" style={{ height: `${sheetPct}vh` }}>
        <div className="mrd-drag" onPointerDown={(e) => {
          const sy = e.clientY; const sh = sheetPct
          const onMove = (ev: PointerEvent) => {
            const dy = ev.clientY - sy; const next = Math.max(28, Math.min(92, sh - (dy / window.innerHeight) * 100)); setSheetPct(Math.round(next))
          }
          const onUp = () => { window.removeEventListener('pointermove', onMove as any); window.removeEventListener('pointerup', onUp) }
          window.addEventListener('pointermove', onMove as any, { passive: false }); window.addEventListener('pointerup', onUp)
        }} />

        <div className="mrd-tabs">
          {(['furniture', 'wall', 'floor', 'ceiling', 'trim', 'overlay'] as DecorationItemType[]).map(cat => (
            <button key={cat} className={`mrd-tab ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</button>
          ))}
        </div>

        <div className="mrd-search">
          <input placeholder="Search items" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        <div className="mrd-grid">
          {filtered.map(it => (
            <button key={it.id} className="mrd-slot" onClick={() => {
              if (it.type !== 'furniture') { setRoomLayer(it.type, it.src); return }
              setSel({ src: it.src, x: 50, y: 60, width: 240, height: 240, rotation: 0, layer: 'back' }); setSheetPct(30)
            }}>
              <img src={it.src} alt={it.name} />
              <div className="mrd-name">{it.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}


