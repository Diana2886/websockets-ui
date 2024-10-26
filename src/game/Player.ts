import { randomUUID } from 'node:crypto'
import { Board, Position } from '../types/index'
import { WebSocket } from 'ws'

export class Player {
  public id: string
  public name: string
  public password: string
  public error: boolean
  public errorText: string
  public ws: WebSocket

  constructor(name: string, password: string, ws: WebSocket) {
    this.id = randomUUID()
    this.name = name
    this.password = password
    this.error = false
    this.errorText = ''
    this.ws = ws
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
