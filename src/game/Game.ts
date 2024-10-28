import { randomUUID } from 'node:crypto'
import { Player } from './Player'
import { GRID_SIZE } from '../utils/constants'

export class Game {
  public id: string
  private players: Player[]
  private currentPlayerIndex: number

  constructor(players: Player[]) {
    this.id = randomUUID()
    this.players = players
    this.currentPlayerIndex = 0
  }

  getPlayers() {
    return this.players
  }

  processAttack(
    x: number,
    y: number,
    attackingPlayerId: string
  ): 'miss' | 'killed' | 'shot' | null {
    if (this.getCurrentPlayerId() !== attackingPlayerId) {
      return null
    }

    const attackingPlayer = this.players.find((p) => p.id === attackingPlayerId)
    if (!attackingPlayer) return null

    const opponent = this.players.find((p) => p.id !== attackingPlayerId)
    if (!opponent) return null

    if (opponent.hasAttackedCell(x, y)) {
      return null
    }

    opponent.recordAttack(x, y)

    const opponentShips = opponent.getShips()
    let result: 'miss' | 'killed' | 'shot' | null = 'miss'

    for (const ship of opponentShips) {
      const isHit = ship.checkHit(x, y)

      if (isHit) {
        result = ship.isDestroyed() ? 'killed' : 'shot'

        if (result === 'killed') {
          const occupiedCells = ship.getOccupiedCells()

          for (const cell of occupiedCells) {
            this.markKilled(cell.x, cell.y, attackingPlayer)
          }

          const surroundingCells = this.getSurroundingCells(
            occupiedCells,
            GRID_SIZE
          )

          for (const cell of surroundingCells) {
            opponent.recordAttack(cell.x, cell.y)
            this.markMiss(cell.x, cell.y, attackingPlayer)
          }
        }

        return result
      }
    }

    if (result === 'miss') {
      this.togglePlayerTurn()
    }

    return result
  }

  isGameOver(): boolean {
    return this.players.some((player) =>
      player.getShips().every((ship) => ship.isDestroyed())
    )
  }

  getWinner(): string | null {
    const winner = this.players.find((player) =>
      this.players
        .filter((p) => p.id !== player.id)
        .every((opponent) =>
          opponent.getShips().every((ship) => ship.isDestroyed())
        )
    )
    winner && winner.incrementWins()
    return winner ? winner.id : null
  }

  getCurrentPlayerId(): string {
    return this.players[this.currentPlayerIndex].id
  }

  private togglePlayerTurn() {
    this.currentPlayerIndex =
      (this.currentPlayerIndex + 1) % this.players.length
  }

  generateRandomCoordinates(): { x: number; y: number } {
    return {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    }
  }

  private getSurroundingCells(
    occupiedCells: { x: number; y: number }[],
    gridSize: number
  ): { x: number; y: number }[] {
    const surroundingCells = new Set<string>()

    for (const cell of occupiedCells) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const x = cell.x + dx
          const y = cell.y + dy

          if (
            x >= 0 &&
            x < gridSize &&
            y >= 0 &&
            y < gridSize &&
            !occupiedCells.some((c) => c.x === x && c.y === y)
          ) {
            surroundingCells.add(`${x},${y}`)
          }
        }
      }
    }
    return Array.from(surroundingCells).map((pos) => {
      const [x, y] = pos.split(',').map(Number)
      return { x, y }
    })
  }

  private markMiss(x: number, y: number, attackingPlayer: Player) {
    attackingPlayer.ws.send(
      JSON.stringify({
        type: 'attack',
        data: JSON.stringify({
          position: { x, y },
          currentPlayer: attackingPlayer.id,
          status: 'miss',
        }),
        id: 0,
      })
    )
  }

  private markKilled(x: number, y: number, attackingPlayer: Player) {
    attackingPlayer.ws.send(
      JSON.stringify({
        type: 'attack',
        data: JSON.stringify({
          position: { x, y },
          currentPlayer: attackingPlayer.id,
          status: 'killed',
        }),
        id: 0,
      })
    )
  }
}
