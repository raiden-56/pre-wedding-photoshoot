"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";

/**
 * A single purposeful WebGL moment: a floating picture frame that turns to face
 * the viewer and pushes in until the photograph fills the screen. Scroll
 * progress (0–1) is passed in through a ref so React never re-renders per frame.
 */
function Frame({ src, progress, aspect }: { src: string; progress: MutableRefObject<number>; aspect: number }) {
  const group = useRef<THREE.Group>(null);
  const texture = useLoader(THREE.TextureLoader, src);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const pointer = useThree((s) => s.pointer);
  const camera = useThree((s) => s.camera);

  const w = 2.4;
  const h = w / aspect;
  const border = 0.09;
  const mat = 0.16;

  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2b2926", roughness: 0.55, metalness: 0.25 }), []);
  const matMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#F7F4EF", roughness: 0.95 }), []);

  useFrame((state, dt) => {
    const p = THREE.MathUtils.smoothstep(progress.current, 0, 1);
    const t = state.clock.elapsedTime;
    if (!group.current) return;
    const targetRotY = THREE.MathUtils.lerp(-0.55, 0, p) + pointer.x * 0.12 * (1 - p);
    const targetRotX = THREE.MathUtils.lerp(0.18, 0, p) - pointer.y * 0.08 * (1 - p);
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, targetRotY, 4, dt);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, targetRotX, 4, dt);
    group.current.rotation.z = THREE.MathUtils.lerp(0.04, 0, p) + Math.sin(t * 0.6) * 0.01 * (1 - p);
    group.current.position.y = Math.sin(t * 0.8) * 0.06 * (1 - p);
    // push in: fit the photo height to the viewport by the end
    const fov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
    const fillZ = h / 2 / Math.tan(fov / 2);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, THREE.MathUtils.lerp(6.2, fillZ * 0.98, p), 5, dt);
  });

  const outerW = w + mat * 2 + border * 2;
  const outerH = h + mat * 2 + border * 2;
  return (
    <group ref={group}>
      {/* moulding */}
      <mesh position={[0, outerH / 2 - border / 2, 0]} material={frameMat}>
        <boxGeometry args={[outerW, border, 0.14]} />
      </mesh>
      <mesh position={[0, -outerH / 2 + border / 2, 0]} material={frameMat}>
        <boxGeometry args={[outerW, border, 0.14]} />
      </mesh>
      <mesh position={[-outerW / 2 + border / 2, 0, 0]} material={frameMat}>
        <boxGeometry args={[border, outerH, 0.14]} />
      </mesh>
      <mesh position={[outerW / 2 - border / 2, 0, 0]} material={frameMat}>
        <boxGeometry args={[border, outerH, 0.14]} />
      </mesh>
      {/* mount */}
      <mesh position={[0, 0, -0.02]} material={matMat}>
        <planeGeometry args={[w + mat * 2, h + mat * 2]} />
      </mesh>
      {/* photograph */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function FrameScene({ src, aspect, progress }: { src: string; aspect: number; progress: MutableRefObject<number> }) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 6.2], fov: 35 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}>
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} color="#fff3e2" />
      <directionalLight position={[-4, -2, 2]} intensity={0.4} color="#d9c3a5" />
      <Frame src={src} progress={progress} aspect={aspect} />
    </Canvas>
  );
}
