export type RoomType = {
  roomId: string
  roomUsers: RoomUser[]
}

type RoomUser = {
  name: string
  index: string
}
