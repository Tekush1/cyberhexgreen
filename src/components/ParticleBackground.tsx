import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function MouseLight() {
  const { viewport } = useThree();
  const light = useRef<THREE.PointLight>(null!);
  const [mouseX, mouseY] = React.useState([0, 0]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleMouseMove = (event: MouseEvent) => {
      mouseX[0] = (event.clientX / window.innerWidth) * 2 - 1;
      mouseY[0] = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame(() => {
    if (light.current) {
      light.current.position.x = mouseX[0] * viewport.width;
      light.current.position.y = mouseY[0] * viewport.height;
      light.current.position.z = 5;
    }
  });

  return <pointLight ref={light} distance={15} intensity={2} color="#FFD700" />;
}

function ParticleField() {
  const ref = useRef<THREE.Points>(null!);
  const { viewport, camera } = useThree();
  
  // Create three layers of particles for parallax effect
  const [particles1, particles2, particles3] = useMemo(() => {
    const layers = [];
    for (let layer = 0; layer < 3; layer++) {
      const count = (3 - layer) * 500; // More particles in front layers
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 25;
        positions[i3 + 1] = (Math.random() - 0.5) * 25;
        positions[i3 + 2] = (Math.random() - 0.5) * 10 - layer * 5;
        
        // Gradient colors from gold to orange
        colors[i3] = 1; // R
        colors[i3 + 1] = 0.84 + Math.random() * 0.16; // G
        colors[i3 + 2] = Math.random() * 0.5; // B
        
        sizes[i] = Math.random() * 0.5 + 0.1;
      }
      layers.push({ positions, colors, sizes });
    }
    return layers;
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (ref.current) {
      // Parallax effect based on mouse movement
      const mouseX = (state.mouse.x * viewport.width) / 50;
      const mouseY = (state.mouse.y * viewport.height) / 50;
      
      camera.position.x += (mouseX - camera.position.x) * 0.02;
      camera.position.y += (mouseY - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);
      
      // Animate particles
      const positions = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        
        // Wave motion
        positions[i + 1] = y + Math.sin(time * 0.5 + x * 0.5) * 0.1;
        
        // Spiral motion
        const angle = time * 0.1 + Math.sqrt(x * x + y * y) * 0.05;
        positions[i] = x * Math.cos(angle) - y * Math.sin(angle);
        positions[i + 1] = x * Math.sin(angle) + y * Math.cos(angle);
      }
      
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <>
      {[particles1, particles2, particles3].map((layer, index) => (
        <Points key={index} ref={ref}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={layer.positions.length / 3}
              array={layer.positions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={layer.colors.length / 3}
              array={layer.colors}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-size"
              count={layer.sizes.length}
              array={layer.sizes}
              itemSize={1}
            />
          </bufferGeometry>
          <PointMaterial
            transparent
            vertexColors
            size={0.15}
            sizeAttenuation={true}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </Points>
      ))}
      <MouseLight />
    </>
  );
}

export const ParticleBackground = () => {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
      >
        <ParticleField />
        <MouseLight />
      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-dark-300/50 to-dark-300 pointer-events-none" />
    </div>
  );
};