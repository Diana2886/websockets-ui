import { randomUUID } from 'node:crypto'
import { WebSocket } from 'ws'
import { Ship } from '../types/ship'

export class Player {
  public id: string
  public name: string
  public password: string
  public error: boolean
  public errorText: string
  public ws: WebSocket
  private ships: Ship[]

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
    this.ships = ships
  }

  getData() {
    return {
      name: this.name,
      index: this.id,
      error: this.error,
      errorText: this.errorText,
    }
  }
}
