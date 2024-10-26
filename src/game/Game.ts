import { randomUUID } from 'node:crypto'
import { Player } from './Player'

export class Game {
  public id: string
  private players: Player[]

  constructor(players: Player[]) {
    this.id = randomUUID()
    this.players = players
  }
}
