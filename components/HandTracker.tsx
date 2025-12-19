
import React, { useEffect, useRef } from 'react';
import { HandData } from '../types';

interface HandTrackerProps {
  onHandUpdate: (data: HandData | null) => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onHandUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPalmPos = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    // Load MediaPipe Hands scripts from CDN
    const scripts = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'
    ];

    let hands: any;
    let camera: any;

    const initMediaPipe = async () => {
      // @ts-ignore
      hands = new window.Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      hands.onResults((results: any) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          
          // Landmarks of interest
          const thumbTip = landmarks[4];
          const indexTip = landmarks[8];
          const palmBase = landmarks[0];
          const middleBase = landmarks[9];

          // Calculate distance for pinch
          const dx = thumbTip.x - indexTip.x;
          const dy = thumbTip.y - indexTip.y;
          const dz = thumbTip.z - indexTip.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          // Calculate palm center
          const palmX = (palmBase.x + middleBase.x) / 2;
          const palmY = (palmBase.y + middleBase.y) / 2;
          const palmZ = (palmBase.z + middleBase.z) / 2;

          // Velocity estimation
          let velocity = 0;
          if (lastPalmPos.current) {
            const vx = palmX - lastPalmPos.current.x;
            const vy = palmY - lastPalmPos.current.y;
            velocity = Math.sqrt(vx * vx + vy * vy);
          }
          lastPalmPos.current = { x: palmX, y: palmY };

          // Convert to -1 to 1 space for Three.js (approximate)
          // Video coordinates are 0-1 from top-left. Three.js is -X to X from center.
          onHandUpdate({
            palmPosition: { x: (palmX - 0.5) * -15, y: (palmY - 0.5) * -10, z: palmZ * 5 },
            indexTip: { x: (indexTip.x - 0.5) * -15, y: (indexTip.y - 0.5) * -10, z: indexTip.z * 5 },
            thumbTip: { x: (thumbTip.x - 0.5) * -15, y: (thumbTip.y - 0.5) * -10, z: thumbTip.z * 5 },
            pinchDistance: dist,
            velocity: velocity,
            isPinching: dist < 0.05
          });
        } else {
          onHandUpdate(null);
          lastPalmPos.current = null;
        }
      });

      if (videoRef.current) {
        // @ts-ignore
        camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await hands.send({ image: videoRef.current });
            }
          },
          width: 320,
          height: 240
        });
        camera.start();
      }
    };

    // Load scripts sequentially
    const loadScript = (src: string) => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        document.head.appendChild(script);
      });
    };

    const loadAll = async () => {
      for (const src of scripts) {
        await loadScript(src);
      }
      initMediaPipe();
    };

    loadAll();

    return () => {
      if (camera) camera.stop();
      if (hands) hands.close();
    };
  }, []);

  return (
    <div className="relative border-2 border-pink-500/20 rounded-xl overflow-hidden shadow-2xl shadow-pink-500/10">
      <video
        ref={videoRef}
        className="transform scale-x-[-1] rounded-lg"
        width="240"
        height="180"
        autoPlay
        playsInline
        muted
      />
    </div>
  );
};

export default HandTracker;
