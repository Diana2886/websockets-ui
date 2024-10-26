import * as http from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { Player } from './Player'
import { Room } from './Room'
import { Game } from './Game'
import { Position } from '../types/index'
import { RoomType } from '../types/room'
import { Ship } from '../types/ship'

export class GameServer {
  private wsServer: WebSocketServer
  private players: Map<WebSocket, Player> = new Map()
  private rooms: Map<string, RoomType> = new Map()
  private games: Map<string, Game> = new Map()

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
      this.routeMessage(ws, message)
    })
  }

  private routeMessage(ws: WebSocket, message: any) {
    const { type, data } = message
    let player: Player | undefined

    switch (type) {
      case 'reg':
        const { name, password } = JSON.parse(data)
        const allPlayers = Array.from(this.players.values())

        allPlayers.forEach((pl) => {
          if (pl.name === name) {
            if (pl.password !== password) {
              pl.error = true
              pl.errorText = 'Incorrect password'
            }
            player = pl
          }
        })
        if (!player) {
          player = new Player(name, password, ws)
          this.players.set(ws, player)
        }
        console.log('player.id', player!.id)
        this.registerPlayer(ws, player!)
        break
      case 'create_room':
        player = this.players.get(ws)
        if (player) {
          this.createRoom(ws, player)
        }
        break
      case 'add_user_to_room':
        const { indexRoom } = JSON.parse(data)
        this.addUserToRoom(ws, indexRoom)
        break
      case 'add_ships':
        const { gameId, ships, indexPlayer } = JSON.parse(data)
        this.startGame(ws, gameId, ships, indexPlayer)
        break
      default:
        ws.send(JSON.stringify({ error: 'Invalid message type' }))
    }
  }

  private registerPlayer(ws: WebSocket, player: Player) {
    ws.send(
      JSON.stringify({
        type: 'reg',
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

  private createRoom(ws: WebSocket, player: Player) {
    const room = new Room()
    room.addPlayer(player)
    this.rooms.set(room.id, {
      roomId: room.id,
      roomUsers: [
        {
          name: player.name,
          index: player.id,
        },
      ],
    })

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

      const game = new Game(player)
      this.games.set(game.idGame, game)

      room.roomUsers.forEach((user) => {
        const userSocket = Array.from(this.players.entries()).find(
          ([, p]) => p.id === user.index
        )?.[0]

        if (userSocket) {
          userSocket.send(
            JSON.stringify({ type: 'create_game', data: JSON.stringify(game) })
          )
        }
      })

      this.broadcastRoomsUpdate()
    }
  }

  private startGame(
    ws: WebSocket,
    gameId: string,
    ships: Ship[],
    indexPlayer: string
  ) {
    // const game = this.games.get(gameId)
    // if (game) {
    //   game.setShips(ships)
    // }
    this.players.forEach((player) => {
      if (player.id === indexPlayer) {
        ws.send(
          JSON.stringify({
            type: 'start_game',
            data: {
              ships,
              currentPlayerIndex: indexPlayer,
            },
            id: 0,
          })
        )
      }
    })
  }
}
