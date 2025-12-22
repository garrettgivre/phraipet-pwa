import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDecoration } from '../contexts/DecorationContext'
import type { DecorationInventoryItem, DecorationItemType, RoomDecorItem } from '../types'
import { getItemVariants, getVariantSrc, type ColorVariant } from '../data/itemVariants'
import './DecorStudio.css'

type EditMode = 'move' | 'rotate' | 'resize'
const ZONES = { FLOOR: { startY: 70, endY: 100 }, WALL: { startY: 15, endY: 70 }, CEILING: { startY: 0, endY: 15 } } as const

interface DecorStudioProps { isOpen: boolean; onClose: () => void; mode?: 'build' | 'decorate' }

interface EditableItem {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipped?: boolean;
  flippedV?: boolean;
  layer: 'front' | 'back';
  originalIndex?: number | undefined;
  originalLayer?: 'front' | 'back' | undefined;
}

const FURNITURE_CATEGORIES = ['Comfort', 'Surface', 'Plants', 'Sculptures', 'Shelf', 'Lamps', 'Clutter', 'Art', 'Other'];

const getFurnitureCategory = (item: DecorationInventoryItem): string => {
  const name = item.name.toLowerCase();
  
  if (name.includes('lamp') || name.includes('light')) return 'Lamps';
  if (name.includes('armchair') || name.includes('chair') || name.includes('bed') || name.includes('sofa')) return 'Comfort';
  if (name.includes('dining table') || name.includes('end table') || name.includes('desk') || name.includes('table')) return 'Surface';
  if (name.includes('plant') || name.includes('flower') || name.includes('fern')) return 'Plants';
  if (name.includes('sculpture') || name.includes('statue')) return 'Sculptures';
  if (name.includes('shelf') || name.includes('shelving')) return 'Shelf';
  if (name.includes('clutter') || name.includes('gadget') || name.includes('gizmo')) return 'Clutter';
  if (name.includes('art') || name.includes('painting') || name.includes('poster') || name.includes('hanging')) return 'Art';
  
  return 'Other';
}

export default function DecorStudio({ isOpen, onClose, mode = 'build' }: DecorStudioProps) {
  const { roomLayers, getFilteredDecorations, addDecorItem, updateDecorItem, removeDecorItem, reorderDecorItem, setRoomLayer } = useDecoration()

  const canvasRef = useRef<HTMLDivElement>(null)
  const [bounds, setBounds] = useState({ top: 0, left: 0, width: 0, height: 0 })
  const [dsMode, setDsMode] = useState<EditMode>('move')
  const [category, setCategory] = useState<DecorationItemType>(mode === 'decorate' ? 'furniture' : 'wall')
  const [furnitureSubCategory, setFurnitureSubCategory] = useState<string>('Comfort')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<DecorationInventoryItem[]>([])
  const gridRef = useRef<HTMLDivElement | null>(null)
  const [snapGrid] = useState(true)
  const [gridPct] = useState(5)
  const [dragging, setDragging] = useState(false)
  const [sel, setSel] = useState<EditableItem | null>(null)
  const start = useRef({ x: 0, y: 0 })
  const initial = useRef({ x: 0, y: 0, rot: 0, w: 0, h: 0 })
  const [snapZones] = useState(true)
  const [colorSelection, setColorSelection] = useState<{ item: DecorationInventoryItem, variants: ColorVariant[] } | null>(null)

  // Bottom sheet height
  const [sheetPct, setSheetPct] = useState(38)
  const selNodeRef = useRef<HTMLDivElement | null>(null)
  const liveRef = useRef({ x: 50, y: 50, width: 240, height: 240, rotation: 0 })
  const canvasRectRef = useRef<DOMRect | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const edgeDockPrevRef = useRef({ left: false, right: false, top: false, bottom: false })
  const [edgeDock, setEdgeDock] = useState({ left: false, right: false, top: false, bottom: false })
  const prevSheetPctRef = useRef<number | null>(null)
  const [userAdjustedSheet, setUserAdjustedSheet] = useState(false)
  const [draggingSheet, setDraggingSheet] = useState(false)
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const exitRef = useRef<HTMLButtonElement | null>(null)
  const liveSheetPctRef = useRef<number>(0)

  const updateEdgeDock = useCallback(() => {
    if (!selNodeRef.current || !canvasRectRef.current) return
    const margin = 36
    const sr = selNodeRef.current.getBoundingClientRect()
    const cr = canvasRectRef.current
    const next = {
      left: sr.left - cr.left < margin,
      right: cr.right - sr.right < margin,
      top: sr.top - cr.top < margin,
      bottom: cr.bottom - sr.bottom < margin,
    }
    const prev = edgeDockPrevRef.current
    if (prev.left !== next.left || prev.right !== next.right || prev.top !== next.top || prev.bottom !== next.bottom) {
      edgeDockPrevRef.current = next
      setEdgeDock(next)
    }
  }, [])

  // Auto-minimize catalog while an item is selected/being placed; restore afterwards
  useEffect(() => {
    if (sel) {
      if (prevSheetPctRef.current === null) prevSheetPctRef.current = sheetPct
      // Minimize but keep accessible unless user is actively adjusting
      if (!userAdjustedSheet && !draggingSheet && sheetPct > 12) setSheetPct(12)
    } else if (prevSheetPctRef.current !== null) {
      setSheetPct(prevSheetPctRef.current)
      prevSheetPctRef.current = null
      setUserAdjustedSheet(false)
    }
  }, [sel, sheetPct, userAdjustedSheet])

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

  useEffect(() => { 
    if (!isOpen) return
    let baseItems = getFilteredDecorations(category)
    
    if (mode === 'decorate' && category === 'furniture') {
      baseItems = baseItems.filter(item => getFurnitureCategory(item) === furnitureSubCategory)
    }
    
    setItems(baseItems)
  }, [isOpen, category, getFilteredDecorations, mode, furnitureSubCategory])

  // Reset category when mode changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'decorate') {
        setCategory('furniture')
      } else {
        setCategory('wall')
      }
    }
  }, [mode, isOpen])

  // Ensure grid scrolls to top when switching categories
  useEffect(() => { gridRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior }) }, [category])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const inCategory = items.filter(i => i.type === category);
    const base = q ? inCategory.filter(i => i.name.toLowerCase().includes(q)) : inCategory;
    return base;
  }, [items, query, category])

  const visibleItems = useMemo(() => {
    if (category !== 'furniture') {
      return filtered.map(it => ({ item: it, remaining: 1 }));
    }
    const placed = [...roomLayers.backDecor, ...roomLayers.frontDecor];
    const placedBySrc = placed.reduce<Record<string, number>>((acc, p) => {
      acc[p.src] = (acc[p.src] || 0) + 1; return acc;
    }, {});
    const ownedBySrc = filtered.reduce<Record<string, { rep: DecorationInventoryItem; count: number }>>((acc, it) => {
      const key = it.src;
      if (!acc[key]) acc[key] = { rep: it, count: 0 };
      acc[key].count += 1;
      return acc;
    }, {});
    const result: { item: DecorationInventoryItem; remaining: number }[] = [];
    Object.values(ownedBySrc).forEach(({ rep, count }) => {
      const used = placedBySrc[rep.src] || 0;
      const remaining = Math.max(0, count - used);
      if (remaining > 0) result.push({ item: rep, remaining });
    });
    // Sort by src then name for stability
    result.sort((a, b) => {
      const s = a.item.src.localeCompare(b.item.src);
      if (s !== 0) return s;
      return a.item.name.localeCompare(b.item.name);
    });
    return result;
  }, [filtered, category, roomLayers.backDecor, roomLayers.frontDecor])

  const canvasScale = useCallback(() => {
    const refW = 1080, refH = 1920; const wr = bounds.width / refW, hr = bounds.height / refH; return Math.min(wr || 1, hr || 1)
  }, [bounds])

  const toPct = useCallback((clientX: number, clientY: number) => {
    const r = canvasRef.current?.getBoundingClientRect(); if (!r) return { x: 50, y: 50 }
    return { x: ((clientX - r.left) / r.width) * 100, y: ((clientY - r.top) / r.height) * 100 }
  }, [])

  const snap = useCallback((v: number) => (snapGrid && gridPct > 0 ? Math.round(v / gridPct) * gridPct : v), [snapGrid, gridPct])

  const beginEdit = (e: React.PointerEvent, m: EditMode) => {
    if (!sel) return; setDsMode(m); setDragging(true)
    e.preventDefault(); e.stopPropagation()
    // Use pointer capture to keep receiving events smoothly during drag
    try { (e.currentTarget as any).setPointerCapture?.((e as any).pointerId); pointerIdRef.current = (e as any).pointerId } catch {}
    start.current = { x: e.clientX, y: e.clientY }
    initial.current = { x: sel.x, y: sel.y, rot: sel.rotation, w: sel.width, h: sel.height }
    liveRef.current = { x: sel.x, y: sel.y, width: sel.width, height: sel.height, rotation: sel.rotation }
    canvasRectRef.current = canvasRef.current?.getBoundingClientRect() || null
    // Compute initial docking state
    updateEdgeDock()
  }

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragging || !sel) return
      if (dsMode === 'move') {
        const r = canvasRectRef.current; if (!r) return
        const dx = e.clientX - start.current.x; const dy = e.clientY - start.current.y
        let x = initial.current.x + (dx / r.width) * 100
        let y = initial.current.y + (dy / r.height) * 100
        const over = 12; x = Math.max(-over, Math.min(100 + over, x)); y = Math.max(-over, Math.min(100 + over, y))
        // Do NOT snap during drag to keep movement fluid
        liveRef.current.x = x
        liveRef.current.y = y
        if (selNodeRef.current) {
          selNodeRef.current.style.left = `${x}%`
          selNodeRef.current.style.top = `${y}%`
        }
        updateEdgeDock()
      } else if (dsMode === 'rotate') {
        const r = canvasRectRef.current!; const cx0 = r.left + (r.width * initial.current.x) / 100; const cy0 = r.top + (r.height * initial.current.y) / 100
        const ang = Math.atan2(e.clientY - cy0, e.clientX - cx0) * (180 / Math.PI)
        const ang0 = Math.atan2(start.current.y - cy0, start.current.x - cx0) * (180 / Math.PI)
        const delta = ang - ang0
        const rot = (initial.current.rot + delta + 360) % 360
        liveRef.current.rotation = rot
        if (selNodeRef.current) selNodeRef.current.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`
        updateEdgeDock()
      } else {
        const dy = e.clientY - start.current.y
        // Drag up (dy < 0) => increase size; drag down (dy > 0) => decrease size
        const rawScale = 1 + (-dy) / 160
        const scale = Math.max(0.3, Math.min(3, rawScale))
        const sc = canvasScale(); const r = canvasRectRef.current!
        // Proposed design-unit sizes
        let designW = initial.current.w * scale
        let designH = initial.current.h * scale
        // Convert to displayed px and clamp to canvas bounds, then back to design units
        const dispW = Math.min(Math.max(24, designW * sc), r.width)
        const dispH = Math.min(Math.max(24, designH * sc), r.height)
        designW = dispW / sc; designH = dispH / sc
        liveRef.current.width = designW
        liveRef.current.height = designH
        if (selNodeRef.current) {
          selNodeRef.current.style.width = `${designW * sc}px`
          selNodeRef.current.style.height = `${designH * sc}px`
        }
        updateEdgeDock()
      }
    }
    const up = () => {
      if (!sel) return setDragging(false)
      // Apply snap on release for both grid and zones
      let { x, y, width, height, rotation } = liveRef.current
      // Do not snap final placement; respect exact user drop
      if (false && snapGrid) { x = snap(x); y = snap(y) }
      if (false && snapZones) {
        const centers = [ (ZONES.CEILING.startY + ZONES.CEILING.endY) / 2, (ZONES.WALL.startY + ZONES.WALL.endY) / 2, (ZONES.FLOOR.startY + ZONES.FLOOR.endY) / 2 ]
        const nearest = centers.reduce((p, c) => (Math.abs(c - y) < Math.abs(p - y) ? c : p))
        if (Math.abs(nearest - y) <= 2.5) y = nearest
      }
      setSel(p => (p ? { ...p, x, y, width, height, rotation } : p))
      setDragging(false)
      setDsMode('move')
      try { if (pointerIdRef.current != null) selNodeRef.current?.releasePointerCapture?.(pointerIdRef.current as any) } catch {}
      pointerIdRef.current = null
      // Final dock recompute
      updateEdgeDock()
    }
    if (dragging) { document.addEventListener('pointermove', move, { passive: false }); document.addEventListener('pointerup', up, { passive: true } as any); return () => { document.removeEventListener('pointermove', move as any); document.removeEventListener('pointerup', up as any) } }
  }, [dragging, dsMode, sel, snap, toPct, canvasScale])

  const place = () => {
    if (!sel) return
    const zone = sel.y >= ZONES.FLOOR.startY ? 'FLOOR' : sel.y <= ZONES.CEILING.endY ? 'CEILING' : 'WALL'
    const item: RoomDecorItem = { src: sel.src, x: sel.x, y: sel.y, width: sel.width, height: sel.height, rotation: sel.rotation, zone, flipped: !!sel.flipped, flippedV: !!(sel as any).flippedV }
    if (sel.originalIndex !== undefined && sel.originalLayer) updateDecorItem(sel.originalLayer, sel.originalIndex, item, sel.layer)
    else addDecorItem(item, sel.layer)
    setSel(null)
  }

  const pickExisting = (layer: 'front' | 'back', index: number) => {
    const arr = layer === 'front' ? roomLayers.frontDecor : roomLayers.backDecor
    const it = arr[index]
    if (!it) return;
    setSel({ 
      src: it.src, 
      x: it.x, 
      y: it.y, 
      width: Math.max(24, it.width || 240), 
      height: Math.max(24, it.height || 240), 
      rotation: it.rotation || 0, 
      flipped: !!(it as any).flipped, 
      layer, 
      originalIndex: index, 
      originalLayer: layer 
    })
  }

  const nudge = (dx: number, dy: number) => setSel(p => (p ? { ...p, x: Math.max(-12, Math.min(112, (p.x + dx))), y: Math.max(-12, Math.min(112, (p.y + dy))) } : p))

  const sendForward = () => {
    if (!sel || sel.originalIndex === undefined || !sel.originalLayer) return
    const len = sel.originalLayer === 'front' ? roomLayers.frontDecor.length : roomLayers.backDecor.length
    // If we are already at the top, do nothing
    if (sel.originalIndex >= len - 1) return
    
    const nextIndex = sel.originalIndex + 1
    reorderDecorItem(sel.originalLayer, sel.originalIndex, nextIndex)
    setSel(p => (p ? { ...p, originalIndex: nextIndex } : p))
  }
  const sendBackward = () => {
    if (!sel || sel.originalIndex === undefined || !sel.originalLayer) return
    // If we are already at the bottom, do nothing
    if (sel.originalIndex <= 0) return
    
    const nextIndex = sel.originalIndex - 1
    reorderDecorItem(sel.originalLayer, sel.originalIndex, nextIndex)
    setSel(p => (p ? { ...p, originalIndex: nextIndex } : p))
  }
  const sendToFront = () => {
    if (!sel || sel.originalIndex === undefined || !sel.originalLayer) return
    const len = sel.originalLayer === 'front' ? roomLayers.frontDecor.length : roomLayers.backDecor.length
    const nextIndex = len - 1
    if (nextIndex === sel.originalIndex) return
    reorderDecorItem(sel.originalLayer, sel.originalIndex, nextIndex)
    setSel(p => (p ? { ...p, originalIndex: nextIndex } : p))
  }
  const sendToBack = () => {
    if (!sel || sel.originalIndex === undefined || !sel.originalLayer) return
    if (sel.originalIndex === 0) return
    reorderDecorItem(sel.originalLayer, sel.originalIndex, 0)
    setSel(p => (p ? { ...p, originalIndex: 0 } : p))
  }

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSel(null); setColorSelection(null); return }
      if (!sel) return
      const step = e.shiftKey ? 2 : 1
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) e.preventDefault()
      if (e.key === 'ArrowLeft') setSel(p => p ? { ...p, x: snap((p.x - step)) } : p)
      if (e.key === 'ArrowRight') setSel(p => p ? { ...p, x: snap((p.x + step)) } : p)
      if (e.key === 'ArrowUp') setSel(p => p ? { ...p, y: snap((p.y - step)) } : p)
      if (e.key === 'ArrowDown') setSel(p => p ? { ...p, y: snap((p.y + step)) } : p)
      if (e.key.toLowerCase() === 'r') setDsMode('rotate')
      if (e.key === 'Enter') { e.preventDefault(); place() }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setSel(p => p ? { ...p, originalIndex: undefined, originalLayer: p.layer, x: Math.min(100, p.x + 4), y: Math.min(100, p.y + 4) } : p)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ']') { e.preventDefault(); sel.originalIndex !== undefined && sel.originalLayer && reorderDecorItem(sel.originalLayer, sel.originalIndex, sel.originalIndex + (e.shiftKey ? 9999 : 1)) }
      if ((e.ctrlKey || e.metaKey) && e.key === '[') { e.preventDefault(); sel.originalIndex !== undefined && sel.originalLayer && reorderDecorItem(sel.originalLayer, sel.originalIndex, sel.originalIndex - (e.shiftKey ? 9999 : 1)) }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (sel.originalIndex !== undefined && sel.originalLayer) { removeDecorItem(sel.originalLayer, sel.originalIndex); setSel(null) }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, sel, snap, place, reorderDecorItem, removeDecorItem])

  if (!isOpen) return null
  const sc = canvasScale()

  return (
    <div className="ds-root">
      {/* Top toolbar removed; all actions via on-item handles */}

      {/* Floating exit (Red X) positioned above the sheet */}
      {isOpen && (
        <button 
          ref={exitRef} 
          className={`ds-exit ${draggingSheet ? 'dragging' : ''}`} 
          style={{ bottom: `calc(${sheetPct}vh + 12px)` }} 
          onPointerDown={(e) => e.stopPropagation()} /* Prevent dragging start */
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Exit clicked. Sel:", !!sel);
            if (sel) {
              setSel(null);
            } else if (colorSelection) {
              setColorSelection(null);
            } else {
              onClose();
            }
          }} 
          title={sel ? "Cancel Selection" : "Exit Edit Mode"}
        >
          <div style={{ 
            width: '36px', 
            height: '36px', 
            background: '#ff4444', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '18px'
          }}>
            ✕
          </div>
        </button>
      )}

      {/* Color Selection Overlay */}
      {colorSelection && (
        <div className="ds-color-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) setColorSelection(null);
        }}>
          <div className="ds-color-modal">
            <h3>Choose Color for {colorSelection.item.name}</h3>
            <div className="ds-color-grid">
              {colorSelection.variants.map((variant) => {
                const variantSrc = getVariantSrc(colorSelection.item.src, variant.fileSuffix);
                return (
                  <button 
                    key={variant.name}
                    className="ds-color-option has-image"
                    onClick={() => {
                      setRoomLayer(colorSelection.item.type as any, variantSrc);
                      setColorSelection(null);
                    }}
                    title={variant.name}
                  >
                    <img src={variantSrc} alt={variant.name} />
                    <span className="ds-color-name">{variant.name}</span>
                  </button>
                );
              })}
            </div>
            <button className="ds-btn" onClick={() => setColorSelection(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div
        className="ds-canvas"
        ref={canvasRef}
        style={{ top: bounds.top, left: bounds.left, width: bounds.width, height: bounds.height }}
        onPointerDown={(e) => {
          // Begin moving immediately if there's a selected item and background is pressed
          if (!sel) return
          e.preventDefault(); e.stopPropagation();
          beginEdit(e as any, 'move')
        }}
        onMouseDown={(e) => { if (!sel && e.target === e.currentTarget) setSel(null) }}
      >
        {/* Render back layer; ignore clicks while a selection exists to avoid switching */}
        {roomLayers.backDecor.map((d, i) => (
          sel && sel.originalLayer === 'back' && sel.originalIndex === i ? null : (
            <img
              key={`b-${i}`}
              className="ds-item"
              src={d.src}
              style={{ 
                left: `${d.x}%`, 
                top: `${d.y}%`, 
                width: d.width ? d.width * sc : undefined, 
                height: d.height ? d.height * sc : undefined, 
                transform: `translate(-50%, -50%)${d.rotation ? ` rotate(${d.rotation}deg)` : ''}${(d as any).flipped ? ' scaleX(-1)' : ''}`, 
                zIndex: 10 + i,
                pointerEvents: mode === 'build' ? 'none' : 'auto' 
              }}
              onClick={(e) => { 
                e.stopPropagation(); 
                if (mode === 'build') return; 
                if (sel) return; 
                pickExisting('back', i) 
              }}
              alt=""
            />
          )
        ))}

        {sel && (
          <div 
            ref={selNodeRef} 
            className={`ds-selected ${edgeDock.left ? 'dock-left' : ''} ${edgeDock.right ? 'dock-right' : ''} ${edgeDock.top ? 'dock-top' : ''} ${edgeDock.bottom ? 'dock-bottom' : ''}`}
            style={{ left: `${sel.x}%`, top: `${sel.y}%`, width: sel.width * sc, height: sel.height * sc, transform: `translate(-50%, -50%) rotate(${sel.rotation}deg)` }} 
            onPointerDown={(e) => { e.stopPropagation(); beginEdit(e, 'move') }}
          >
            <img src={sel.src} alt="" draggable={false} style={{ transform: `${sel.flipped ? 'scaleX(-1) ' : ''}${(sel as any).flippedV ? 'scaleY(-1)' : ''}` }} />
            <button className="ds-handle confirm" title={sel.originalIndex !== undefined ? 'Update' : 'Place'} onClick={(e) => { e.preventDefault(); e.stopPropagation(); place() }}>✓</button>
            <button className="ds-handle delete" title="Delete" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (sel.originalIndex !== undefined && sel.originalLayer) { removeDecorItem(sel.originalLayer, sel.originalIndex); setSel(null) } }}>✕</button>
            <button className="ds-handle resize" title="Resize" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); beginEdit(e as any, 'resize') }}>⤡</button>
            <button className="ds-handle flipH" title="Flip Horizontal" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSel(p => p ? { ...p, flipped: !p.flipped } : p) }}>↔</button>
            <button className="ds-handle rotate" title="Rotate" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); beginEdit(e as any, 'rotate') }}>↻</button>
            <button className="ds-handle flipV" title="Flip Vertical" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSel(p => p ? { ...p, flippedV: !(p as any).flippedV } : p) }}>↕</button>
            <button className="ds-handle zdown" title="Send Backward" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); sendBackward() }}>−</button>
            <button className="ds-handle zup" title="Bring Forward" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); sendForward() }}>+</button>
          </div>
        )}

        {/* Render front layer above selection; ignore clicks while a selection exists */}
        {roomLayers.frontDecor.map((d, i) => (
          sel && sel.originalLayer === 'front' && sel.originalIndex === i ? null : (
            <img
              key={`f-${i}`}
              className="ds-item"
              src={d.src}
              style={{ 
                left: `${d.x}%`, 
                top: `${d.y}%`, 
                width: d.width ? d.width * sc : undefined, 
                height: d.height ? d.height * sc : undefined, 
                transform: `translate(-50%, -50%)${d.rotation ? ` rotate(${d.rotation}deg)` : ''}${(d as any).flipped ? ' scaleX(-1)' : ''}`, 
                zIndex: 40 + i,
                pointerEvents: mode === 'build' ? 'none' : 'auto'
              }}
              onClick={(e) => { 
                e.stopPropagation(); 
                if (mode === 'build') return; 
                if (sel) return; 
                pickExisting('front', i) 
              }}
              alt=""
            />
          )
        ))}
      </div>

      {sel && (
        <div className="ds-zbar">
          <button className="ds-btn" onClick={() => setSel(p => p ? { ...p, layer: p.layer === 'front' ? 'back' : 'front' } : p)}>{sel.layer === 'front' ? 'Front' : 'Back'}</button>
          <button className="ds-btn" onClick={() => nudge(-1, 0)}>◀</button>
          <button className="ds-btn" onClick={() => nudge(1, 0)}>▶</button>
          <button className="ds-btn" onClick={() => nudge(0, -1)}>▲</button>
          <button className="ds-btn" onClick={() => nudge(0, 1)}>▼</button>
          <button className="ds-btn" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); sendBackward(); }}>Send back</button>
          <button className="ds-btn" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); sendForward(); }}>Bring forward</button>
          <button className="ds-btn" onClick={() => setSel(p => p ? { ...p, originalIndex: undefined, originalLayer: p.layer, x: Math.min(100, p.x + 4), y: Math.min(100, p.y + 4) } : p)}>Duplicate</button>
          <button className="ds-btn" onClick={sendToBack}>To back</button>
          <button className="ds-btn" onClick={sendToFront}>To front</button>
          <button className="ds-btn danger" disabled={sel.originalIndex === undefined} onClick={() => { if (sel && sel.originalIndex !== undefined && sel.originalLayer) removeDecorItem(sel.originalLayer, sel.originalIndex); setSel(null) }}>Delete</button>
          <button className="ds-btn" onClick={() => setSel(null)}>Cancel</button>
          <button className="ds-btn primary" onClick={place}>{sel.originalIndex !== undefined ? 'Update' : 'Place'}</button>
        </div>
      )}

      <div ref={sheetRef} className={`ds-sheet ${draggingSheet ? 'dragging' : ''}`} style={{ height: `${sheetPct}vh` }}>
        <div className="ds-grip" onPointerDown={(e) => {
          const startY = e.clientY; const startPct = sheetPct
          setDraggingSheet(true)
          ;(e.currentTarget as HTMLElement).setPointerCapture?.((e as any).pointerId)
          const target = e.currentTarget as HTMLElement
          const onMove = (ev: PointerEvent) => {
            ev.preventDefault()
            const dy = ev.clientY - startY
            const next = Math.max(8, Math.min(90, startPct - (dy / window.innerHeight) * 100))
            liveSheetPctRef.current = next
            // Update styles directly for responsiveness
            if (sheetRef.current) sheetRef.current.style.height = `${next}vh`
            if (exitRef.current) exitRef.current.style.bottom = `calc(${next}vh + 12px)`
            setUserAdjustedSheet(true)
          }
          const onUp = () => {
            setDraggingSheet(false)
            try { target.releasePointerCapture?.((e as any).pointerId) } catch {}
            target.removeEventListener('pointermove', onMove as any)
            target.removeEventListener('pointerup', onUp as any)
            target.removeEventListener('pointercancel', onUp as any)
            target.removeEventListener('pointerleave', onUp as any)
            // Commit final height to state
            const finalPct = liveSheetPctRef.current || startPct
            setSheetPct(finalPct)
          }
          target.addEventListener('pointermove', onMove as any)
          target.addEventListener('pointerup', onUp as any)
          target.addEventListener('pointercancel', onUp as any)
          target.addEventListener('pointerleave', onUp as any)
        }} />

        <div className="ds-header">
          <div className="ds-tabs">
            {mode === 'build' ? (
              (['wall','floor','ceiling','trim','overlay'] as DecorationItemType[]).map(cat => (
                <button key={cat} className={`ds-tab ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</button>
              ))
            ) : (
              FURNITURE_CATEGORIES.map(subCat => (
                <button key={subCat} className={`ds-tab ${furnitureSubCategory === subCat ? 'active' : ''}`} onClick={() => setFurnitureSubCategory(subCat)}>{subCat}</button>
              ))
            )}
          </div>
        </div>
        <div className="ds-find">
          <input placeholder="Search items" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        
        {/* Remove All Overlays Button */}
        {category === 'overlay' && (
          <div style={{ padding: '0 8px' }}>
            <button className="ds-remove-all-btn" onClick={() => setRoomLayer('overlay', '')}>
              Remove All Overlays
            </button>
          </div>
        )}

        <div 
          className="ds-grid" 
          ref={gridRef}
          style={mode === 'decorate' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' } : undefined}
        >
          {visibleItems.map(({ item: it, remaining }) => (
            <button
              key={it.id}
              className="ds-slot"
              style={mode === 'decorate' ? { padding: '8px', gap: '4px' } : undefined}
              onClick={() => {
                if (it.type !== 'furniture') { 
                  // Check for variants first
                  const variants = getItemVariants(it.id);
                  if (variants && variants.length > 0) {
                    setColorSelection({ item: it, variants });
                  } else {
                    setRoomLayer(it.type as any, it.src);
                  }
                  return;
                }
                setSel({ src: it.src, x: 50, y: 58, width: 240, height: 240, rotation: 0, layer: 'back' })
                setSheetPct(32)
              }}
            >
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 0 }}>
                <img 
                  src={it.src} 
                  alt={it.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div style={mode === 'decorate' ? { fontSize: '11px', lineHeight: '1.2', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } : undefined}>{it.name}</div>
              {category === 'furniture' && remaining > 1 && (
                <span className="ds-badge" style={mode === 'decorate' ? { fontSize: '10px', padding: '1px 4px', position: 'absolute', top: '4px', right: '4px' } : undefined}>{remaining}</span>
              )}
              
              {/* Swatch Indicator - Moved to end for stacking context */}
              {getItemVariants(it.id) && getItemVariants(it.id)!.length > 0 && (
                <img src="/assets/icons/swatch.png" className="ds-swatch-indicator" alt="Has variants" title="Has color options" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}