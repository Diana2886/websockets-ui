import { randomUUID } from 'node:crypto'
import { WebSocket } from 'ws'
import { Ship } from './Ship'

export class Player {
  public id: string
  public name: string
  public password: string
  public error: boolean
  public errorText: string
  public ws: WebSocket
  private ships: Ship[]
  private attackedCells: Set<string>
  private wins: number

  constructor(
    name: string,
    password: string,
    ws: WebSocket,
    ships: Ship[] = []
  ) {
    this.id = randomUUID()
    this.name = name
    this.password = password
    this.error = false
    this.errorText = ''
    this.ws = ws
    this.ships = []
    this.attackedCells = new Set()
    this.wins = 0
  }

  getData() {
    return {
      name: this.name,
      index: this.id,
      error: this.error,
      errorText: this.errorText,
    }
  }

  incrementWins() {
    this.wins += 1
  }

  getWins() {
    return this.wins
  }

  getShips() {
    return this.ships
  }

  setShips(ships: Ship[]) {
    this.ships = ships
  }

  hasAttackedCell(x: number, y: number): boolean {
    return this.attackedCells.has(`${x},${y}`)
  }

  recordAttack(x: number, y: number) {
    this.attackedCells.add(`${x},${y}`)
  }
}
