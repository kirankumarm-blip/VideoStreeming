import React, { useEffect, useRef } from 'react';

const Background3D = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Grid details for the 3D wave
    const rows = 28;
    const cols = 28;
    const spacing = 40; // Spacing in 3D space
    const points = [];

    // Floating assets (cap, play button, book, camera, spheres)
    const floatingAssets = [
      { type: 'cap', x: -420, origY: -220, z: -100, size: 55, phase: 0 },
      { type: 'play', x: -350, origY: 80, z: 200, size: 45, phase: Math.PI / 4 },
      { type: 'book', x: 420, origY: -200, z: -150, size: 55, phase: Math.PI / 2 },
      { type: 'camera', x: 380, origY: 180, z: 120, size: 45, phase: Math.PI * 0.75 },
      // Glowing spheres
      { type: 'sphere', x: -280, origY: 260, z: 300, size: 28, phase: 1.2 },
      { type: 'sphere', x: 280, origY: 280, z: 250, size: 22, phase: 2.5 },
      { type: 'sphere', x: -480, origY: -80, z: -50, size: 18, phase: 3.1 },
      { type: 'sphere', x: 460, origY: -60, z: 50, size: 24, phase: 0.8 },
      { type: 'sphere', x: -50, origY: -320, z: -200, size: 32, phase: 1.9 },
    ];

    // Camera values
    const focalLength = 350;
    let rotationX = 0.6; // Tilt
    let rotationY = 0.5; // Turn
    let time = 0;

    // Generate 3D grid points centered around origin
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        points.push({
          x: (c - cols / 2) * spacing,
          y: 0, // calculated dynamically in loop
          z: (r - rows / 2) * spacing,
          origX: (c - cols / 2) * spacing,
          origZ: (r - rows / 2) * spacing
        });
      }
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      // Normalize mouse coordinates to [-0.5, 0.5]
      mouseRef.current.targetX = (e.clientX / window.innerWidth) - 0.5;
      mouseRef.current.targetY = (e.clientY / window.innerHeight) - 0.5;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // Render loop
    const render = () => {
      time += 0.012;
      
      // Interpolate mouse coordinates for smooth lag effect
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      // Adjust camera rotation based on mouse coordinates
      const camRotX = rotationX + mouse.y * 0.4;
      const camRotY = rotationY + mouse.x * 0.5;

      const isLight = document.body.classList.contains('light-theme');
      
      // Clear background with soft gradient
      if (isLight) {
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, '#f1f0fa');
        bgGrad.addColorStop(1, '#f3f8fc');
        ctx.fillStyle = bgGrad;
      } else {
        ctx.fillStyle = '#0a0518'; // Dark deep violet
      }
      ctx.fillRect(0, 0, width, height);

      // Pre-calculate sin/cos values for rotation matrix
      const cosX = Math.cos(camRotX);
      const sinX = Math.sin(camRotX);
      const cosY = Math.cos(camRotY);
      const sinY = Math.sin(camRotY);

      const centerX = width / 2;
      const centerY = height / 2 + 50;

      // Update heights (3D sine wave) & project points
      const projected = points.map((p) => {
        // Double sine wave propagation
        const distance = Math.sqrt(p.origX * p.origX + p.origZ * p.origZ);
        const y = Math.sin(distance * 0.012 - time * 2) * 45 + Math.cos(p.origX * 0.005 + time) * 20;

        // Rotate Y-axis
        let x1 = p.origX * cosY - p.origZ * sinY;
        let z1 = p.origX * sinY + p.origZ * cosY;

        // Rotate X-axis
        let y2 = y * cosX - z1 * sinX;
        let z2 = y * sinX + z1 * cosX;

        // Push camera back in Z space
        const cameraZ = z2 + 600;

        if (cameraZ <= 0) return null;

        // Perspective Projection
        const scale = focalLength / cameraZ;
        return {
          x: x1 * scale + centerX,
          y: y2 * scale + centerY,
          z: cameraZ,
          opacity: Math.min(1, Math.max(0, 1 - cameraZ / 1100)) // Fade into distance
        };
      });

      // Draw Grid lines (more visible stroke)
      ctx.lineWidth = isLight ? 1.5 : 1.8;
      
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const p1 = projected[idx];
          if (!p1) continue;

          // Connect to right neighbor
          if (c < cols - 1) {
            const p2 = projected[idx + 1];
            if (p2) {
              const alpha = ((p1.opacity + p2.opacity) / 2) * 0.22;
              ctx.strokeStyle = isLight 
                ? `rgba(124, 58, 237, ${alpha * 2.2})` 
                : `rgba(139, 92, 246, ${alpha * 4.5})`; // Violet in light, Purple in dark
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }

          // Connect to bottom neighbor
          if (r < rows - 1) {
            const p3 = projected[idx + cols];
            if (p3) {
              const alpha = ((p1.opacity + p3.opacity) / 2) * 0.22;
              ctx.strokeStyle = isLight 
                ? `rgba(37, 99, 235, ${alpha * 2.2})` 
                : `rgba(139, 92, 246, ${alpha * 4.5})`; 
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p3.x, p3.y);
              ctx.stroke();
            }
          }

          // Draw grid intersection node dots
          if (r % 2 === 0 && c % 2 === 0) {
            const alpha = p1.opacity * 0.5;
            ctx.fillStyle = isLight 
              ? `rgba(236, 72, 153, ${alpha * 1.8})` 
              : `rgba(236, 72, 153, ${alpha * 2.8})`; // Pink
            ctx.beginPath();
            ctx.arc(p1.x, p1.y, 2.2 * p1.opacity, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw and animate floating 3D assets
      floatingAssets.forEach((p) => {
        // Soft floating animation on Y axis
        const currY = p.origY + Math.sin(time * 0.8 + p.phase) * 20;

        // Rotate Y-axis
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.x * sinY + p.z * cosY;

        // Rotate X-axis
        let y2 = currY * cosX - z1 * sinX;
        let z2 = currY * sinX + z1 * cosX;

        const cameraZ = z2 + 600;
        if (cameraZ <= 0) return;

        // Perspective projection
        const scale = focalLength / cameraZ;
        const projX = x1 * scale + centerX;
        const projY = y2 * scale + centerY;
        const size = p.size * scale;
        const alpha = Math.min(1, Math.max(0, 1 - cameraZ / 1100)) * (isLight ? 0.75 : 0.95);
        const rot = time * 0.4 + p.phase;

        ctx.save();
        
        // Setup shadow glow for 3D look
        ctx.shadowColor = isLight ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.45)';
        ctx.shadowBlur = 12 * scale;
        ctx.shadowOffsetY = 8 * scale;

        if (p.type === 'sphere') {
          // Glass sphere with radial specular highlights
          const specularGrad = ctx.createRadialGradient(
            projX - size * 0.3,
            projY - size * 0.3,
            size * 0.05,
            projX,
            projY,
            size
          );
          specularGrad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
          specularGrad.addColorStop(0.25, isLight ? 'rgba(168, 85, 247, 0.3)' : 'rgba(139, 92, 246, 0.5)');
          specularGrad.addColorStop(1, 'rgba(124, 58, 237, 0.02)');
          
          ctx.fillStyle = specularGrad;
          ctx.beginPath();
          ctx.arc(projX, projY, size, 0, Math.PI * 2);
          ctx.fill();
        } 
        else if (p.type === 'play') {
          // Play button (circle + rotated triangle inside)
          ctx.strokeStyle = isLight ? `rgba(124, 58, 237, ${alpha * 0.65})` : `rgba(168, 85, 247, ${alpha * 0.85})`;
          ctx.fillStyle = isLight ? `rgba(124, 58, 237, ${alpha * 0.08})` : `rgba(168, 85, 247, ${alpha * 0.18})`;
          ctx.lineWidth = 2 * scale;
          
          ctx.beginPath();
          ctx.arc(projX, projY, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Triangle inside
          ctx.fillStyle = isLight ? `rgba(124, 58, 237, ${alpha * 0.8})` : `rgba(168, 85, 247, ${alpha * 0.9})`;
          ctx.beginPath();
          const triSize = size * 0.45;
          ctx.moveTo(projX + triSize * Math.cos(rot), projY + triSize * Math.sin(rot));
          ctx.lineTo(projX + triSize * Math.cos(rot + (Math.PI * 2 / 3)), projY + triSize * Math.sin(rot + (Math.PI * 2 / 3)));
          ctx.lineTo(projX + triSize * Math.cos(rot - (Math.PI * 2 / 3)), projY + triSize * Math.sin(rot - (Math.PI * 2 / 3)));
          ctx.closePath();
          ctx.fill();
        } 
        else if (p.type === 'cap') {
          // Graduation Cap (mortarboard)
          ctx.strokeStyle = isLight ? `rgba(124, 58, 237, ${alpha * 0.65})` : `rgba(168, 85, 247, ${alpha * 0.85})`;
          ctx.fillStyle = isLight ? `rgba(124, 58, 237, ${alpha * 0.08})` : `rgba(168, 85, 247, ${alpha * 0.18})`;
          ctx.lineWidth = 1.8 * scale;

          // Diamond
          ctx.beginPath();
          ctx.moveTo(projX + size * 0.7 * Math.cos(rot), projY + size * 0.35 * Math.sin(rot));
          ctx.lineTo(projX + size * 0.7 * Math.cos(rot + Math.PI/2), projY + size * 0.35 * Math.sin(rot + Math.PI/2));
          ctx.lineTo(projX + size * 0.7 * Math.cos(rot + Math.PI), projY + size * 0.35 * Math.sin(rot + Math.PI));
          ctx.lineTo(projX + size * 0.7 * Math.cos(rot - Math.PI/2), projY + size * 0.35 * Math.sin(rot - Math.PI/2));
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Cap base
          ctx.beginPath();
          ctx.moveTo(projX - size * 0.35, projY + size * 0.1);
          ctx.quadraticCurveTo(projX, projY + size * 0.35, projX + size * 0.35, projY + size * 0.1);
          ctx.lineTo(projX + size * 0.35, projY + size * 0.45);
          ctx.quadraticCurveTo(projX, projY + size * 0.7, projX - size * 0.35, projY + size * 0.45);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Tassel
          ctx.beginPath();
          ctx.moveTo(projX, projY);
          ctx.lineTo(projX - size * 0.55, projY + size * 0.25);
          ctx.lineTo(projX - size * 0.55, projY + size * 0.55);
          ctx.stroke();
        } 
        else if (p.type === 'book') {
          // Open Book
          ctx.strokeStyle = isLight ? `rgba(124, 58, 237, ${alpha * 0.65})` : `rgba(168, 85, 247, ${alpha * 0.85})`;
          ctx.fillStyle = isLight ? `rgba(124, 58, 237, ${alpha * 0.08})` : `rgba(168, 85, 247, ${alpha * 0.18})`;
          ctx.lineWidth = 1.8 * scale;

          ctx.beginPath();
          // Left page
          ctx.moveTo(projX, projY + size * 0.35);
          ctx.bezierCurveTo(projX - size * 0.25, projY + size * 0.05, projX - size * 0.55, projY + size * 0.15, projX - size * 0.75, projY - size * 0.05);
          ctx.lineTo(projX - size * 0.75, projY - size * 0.55);
          ctx.bezierCurveTo(projX - size * 0.55, projY - size * 0.35, projX - size * 0.25, projY - size * 0.45, projX, projY - size * 0.15);
          // Right page
          ctx.bezierCurveTo(projX + size * 0.25, projY - size * 0.45, projX + size * 0.55, projY - size * 0.35, projX + size * 0.75, projY - size * 0.55);
          ctx.lineTo(projX + size * 0.75, projY - size * 0.05);
          ctx.bezierCurveTo(projX + size * 0.55, projY + size * 0.15, projX + size * 0.25, projY + size * 0.05, projX, projY + size * 0.35);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Spine
          ctx.beginPath();
          ctx.moveTo(projX, projY - size * 0.15);
          ctx.lineTo(projX, projY + size * 0.35);
          ctx.stroke();
        } 
        else if (p.type === 'camera') {
          // Video Camera
          ctx.strokeStyle = isLight ? `rgba(124, 58, 237, ${alpha * 0.65})` : `rgba(168, 85, 247, ${alpha * 0.85})`;
          ctx.fillStyle = isLight ? `rgba(124, 58, 237, ${alpha * 0.08})` : `rgba(168, 85, 247, ${alpha * 0.18})`;
          ctx.lineWidth = 1.8 * scale;

          // Main body rect
          ctx.beginPath();
          ctx.rect(projX - size * 0.5, projY - size * 0.35, size * 0.8, size * 0.7);
          ctx.fill();
          ctx.stroke();

          // Lens piece
          ctx.beginPath();
          ctx.moveTo(projX + size * 0.3, projY - size * 0.1);
          ctx.lineTo(projX + size * 0.7, projY - size * 0.3);
          ctx.lineTo(projX + size * 0.7, projY + size * 0.3);
          ctx.lineTo(projX + size * 0.3, projY + size * 0.1);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        ctx.restore();
      });

      // Add a soft center glow blob in the background
      const grad = ctx.createRadialGradient(centerX, centerY - 50, 50, centerX, centerY, width * 0.4);
      if (isLight) {
        grad.addColorStop(0, 'rgba(37, 99, 235, 0.06)');
        grad.addColorStop(0.5, 'rgba(124, 58, 237, 0.03)');
        grad.addColorStop(1, 'rgba(248, 250, 252, 0)');
      } else {
        grad.addColorStop(0, 'rgba(139, 92, 246, 0.28)');
        grad.addColorStop(0.5, 'rgba(229, 9, 20, 0.14)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block'
      }}
    />
  );
};

export default Background3D;
