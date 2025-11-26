import { Point, Obstacle, RectObstacle, CircleObstacle } from '../types';

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pointInRect(p: Point, rect: RectObstacle): boolean {
  return p.x >= rect.x &&
         p.x <= rect.x + rect.width &&
         p.y >= rect.y &&
         p.y <= rect.y + rect.height;
}

function orientation(a: Point, b: Point, c: Point): number {
  const val = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(val) < 1e-9) return 0;
  return val > 0 ? 1 : 2;
}

function onSegment(a: Point, b: Point, c: Point): boolean {
  return Math.min(a.x, c.x) <= b.x && b.x <= Math.max(a.x, c.x) &&
         Math.min(a.y, c.y) <= b.y && b.y <= Math.max(a.y, c.y);
}

export function segmentsIntersect(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
  const o1 = orientation(p1, p2, q1);
  const o2 = orientation(p1, p2, q2);
  const o3 = orientation(q1, q2, p1);
  const o4 = orientation(q1, q2, p2);

  if (o1 !== o2 && o3 !== o4) return true;

  return (o1 === 0 && onSegment(p1, q1, p2)) ||
         (o2 === 0 && onSegment(p1, q2, p2)) ||
         (o3 === 0 && onSegment(q1, p1, q2)) ||
         (o4 === 0 && onSegment(q1, p2, q2));
}

export function segmentIntersectsRect(p1: Point, p2: Point, rect: RectObstacle): boolean {
  if (pointInRect(p1, rect) || pointInRect(p2, rect)) return true;

  const edges: [Point, Point][] = [
    [{ x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y }],
    [{ x: rect.x + rect.width, y: rect.y }, { x: rect.x + rect.width, y: rect.y + rect.height }],
    [{ x: rect.x + rect.width, y: rect.y + rect.height }, { x: rect.x, y: rect.y + rect.height }],
    [{ x: rect.x, y: rect.y + rect.height }, { x: rect.x, y: rect.y }],
  ];

  return edges.some(([e1, e2]) => segmentsIntersect(p1, p2, e1, e2));
}

export function segmentIntersectsCircle(p1: Point, p2: Point, circle: CircleObstacle): boolean {
  const { center, radius } = circle;
  const vx = p2.x - p1.x;
  const vy = p2.y - p1.y;
  const wx = center.x - p1.x;
  const wy = center.y - p1.y;

  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : (wx * vx + wy * vy) / len2;
  const tClamped = Math.max(0, Math.min(1, t));

  const closest: Point = { x: p1.x + tClamped * vx, y: p1.y + tClamped * vy };
  return distance(closest, center) <= radius;
}

export function segmentHitsObstacle(p1: Point, p2: Point, ob: Obstacle): boolean {
  return ob.type === 'rect'
    ? segmentIntersectsRect(p1, p2, ob)
    : segmentIntersectsCircle(p1, p2, ob);
}
