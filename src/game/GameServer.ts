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
    server.listen(port, () => {
      console.log(`WebSocket server started on ws://localhost:${port}`)
    })

    this.wsServer.on('connection', (ws) => this.handleConnection(ws))

    process.on('SIGINT', () => this.shutdown())
    process.on('SIGTERM', () => this.shutdown())
  }

  private handleConnection(ws: WebSocket) {
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString())
      console.log('Received command:', message)
      this.handleMessage(ws, message)
    })

    ws.on('close', () => {
      console.log('Client disconnected')
      this.cleanupDisconnectedClient(ws)
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

    if (player) {
      if (player.password !== password) {
        player.error = true
        player.errorText = 'Incorrect password for this user'
      } else {
        player.error = false
        player.errorText = ''
      }
    }

    if (!player) {
      player = new Player(name, password, ws)
      this.players.set(ws, player)
    }

    const result = JSON.stringify({
      type: MessageType.REGISTER,
      data: JSON.stringify(player.getData()),
      id: 0,
    })

    console.log('Result:', result)
    ws.send(result)
  }

  private updateWinners() {
    const winnersTable = Array.from(this.players.values()).map((player) => ({
      name: player.name,
      wins: player.getWins(),
    }))

    const result = {
      type: MessageType.UPDATE_WINNERS,
      data: JSON.stringify(winnersTable),
      id: 0,
    }

    console.log('Result:', result)

    this.players.forEach((player) => {
      player.ws.send(JSON.stringify(result))
    })
  }

  private broadcastRoomsUpdate() {
    this.rooms.forEach((room, roomId) => {
      if (room.roomUsers.length === 2) {
        this.rooms.delete(roomId)
      }
    })

    const roomList = JSON.stringify(Array.from(this.rooms.values()))

    const result = JSON.stringify({
      type: MessageType.UPDATE_ROOM,
      data: roomList,
      id: 0,
    })

    console.log('Result:', result)
    this.players.forEach((_, ws) => {
      ws.send(result)
    })
    this.updateWinners()
  }

  private createRoom(ws: WebSocket) {
    const player = this.players.get(ws)
    if (!player) return this.sendError(ws, 'Player not found')

    const room = new Room()
    this.rooms.set(room.id, room.createAvailableRoom(player))
    this.allRooms.set(room.id, room)

    this.broadcastRoomsUpdate()
  }

  private addUserToRoom(ws: WebSocket, roomId: string) {
    const room = this.rooms.get(roomId)
    const player = this.players.get(ws)

    if (player && room) {
      if (room.roomUsers.find((user) => user.index === player.id)) {
        this.sendError(ws, 'You are already in this room')
        return
      }

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
            const result = JSON.stringify({
              type: MessageType.CREATE_GAME,
              data: JSON.stringify({
                idGame: game.id,
                idPlayer: user.index,
              }),
            })

            console.log('Result:', result)
            userSocket.send(result)
          }
        })
      }

      this.broadcastRoomsUpdate()
    }
  }

  private startGame(ws: WebSocket, parsedData: AddShipsDataType) {
    const { gameId, ships, indexPlayer } = parsedData

    this.players.forEach((player) => {
      if (player.id === indexPlayer) {
        player.setShips(ships.map((shipData) => new Ship(shipData)))

        const result = JSON.stringify({
          type: MessageType.START_GAME,
          data: JSON.stringify({
            ships,
            currentPlayerIndex: indexPlayer,
          }),
          id: 0,
        })

        console.log('Result:', result)
        ws.send(result)
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
          const result = JSON.stringify({
            type: 'attack',
            data: JSON.stringify({
              position: { x, y },
              currentPlayer: indexPlayer,
              status: attackResult,
            }),
            id: 0,
          })

          console.log('Result:', result)
          player.ws.send(result)
        })
      }

      if (game.isGameOver()) {
        this.sendFinishGame(game)
        this.updateWinners()
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
      const result = JSON.stringify({
        type: MessageType.TURN,
        data: JSON.stringify({ currentPlayer }),
        id: 0,
      })

      console.log('Result:', result)
      player.ws.send(result)
    })
  }

  private sendFinishGame(game: Game) {
    const winner = game.getWinner()
    game.getPlayers().forEach((player) => {
      const result = JSON.stringify({
        type: MessageType.FINISH,
        data: JSON.stringify({ winPlayer: winner }),
        id: 0,
      })

      console.log('Result:', result)
      player.ws.send(result)
    })
  }

  private sendError(ws: WebSocket, message: string) {
    ws.send(JSON.stringify({ error: message }))
  }

  private shutdown() {
    console.log('Shutting down WebSocket server...')
    this.wsServer.clients.forEach((client) => client.close())
    this.wsServer.close(() => {
      this.players.clear()
      this.rooms.clear()
      this.allRooms.clear()
      this.games.clear()

      console.log('Server closed')
      process.exit(0)
    })
  }

  private cleanupDisconnectedClient(ws: WebSocket) {
    const player = this.players.get(ws)
    if (!player) return

    this.players.delete(ws)

    if (this.games.has(ws)) {
      this.games.delete(ws)
    }

    for (const [roomId, room] of this.allRooms) {
      room.removePlayer(player.id)
      if (room.isEmpty()) {
        this.allRooms.delete(roomId)
      }
    }
  }
}
