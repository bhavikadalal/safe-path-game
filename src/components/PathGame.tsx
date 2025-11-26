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

function generateObstacles(): Obstacle[] {
  const rects: Obstacle[] = Array.from({ length: 4 }, () => ({
    type: 'rect',
    x: Math.random() * 600 + 50,
    y: Math.random() * 400 + 20,
    width: 100 + Math.random() * 60,
    height: 30 + Math.random() * 20,
  }));

  const circles: Obstacle[] = Array.from({ length: 4 }, () => ({
    type: 'circle',
    center: {
      x: Math.random() * 700 + 30,
      y: Math.random() * 400 + 30,
    },
    radius: 30 + Math.random() * 30,
  }));

  return [...rects, ...circles];
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

  // Pointer events give consistent behavior across mouse/trackpad/touch
  function toCanvasPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = canvasRef.current!.getBoundingClientRect();

    // If CSS scales the canvas, adjust coordinates accordingly
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    return { x, y };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const p = toCanvasPoint(e);
    const distA = distance(p, A);

    // Must start inside A
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
      // release capture so pointerup is not required to stop
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
