
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface HandData {
  palmPosition: Point3D;
  indexTip: Point3D;
  thumbTip: Point3D;
  velocity: number;
  pinchDistance: number;
  isPinching: boolean;
}

export enum MorphTarget {
  HEART = 'HEART',
  NAME = 'NAME'
}
