import { Player } from './Player'
import { randomUUID } from 'node:crypto'

export class Room {
  public id: string
  private players: Player[]

  constructor() {
    this.id = randomUUID()
    this.players = []
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

  removePlayer(playerId: string) {
    this.players = this.players.filter((player) => player.id !== playerId)
  }

  isEmpty(): boolean {
    return this.players.length === 0
  }
}
