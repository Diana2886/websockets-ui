import { randomUUID } from 'node:crypto'
import { Position } from '../types/index'
import { Player } from './Player'
import { Room } from './Room'
import { Ship } from '../types/ship'

export class Game {
  //   private room: Room
  //   private currentPlayer: Player
  //   private opponent: Player
  public idGame: string
  private idPlayer: string
  private ships: Ship[]

  constructor(/* room: Room */ player: Player) {
    this.idGame = randomUUID()
    this.idPlayer = player.id
    this.ships = []
    // this.room = room
    // ;[this.currentPlayer, this.opponent] = this.room.getPlayers()
  }

  setShips(ships: Ship[]) {
    this.ships = ships
  }

  //   makeMove(player: Player, position: Position) {
  //     const isHit = this.opponent.ships.some(
  //       (ship) => ship.x === position.x && ship.y === position.y
  //     )

  //     if (isHit) {
  //       player.recordHit(position)
  //       this.opponent.ships = this.opponent.ships.filter(
  //         (ship) => ship.x !== position.x || ship.y !== position.y
  //       )
  //     } else {
  //       player.recordMiss(position)
  //     }

  //     if (this.opponent.ships.length === 0) {
  //       console.log(`${player.name} wins!`)
  //       return 'win'
  //     }
  //     this.switchTurn()
  //   }

  //   private switchTurn() {
  //     ;[this.currentPlayer, this.opponent] = [this.opponent, this.currentPlayer]
  //   }
}
