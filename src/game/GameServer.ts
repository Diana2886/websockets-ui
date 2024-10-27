import * as http from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { Player } from './Player'
import { Room } from './Room'
import { Game } from './Game'
import { RoomType } from '../types/room'
import { MessageType } from '../types/message'
import { AddShipsDataType, AttackDataType, RegDataType } from '../types/data'
import { parseData } from '../utils/helpers'
import { Ship } from './Ship'

export class GameServer {
  private wsServer: WebSocketServer
  private players: Map<WebSocket, Player> = new Map()
  private rooms: Map<string, RoomType> = new Map()
  private allRooms: Map<string, Room> = new Map()
  private games: Map<WebSocket, Game> = new Map()

  constructor(port: number) {
    const server = http.createServer()
    this.wsServer = new WebSocketServer({ server })
    server.listen(port)

    this.wsServer.on('connection', (ws) => this.handleConnection(ws))
  }

  private handleConnection(ws: WebSocket) {
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString())
      console.log('message', message)
      this.handleMessage(ws, message)
    })

    ws.on('close', () => {
      this.players.delete(ws)
    })
  }

  private handleMessage(ws: WebSocket, message: any) {
    const { type, data } = message

    switch (type) {
      case MessageType.REGISTER:
        this.handleRegistration(ws, parseData(data))
        break
      case MessageType.CREATE_ROOM:
        this.createRoom(ws)
        break
      case MessageType.ADD_USER_TO_ROOM:
        this.addUserToRoom(ws, parseData(data).indexRoom)
        break
      case MessageType.ADD_SHIPS:
        this.startGame(ws, parseData(data))
        break
      case MessageType.ATTACK:
        this.handleAttack(ws, parseData(data))
        break
      case MessageType.RANDOM_ATTACK:
        this.handleRandomAttack(ws, parseData(data))
        break
      default:
        ws.send(JSON.stringify({ error: 'Invalid message type' }))
    }
  }

  private handleRegistration(ws: WebSocket, data: RegDataType) {
    const { name, password } = data
    let player = Array.from(this.players.values()).find((p) => p.name === name)

    if (player && player.password !== password) {
      player.error = true
      player.errorText = 'Incorrect password for this user'
    }

    if (!player) {
      player = new Player(name, password, ws)
      this.players.set(ws, player)
    }
    console.log('player.id', player!.id)

    ws.send(
      JSON.stringify({
        type: MessageType.REGISTER,
        data: JSON.stringify(player.getData()),
        id: 0,
      })
    )
  }

  private broadcastRoomsUpdate() {
    this.rooms.forEach((room, roomId) => {
      if (room.roomUsers.length === 2) {
        this.rooms.delete(roomId)
      }
    })

    const roomList = JSON.stringify(Array.from(this.rooms.values()))

    this.players.forEach((_, ws) => {
      ws.send(
        JSON.stringify({
          type: 'update_room',
          data: roomList,
          id: 0,
        })
      )
    })
  }

  private createRoom(ws: WebSocket) {
    const player = this.players.get(ws)
    if (!player) return this.sendError(ws, 'Player not found')

    const room = new Room()
    this.rooms.set(room.id, room.createAvailableRoom(player))
    console.log('this.rooms', this.rooms)
    this.allRooms.set(room.id, room)

    this.broadcastRoomsUpdate()
  }

  private addUserToRoom(ws: WebSocket, roomId: string) {
    const room = this.rooms.get(roomId)
    const player = this.players.get(ws)

    if (player && room) {
      room.roomUsers.push({
        name: player.name,
        index: player.id,
      })

      this.allRooms.forEach((room) => {
        if (room.id === roomId) {
          room.addPlayer(player)
        }
      })

      const currentRoom = this.allRooms.get(roomId)
      if (currentRoom) {
        const game = new Game(currentRoom.getPlayers())
        this.games.set(ws, game)

        room.roomUsers.forEach((user) => {
          const userSocket = Array.from(this.players.entries()).find(
            ([, p]) => p.id === user.index
          )?.[0]

          if (userSocket) {
            console.log('user.index', user.index)

            userSocket.send(
              JSON.stringify({
                type: 'create_game',
                data: JSON.stringify({
                  idGame: game.id,
                  idPlayer: user.index,
                }),
              })
            )
          }
        })
      }

      this.broadcastRoomsUpdate()
    }
  }

  private startGame(ws: WebSocket, parsedData: AddShipsDataType) {
    const { gameId, ships, indexPlayer } = parsedData
    console.log('ships', ships)

    this.players.forEach((player) => {
      if (player.id === indexPlayer) {
        player.setShips(ships.map((shipData) => new Ship(shipData)))

        ws.send(
          JSON.stringify({
            type: 'start_game',
            data: JSON.stringify({
              ships,
              currentPlayerIndex: indexPlayer,
            }),
            id: 0,
          })
        )
      }
    })

    const game = Array.from(this.games.values()).find((g) => g.id === gameId)
    if (game) {
      this.sendTurnInfo(game)
    }
  }

  private handleAttack(ws: WebSocket, data: AttackDataType) {
    const { x, y, gameId, indexPlayer } = data
    const game = Array.from(this.games.values()).find((g) => g.id === gameId)

    if (game) {
      const attackResult = game.processAttack(x, y, indexPlayer)
      if (attackResult) {
        game.getPlayers().forEach((player) => {
          player.ws.send(
            JSON.stringify({
              type: 'attack',
              data: JSON.stringify({
                position: { x, y },
                currentPlayer: indexPlayer,
                status: attackResult,
              }),
              id: 0,
            })
          )
        })
      }

      if (game.isGameOver()) {
        console.log('Game over!')
        this.sendFinishGame(game)
      } else {
        this.sendTurnInfo(game)
      }
    }
  }

  private handleRandomAttack(
    ws: WebSocket,
    data: { gameId: string; indexPlayer: string }
  ) {
    const { gameId, indexPlayer } = data
    const attackingPlayer = Array.from(this.players.values()).find(
      (p) => p.id === indexPlayer
    )
    if (!attackingPlayer) return null

    const opponent = Array.from(this.players.values()).find(
      (p) => p.id !== indexPlayer
    )
    if (!opponent) return null

    const game = Array.from(this.games.values()).find((g) => g.id === gameId)

    let x: number, y: number

    if (game) {
      do {
        ;({ x, y } = game.generateRandomCoordinates())
      } while (opponent.hasAttackedCell(x, y))
      this.handleAttack(ws, { gameId, x, y, indexPlayer })
      this.sendTurnInfo(game)
    }
  }

  private sendTurnInfo(game: Game) {
    const currentPlayer = game.getCurrentPlayerId()
    game.getPlayers().forEach((player) => {
      player.ws.send(
        JSON.stringify({
          type: 'turn',
          data: JSON.stringify({ currentPlayer }),
          id: 0,
        })
      )
    })
  }

  private sendFinishGame(game: Game) {
    const winner = game.getWinner()
    game.getPlayers().forEach((player) => {
      player.ws.send(
        JSON.stringify({
          type: 'finish',
          data: JSON.stringify({ winPlayer: winner }),
          id: 0,
        })
      )
    })
  }

  private sendError(ws: WebSocket, message: string) {
    ws.send(JSON.stringify({ error: message }))
  }
}
