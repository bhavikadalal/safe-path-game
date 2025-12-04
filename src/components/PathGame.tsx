import React, { useEffect, useRef, useState } from 'react';
import { Point, Obstacle } from '../types';
import { segmentHitsObstacle, distance } from '../utils/geometry';
import '../styles.css';

const CANVAS_W = 800;
const CANVAS_H = 500;
const STROKE = 4;
const A_RADIUS = 14;
const B_RADIUS = 14;

const A: Point = { x: 80, y: 420 };
const B: Point = { x: 720, y: 80 };

type Status = 'idle' | 'drawing' | 'hit' | 'won';

// --- Overlap helpers ---
function rectOverlapsCircle(rect: { x: number; y: number; width: number; height: number }, center: Point, radius: number) {
  const closestX = Math.max(rect.x, Math.min(center.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(center.y, rect.y + rect.height));
  const dx = center.x - closestX;
  const dy = center.y - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

function rectsOverlap(r1: { x: number; y: number; width: number; height: number }, r2: { x: number; y: number; width: number; height: number }) {
  return !(
    r1.x + r1.width < r2.x ||
    r2.x + r2.width < r1.x ||
    r1.y + r1.height < r2.y ||
    r2.y + r2.height < r1.y
  );
}

function circlesOverlap(c1: { center: Point; radius: number }, c2: { center: Point; radius: number }) {
  return distance(c1.center, c2.center) <= c1.radius + c2.radius;
}

function rectCircleOverlap(rect: { x: number; y: number; width: number; height: number }, circ: { center: Point; radius: number }) {
  const closestX = Math.max(rect.x, Math.min(circ.center.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circ.center.y, rect.y + rect.height));
  const dx = circ.center.x - closestX;
  const dy = circ.center.y - closestY;
  return dx * dx + dy * dy <= circ.radius * circ.radius;
}

function circleOverlapsCircle(circ: { center: Point; radius: number }, other: { center: Point; radius: number }) {
  return distance(circ.center, other.center) <= circ.radius + other.radius;
}

// --- Obstacle generator ---
function generateObstacles(): Obstacle[] {
  const obstacles: Obstacle[] = [];

  // Rectangles
  while (obstacles.filter(o => o.type === 'rect').length < 4) {
    const rect = {
      type: 'rect' as const,
      x: Math.random() * 600 + 50,
      y: Math.random() * 400 + 20,
      width: 100 + Math.random() * 60,
      height: 30 + Math.random() * 20,
    };

    // Check against A/B
    if (rectOverlapsCircle(rect, A, A_RADIUS + 20) || rectOverlapsCircle(rect, B, B_RADIUS + 20)) continue;

    // Check against existing obstacles
    const overlap = obstacles.some(ob =>
      ob.type === 'rect'
        ? rectsOverlap(rect, ob as any)
        : rectCircleOverlap(rect, ob as any)
    );
    if (!overlap) obstacles.push(rect);
  }

  // Circles
  while (obstacles.filter(o => o.type === 'circle').length < 4) {
    const circ = {
      type: 'circle' as const,
      center: { x: Math.random() * 700 + 30, y: Math.random() * 400 + 30 },
      radius: 30 + Math.random() * 30,
    };

    // Check against A/B
    if (circleOverlapsCircle(circ, { center: A, radius: A_RADIUS + 20 }) ||
        circleOverlapsCircle(circ, { center: B, radius: B_RADIUS + 20 })) continue;

    // Check against existing obstacles
    const overlap = obstacles.some(ob =>
      ob.type === 'circle'
        ? circlesOverlap(circ, ob as any)
        : rectCircleOverlap(ob as any, circ)
    );
    if (!overlap) obstacles.push(circ);
  }

  return obstacles;
}

export default function PathGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [path, setPath] = useState<Point[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [popup, setPopup] = useState<string | null>(null);
  const [obstacles, setObstacles] = useState<Obstacle[]>(generateObstacles());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Obstacles
    ctx.fillStyle = '#f05d5e';
    ctx.strokeStyle = '#444';
    obstacles.forEach(ob => {
      if (ob.type === 'rect') {
        ctx.fillRect(ob.x, ob.y, ob.width, ob.height);
        ctx.strokeRect(ob.x, ob.y, ob.width, ob.height);
      } else {
        ctx.beginPath();
        ctx.arc(ob.center.x, ob.center.y, ob.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });

    // A
    ctx.fillStyle = '#00875a';
    ctx.beginPath();
    ctx.arc(A.x, A.y, A_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('A', A.x, A.y);

    // B
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.arc(B.x, B.y, B_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('B', B.x, B.y);

    // Path
    if (path.length > 1) {
      ctx.strokeStyle = status === 'hit' ? '#ff2e63' : '#111827';
      ctx.lineWidth = STROKE;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
    }
  }, [path, status, obstacles]);

  function toCanvasPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { x, y };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const p = toCanvasPoint(e);
    const distA = distance(p, A);
    if (distA <= A_RADIUS + 4) {
      canvasRef.current?.setPointerCapture(e.pointerId);
      setStatus('drawing');
      setPath([p]);
      setPopup(null);
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (status !== 'drawing') return;
    const p = toCanvasPoint(e);
    const prev = path[path.length - 1];
    const newPath = [...path, p];
    setPath(newPath);

    const hitObstacle = obstacles.some(ob => segmentHitsObstacle(prev, p, ob));
    if (hitObstacle) {
      setStatus('hit');
      setPopup('💥 Game Over! You hit an obstacle.');
      canvasRef.current?.releasePointerCapture(e.pointerId);
      return;
    }

    if (distance(p, B) <= B_RADIUS) {
      setStatus('won');
      setPopup('🎉 Congratulations! You reached B safely.');
      canvasRef.current?.releasePointerCapture(e.pointerId);
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (status === 'drawing') {
      setStatus('idle');
      canvasRef.current?.releasePointerCapture(e.pointerId);
    }
  }

  function reset() {
    setPath([]);
    setStatus('idle');
    setPopup(null);
    setObstacles(generateObstacles());
  }



  return (
    <div className="container">
      <div className="controls">
        <button className="btn" onClick={reset}>Reset</button>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />

      {popup && <div className="popup">{popup}</div>}
      <p className="hint">Click inside A to start, reach B without hitting obstacles.</p>
    </div>
  );
}
