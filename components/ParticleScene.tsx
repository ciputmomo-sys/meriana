
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { HandData, MorphTarget } from '../types';

interface ParticleSceneProps {
  handData: HandData | null;
  onGestureChange: (active: boolean) => void;
}

const ParticleScene: React.FC<ParticleSceneProps> = ({ handData, onGestureChange }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    particles: THREE.Points;
    geometry: THREE.BufferGeometry;
    heartPositions: Float32Array;
    namePositions: Float32Array;
    currentVelocities: Float32Array;
    targetPositions: Float32Array;
    isExploding: boolean;
    explosionTime: number;
    morphProgress: number;
    morphTarget: MorphTarget;
  } | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // --- Setup Three.js ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const count = 6000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    // --- Create Shapes ---
    
    // 1. Heart Shape logic
    const heartPositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      // Parametric 3D Heart (Heart-shaped shell)
      // x = 16 sin^3 t
      // y = 13 cos t - 5 cos 2t - 2 cos 3t - cos 4t
      // z = range [-2, 2]
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const z = (Math.random() - 0.5) * 8;
      
      const scale = 0.25;
      heartPositions[i * 3] = x * scale;
      heartPositions[i * 3 + 1] = y * scale;
      heartPositions[i * 3 + 2] = z;

      // Initial positions
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;

      // Colors: Shades of Pink/Rose/Gold
      const mix = Math.random();
      colors[i * 3] = 1.0; // R
      colors[i * 3 + 1] = mix * 0.4 + 0.2; // G
      colors[i * 3 + 2] = mix * 0.6 + 0.4; // B

      sizes[i] = Math.random() * 2 + 1;
    }

    // 2. Name "Meriana" sampling
    const namePositions = new Float32Array(count * 3);
    const nameCanvas = document.createElement('canvas');
    nameCanvas.width = 1000;
    nameCanvas.height = 300;
    const ctx = nameCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.font = 'bold 180px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('MERIANA', 500, 150);
      
      const imgData = ctx.getImageData(0, 0, 1000, 300).data;
      const sampledPoints: { x: number, y: number }[] = [];
      for (let y = 0; y < 300; y += 2) {
        for (let x = 0; x < 1000; x += 2) {
          if (imgData[(y * 1000 + x) * 4] > 128) {
            sampledPoints.push({ x: (x - 500) * 0.025, y: (150 - y) * 0.025 });
          }
        }
      }

      for (let i = 0; i < count; i++) {
        const point = sampledPoints[Math.floor(Math.random() * sampledPoints.length)];
        namePositions[i * 3] = point.x;
        namePositions[i * 3 + 1] = point.y;
        namePositions[i * 3 + 2] = (Math.random() - 0.5) * 2;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Material with custom small heart sprite shader would be ideal, 
    // but for CDN focus we'll use additive glow effect with PointsMaterial
    const textureLoader = new THREE.TextureLoader();
    // Using a circular sprite with falloff as a glow
    const sprite = textureLoader.load('https://threejs.org/examples/textures/sprites/circle.png');

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: sprite,
      opacity: 0.8
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Initial State
    sceneRef.current = {
      scene, camera, renderer, particles, geometry,
      heartPositions, namePositions, 
      currentVelocities: velocities,
      targetPositions: heartPositions,
      isExploding: false,
      explosionTime: 0,
      morphProgress: 0,
      morphTarget: MorphTarget.HEART
    };

    // --- Animation Loop ---
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      if (!sceneRef.current) return;

      const { 
        geometry, targetPositions, currentVelocities, 
        isExploding, explosionTime, morphTarget 
      } = sceneRef.current;
      
      const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
      const sizeAttr = geometry.getAttribute('size') as THREE.BufferAttribute;

      // Handle Auto-Morphing
      if (!isExploding) {
        sceneRef.current.morphProgress += 0.002;
        if (sceneRef.current.morphProgress >= 1.0) {
          sceneRef.current.morphProgress = 0;
          sceneRef.current.morphTarget = morphTarget === MorphTarget.HEART ? MorphTarget.NAME : MorphTarget.HEART;
          sceneRef.current.targetPositions = sceneRef.current.morphTarget === MorphTarget.HEART ? heartPositions : namePositions;
        }
      }

      // Hand influence
      const palmPos = handData ? handData.palmPosition : { x: 0, y: 0, z: 0 };
      
      // Update Particles
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        let px = posAttr.array[idx];
        let py = posAttr.array[idx + 1];
        let pz = posAttr.array[idx + 2];

        if (isExploding) {
          // Explosion physics
          px += currentVelocities[idx];
          py += currentVelocities[idx + 1];
          pz += currentVelocities[idx + 2];
          
          // Apply damping
          currentVelocities[idx] *= 0.94;
          currentVelocities[idx + 1] *= 0.94;
          currentVelocities[idx + 2] *= 0.94;

          // Pulse sizing during explosion
          sizeAttr.array[i] = Math.sin(Date.now() * 0.01) * 2 + 3;
        } else {
          // Normal morphing/floating behavior
          const tx = targetPositions[idx] + palmPos.x;
          const ty = targetPositions[idx + 1] + palmPos.y;
          const tz = targetPositions[idx + 2] + palmPos.z;

          // Lerp towards target
          px += (tx - px) * 0.05;
          py += (ty - py) * 0.05;
          pz += (tz - pz) * 0.05;

          // Subtle noise/float
          px += Math.sin(Date.now() * 0.001 + i) * 0.01;
          py += Math.cos(Date.now() * 0.0012 + i) * 0.01;
          
          sizeAttr.array[i] = sizes[i]; // Reset size
        }

        posAttr.array[idx] = px;
        posAttr.array[idx + 1] = py;
        posAttr.array[idx + 2] = pz;
      }

      posAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;

      // Group rotation
      particles.rotation.y += 0.005;
      particles.rotation.z = Math.sin(Date.now() * 0.0005) * 0.1;

      // Handle explosion cooldown
      if (isExploding && Date.now() - explosionTime > 1500) {
        sceneRef.current.isExploding = false;
        onGestureChange(false);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  // Update logic on hand gesture
  useEffect(() => {
    if (!sceneRef.current || !handData) return;

    if (handData.isPinching && !sceneRef.current.isExploding) {
      // Trigger Explosion!
      sceneRef.current.isExploding = true;
      sceneRef.current.explosionTime = Date.now();
      onGestureChange(true);

      const count = 6000;
      const vels = sceneRef.current.currentVelocities;
      const palm = handData.palmPosition;
      
      // Increase intensity based on hand velocity
      const intensity = 0.5 + handData.velocity * 5;

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        // Direction from palm
        const dx = (sceneRef.current.geometry.getAttribute('position').array[idx] - palm.x);
        const dy = (sceneRef.current.geometry.getAttribute('position').array[idx + 1] - palm.y);
        const dz = (sceneRef.current.geometry.getAttribute('position').array[idx + 2] - palm.z);
        
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        
        // Outward burst
        vels[idx] = (dx / dist) * intensity * (Math.random() + 0.5);
        vels[idx + 1] = (dy / dist) * intensity * (Math.random() + 0.5);
        vels[idx + 2] = (dz / dist) * intensity * (Math.random() + 0.5);
      }
    }
  }, [handData]);

  return <div ref={mountRef} className="w-full h-full cursor-none" />;
};

export default ParticleScene;
