'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PatternLockProps {
  name: string;
  className?: string;
}

const GRID_SIZE = 3;
const DOT_RADIUS = 10;
const ACTIVE_DOT_RADIUS = 12;
const PADDING = 40;
const LINE_WIDTH = 4;

export function PatternLock({ name, className }: PatternLockProps) {
  const { setValue, watch } = useFormContext();
  const pattern = watch(name, []);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dots, setDots] = useState<{ x: number; y: number; index: number }[]>([]);
  const [canvasSize, setCanvasSize] = useState(300);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width } = entries[0].contentRect;
        setCanvasSize(Math.min(width, 300));
      }
    });

    const parent = canvasRef.current?.parentElement;
    if (parent) {
      resizeObserver.observe(parent);
    }
    
    return () => {
      if (parent) {
        resizeObserver.unobserve(parent);
      }
    };
  }, []);

  useEffect(() => {
    const step = (canvasSize - PADDING * 2) / (GRID_SIZE - 1);
    const newDots = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        newDots.push({
          x: PADDING + j * step,
          y: PADDING + i * step,
          index: i * GRID_SIZE + j,
        });
      }
    }
    setDots(newDots);
  }, [canvasSize]);
  
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Use HSL values from theme
    const primaryColor = 'hsl(228 44% 27%)'; // --primary
    const accentColor = 'hsl(268 31% 44%)'; // --accent
    const mutedColor = 'hsl(240 5% 82%)'; // --border

    // Draw lines
    if (pattern.length > 1) {
      ctx.beginPath();
      ctx.moveTo(dots[pattern[0]].x, dots[pattern[0]].y);
      for (let i = 1; i < pattern.length; i++) {
        ctx.lineTo(dots[pattern[i]].x, dots[pattern[i]].y);
      }
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = LINE_WIDTH;
      ctx.stroke();
    }

    // Draw dots
    dots.forEach(dot => {
      ctx.beginPath();
      const isSelected = pattern.includes(dot.index);
      ctx.arc(dot.x, dot.y, isSelected ? ACTIVE_DOT_RADIUS : DOT_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? primaryColor : mutedColor;
      ctx.fill();
    });
  };

  useEffect(() => {
    draw();
  }, [pattern, dots]);

  const getDotFromCoordinates = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;

    return dots.find(dot => {
      const distance = Math.sqrt((dot.x - canvasX) ** 2 + (dot.y - canvasY) ** 2);
      return distance < ACTIVE_DOT_RADIUS * 1.5;
    });
  };

  const handleInteractionStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = 'touches' in e ? e.touches[0] : e;
    const dot = getDotFromCoordinates(pos.clientX, pos.clientY);
    if (dot && !pattern.includes(dot.index)) {
      setValue(name, [dot.index], { shouldValidate: true });
    } else {
      setValue(name, [], { shouldValidate: true });
    }
  };

  const handleInteractionMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = 'touches' in e ? e.touches[0] : e;
    const dot = getDotFromCoordinates(pos.clientX, pos.clientY);
    if (dot && !pattern.includes(dot.index)) {
      setValue(name, [...pattern, dot.index], { shouldValidate: true });
    }
  };

  const handleInteractionEnd = () => {
    setIsDrawing(false);
  };
  
  const clearPattern = () => {
    setValue(name, [], { shouldValidate: true });
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        onMouseDown={handleInteractionStart}
        onMouseMove={handleInteractionMove}
        onMouseUp={handleInteractionEnd}
        onMouseLeave={handleInteractionEnd}
        onTouchStart={handleInteractionStart}
        onTouchMove={handleInteractionMove}
        onTouchEnd={handleInteractionEnd}
        className="cursor-pointer rounded-lg border bg-card"
      />
      <Button type="button" variant="outline" size="sm" onClick={clearPattern} disabled={pattern.length === 0}>
        Clear Pattern
      </Button>
    </div>
  );
}
