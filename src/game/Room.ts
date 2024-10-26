import { Player } from './Player'
import { randomUUID } from 'node:crypto'

export class Room {
  public id: string
  private players: Player[]
  public isGameStarted: boolean

  constructor() {
    this.id = randomUUID()
    this.players = []
    this.isGameStarted = false
  }

  addPlayer(player: Player) {
    if (this.players.length >= 2) throw new Error('Room is full')
    this.players.push(player)
    if (this.players.length === 2) this.isGameStarted = true
  }

  getPlayers() {
    return this.players
  }
}
