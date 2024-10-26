import * as fs from 'fs'
import * as path from 'path'
import * as http from 'http'
import { GameServer } from '../game/GameServer'
import { WebSocketServer } from 'ws'
import { Room } from '../types'
import { handleCreateRoom } from '../websocket/room'
import { createPlayer } from '../websocket/player_store'

export const httpServer = http.createServer(function (req, res) {
  const __dirname = path.resolve(path.dirname(''))
  const file_path =
    __dirname + (req.url === '/' ? '/front/index.html' : '/front' + req.url)
  fs.readFile(file_path, function (err, data) {
    if (err) {
      res.writeHead(404)
      res.end(JSON.stringify(err))
      return
    }
    res.writeHead(200)
    res.end(data)
  })
})

const gameServer = new GameServer(3000)

// const wsServer = new WebSocketServer({ port: 3000, clientTracking: true })
// const rooms: Room[] = []
// let roomIdCounter = 1
// let playerIdCounter = 1

// wsServer.on('connection', (ws: WebSocket) => {
//   ws.onmessage = async (event) => {
//     const message = await JSON.parse(event.data.toString())
//     console.log('message', message)

//     try {
//       switch (message.type) {
//         case 'reg':
//           const { name, password } = JSON.parse(message.data)
//           const newPlayer = createPlayer(name, password)
//           const response = newPlayer
//             ? {
//                 type: 'reg',
//                 data: JSON.stringify({
//                   name,
//                   index: Date.now().toString(),
//                   error: false,
//                   errorText: '',
//                 }),
//                 id: 0,
//               }
//             : {
//                 type: 'reg',
//                 data: JSON.stringify({
//                   name,
//                   index: Date.now().toString(),
//                   error: true,
//                   errorText: 'Username already exists',
//                 }),
//                 id: 0,
//               }
//           ws.send(JSON.stringify(response))

//           break
//         // case 'create_room':
//         //   console.log('hello', name)
//         //   handleCreateRoom(
//         //     wsServer,
//         //     ws,
//         //     name,
//         //     rooms,
//         //     roomIdCounter,
//         //     playerIdCounter
//         //   )
//         //   break
//         default:
//           console.log('Unknown response:', message)
//       }
//     } catch (error) {
//       console.error('Error parsing message:', error)
//     }
//   }

//   ws.onerror = (error) => {
//     console.error('WebSocket error:', error)
//   }

//   ws.onclose = () => {
//     console.log('Client disconnected')
//   }
// })
