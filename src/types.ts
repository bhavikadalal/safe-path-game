export type Point = { x: number; y: number };

export type CircleObstacle = {
  type: 'circle';
  center: Point;
  radius: number;
};

export type RectObstacle = {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Obstacle = CircleObstacle | RectObstacle;
