import { ShipInterface } from '../types/ship'

export class Ship {
  public position: { x: number; y: number }
  public direction: boolean
  public length: number
  public type: 'small' | 'medium' | 'large' | 'huge'
  private hitCells: Set<string>

  constructor(data: ShipInterface) {
    this.position = data.position
    this.direction = data.direction
    this.length = data.length
    this.type = data.type
    this.hitCells = new Set()
  }

  getOccupiedCells(): { x: number; y: number }[] {
    const cells = []
    for (let i = 0; i < this.length; i++) {
      const x = this.position.x + (this.direction ? 0 : i)
      const y = this.position.y + (this.direction ? i : 0)
      cells.push({ x, y })
    }
    return cells
  }

  checkHit(x: number, y: number): boolean {
    const cellKey = `${x},${y}`
    const occupiedCells = this.getOccupiedCells()
    if (occupiedCells.some((cell) => cell.x === x && cell.y === y)) {
      this.hitCells.add(cellKey)
      return true
    }
    return false
  }

  isDestroyed(): boolean {
    return this.hitCells.size === this.length
  }
}
