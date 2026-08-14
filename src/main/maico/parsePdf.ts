import * as fs from 'node:fs'
import { pxToFreqKhz, pxToDb, classifySymbol } from './chartCalibration'

async function getJpegJs(): Promise<{ decode: (buf: Buffer, opts: any) => { width: number; height: number; data: Uint8Array } }> {
  // @ts-ignore
  const mod = await import('jpeg-js')
  return mod.default ?? mod
}

export interface ParsedAudiogramData {
  rightSymbols: PlacedSymbolInput[]
  leftSymbols: PlacedSymbolInput[]
}

export interface PlacedSymbolInput {
  freq: number
  db: number
  symbolType: string
}

interface PixelCluster {
  cx: number
  cy: number
  w: number
  h: number
  pixelCount: number
  color: 'red' | 'blue'
}

function isRed(r: number, g: number, b: number) {
  return r > 150 && g < 100 && b < 100 && r > g * 1.8 && r > b * 1.8
}

function isBlue(r: number, g: number, b: number) {
  return b > 120 && r < 100 && g < 130 && b > r * 1.5
}

function findClusters(data: Uint8Array, width: number, height: number): PixelCluster[] {
  const visited = new Uint8Array(width * height)
  const clusters: PixelCluster[] = []

  function bfs(startX: number, startY: number, colorCheck: (r: number, g: number, b: number) => boolean) {
    const queue: [number, number][] = [[startX, startY]]
    const pixels: [number, number][] = []
    visited[startY * width + startX] = 1

    while (queue.length > 0) {
      const [x, y] = queue.shift()!
      pixels.push([x, y])
      for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]] as [number,number][]) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
        const idx = ny * width + nx
        if (visited[idx]) continue
        const pi = idx * 4
        if (colorCheck(data[pi], data[pi+1], data[pi+2])) {
          visited[idx] = 1
          queue.push([nx, ny])
        }
      }
    }
    return pixels
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (visited[y * width + x]) continue
      const i = (y * width + x) * 4
      const r = data[i], g = data[i+1], b = data[i+2]

      let colorCheck: ((r: number, g: number, b: number) => boolean) | null = null
      let colorType: 'red' | 'blue' | null = null
      if (isRed(r, g, b)) { colorCheck = isRed; colorType = 'red' }
      else if (isBlue(r, g, b)) { colorCheck = isBlue; colorType = 'blue' }

      if (!colorCheck || !colorType) continue

      visited[y * width + x] = 1
      const pixels = bfs(x, y, colorCheck)

      if (pixels.length < 50) continue
      const xs = pixels.map(p => p[0])
      const ys = pixels.map(p => p[1])
      const minX = Math.min(...xs), maxX = Math.max(...xs)
      const minY = Math.min(...ys), maxY = Math.max(...ys)
      const w = maxX - minX + 1
      const h = maxY - minY + 1
      if (h < 10) continue

      clusters.push({
        cx: (minX + maxX) / 2,
        cy: (minY + maxY) / 2,
        w, h,
        pixelCount: pixels.length,
        color: colorType,
      })
    }
  }

  return clusters
}

// Extract JPEG streams from raw PDF binary.
// Maico MA 42 order: index 0 = logo, index 1 = right ear chart, index 2 = left ear chart
function extractJpegsFromPdf(pdfPath: string): Buffer[] {
  const buf = fs.readFileSync(pdfPath)
  const SOI = Buffer.from([0xff, 0xd8, 0xff])
  const EOI = Buffer.from([0xff, 0xd9])
  const jpegs: Buffer[] = []

  let pos = 0
  while (pos < buf.length - 3) {
    const start = buf.indexOf(SOI, pos)
    if (start === -1) break
    const end = buf.indexOf(EOI, start + 3)
    if (end === -1) break
    jpegs.push(buf.subarray(start, end + 2))
    pos = end + 2
  }
  return jpegs
}

async function analyzeChart(jpeg: Buffer, ear: 'right' | 'left'): Promise<PlacedSymbolInput[]> {
  const jpegJs = await getJpegJs()
  const { data, width, height } = jpegJs.decode(jpeg, { useTArray: true, formatAsRGBA: true })

  const clusters = findClusters(data, width, height)
    .filter(c => c.pixelCount / (c.w * c.h) >= 0.20) // discard connecting lines (density always < 0.15)

  // Group clusters that map to the same grid point: overlapping symbols merge into one blob.
  // Key: "freq-db". Multiple clusters at the same point means the image kept them separate
  // (e.g. Maico draws them with slight offset); one merged blob means they physically overlap.
  const byPosition = new Map<string, typeof clusters>()
  for (const c of clusters) {
    const freq = pxToFreqKhz(c.cx)
    const db = pxToDb(c.cy)
    const key = `${freq}-${db}`
    if (!byPosition.has(key)) byPosition.set(key, [])
    byPosition.get(key)!.push(c)
  }

  const symbols: PlacedSymbolInput[] = []
  for (const [key, group] of byPosition) {
    const [freqStr, dbStr] = key.split('-')
    const freq = parseFloat(freqStr)
    const db = parseFloat(dbStr)

    if (group.length === 1) {
      // Single cluster, classify normally
      const c = group[0]
      symbols.push({ freq, db, symbolType: classifySymbol(c.w, c.h, c.pixelCount, ear) })
    } else {
      // Multiple separate clusters at the same grid point, emit each
      for (const c of group) {
        symbols.push({ freq, db, symbolType: classifySymbol(c.w, c.h, c.pixelCount, ear) })
      }
    }
  }

  return symbols
}

export async function parseMaicoPdf(pdfPath: string): Promise<ParsedAudiogramData> {
  const jpegs = extractJpegsFromPdf(pdfPath)

  if (jpegs.length < 2) throw new Error('Could not find audiogram charts in PDF')

  const [rightSymbols, leftSymbols] = await Promise.all([
    analyzeChart(jpegs[1], 'right'),
    analyzeChart(jpegs[2] ?? jpegs[1], 'left'),
  ])

  // If both ears decoded the same JPEG (only 2 found), left should be empty
  return {
    rightSymbols,
    leftSymbols: jpegs.length >= 3 ? leftSymbols : [],
  }
}
