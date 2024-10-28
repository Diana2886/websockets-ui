export interface ShipInterface {
  position: {
    x: number
    y: number
  }
  direction: boolean
  length: number
  type: 'small' | 'medium' | 'large' | 'huge'
}
