import React from "react";
import { Canvas } from "@react-three/fiber";
import { Float, RoundedBox } from "@react-three/drei";
import { useReducedMotion } from "motion/react";

function isWebGLAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
    );
  } catch {
    return false;
  }
}

function HeroFallback() {
  return (
    <div className="relative size-full overflow-hidden" aria-hidden>
      <div className="clay absolute -left-6 top-8 size-36 rounded-full" style={{ ["--clay" as string]: "#7058F5", opacity: 0.85 }} />
      <div className="clay absolute right-6 top-10 size-28 rounded-full" style={{ ["--clay" as string]: "#FFC857", opacity: 0.85 }} />
      <div className="clay absolute bottom-12 right-12 size-36 rounded-3xl" style={{ ["--clay" as string]: "#3DCFAE", opacity: 0.85 }} />
      <div className="clay absolute bottom-8 left-8 size-20 rounded-full" style={{ ["--clay" as string]: "#FF7890", opacity: 0.85 }} />
      <div className="clay absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ ["--clay" as string]: "#4285FF", opacity: 0.85 }} />
    </div>
  );
}

class CanvasErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return <HeroFallback />;
    return this.props.children;
  }
}

/** Slow, soft clay shapes — the only ambient motion on the site. */
function Clay({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />;
}

export default function Hero3D() {
  const reduce = useReducedMotion();
  const speed = reduce ? 0 : 1;

  if (!isWebGLAvailable()) {
    return <HeroFallback />;
  }

  return (
    <CanvasErrorBoundary>
      <Canvas camera={{ position: [0, 0, 7], fov: 42 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }} aria-hidden>
        <ambientLight intensity={1.1} />
        <directionalLight position={[4, 6, 5]} intensity={1.6} />
        <directionalLight position={[-5, -2, 2]} intensity={0.5} color="#c9bfff" />
        <Float speed={1.2 * speed} rotationIntensity={0.6 * speed} floatIntensity={1 * speed}>
          <mesh position={[-1.4, 0.9, 0]}>
            <sphereGeometry args={[1.05, 64, 64]} />
            <Clay color="#7058F5" />
          </mesh>
        </Float>
        <Float speed={1.6 * speed} rotationIntensity={1 * speed} floatIntensity={1.4 * speed}>
          <mesh position={[1.5, 1.3, -0.6]} rotation={[0.6, 0.3, 0]}>
            <torusGeometry args={[0.62, 0.26, 32, 64]} />
            <Clay color="#FFC857" />
          </mesh>
        </Float>
        <Float speed={1 * speed} rotationIntensity={0.8 * speed} floatIntensity={0.8 * speed}>
          <RoundedBox args={[1.25, 1.25, 1.25]} radius={0.32} smoothness={6} position={[1.2, -1.15, 0.2]} rotation={[0.5, 0.7, 0.1]}>
            <Clay color="#3DCFAE" />
          </RoundedBox>
        </Float>
        <Float speed={1.8 * speed} rotationIntensity={0.4 * speed} floatIntensity={1.2 * speed}>
          <mesh position={[-1.25, -1.35, 0.8]}>
            <sphereGeometry args={[0.48, 48, 48]} />
            <Clay color="#FF7890" />
          </mesh>
        </Float>
        <Float speed={1.4 * speed} rotationIntensity={1.2 * speed} floatIntensity={1 * speed}>
          <mesh position={[0.15, 0.05, -1.4]} rotation={[0.3, 0.2, 0.6]}>
            <capsuleGeometry args={[0.28, 0.9, 12, 24]} />
            <Clay color="#4285FF" />
          </mesh>
        </Float>
      </Canvas>
    </CanvasErrorBoundary>
  );
}
