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
    this.players.push(player)
  }

  createAvailableRoom(player: Player) {
    this.addPlayer(player)
    return {
      roomId: this.id,
      roomUsers: [
        {
          name: player.name,
          index: player.id,
        },
      ],
    }
  }

  getPlayers() {
    return this.players
  }
}
