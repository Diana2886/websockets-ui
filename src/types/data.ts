import { Ship } from './ship'

export type RegDataType = {
  name: string
  password: string
}

export type AddShipsDataType = {
  gameId: string
  ships: Ship[]
  indexPlayer: string
}

export type AttackDataType = {
  gameId: string
  x: number
  y: number
  indexPlayer: string
}
