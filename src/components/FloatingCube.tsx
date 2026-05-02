import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, OrbitControls } from '@react-three/drei';
import { Mesh, Color, LinearFilter, PointLight, SpotLight } from 'three';

export const FloatingCube = () => {
  const cubeRef = useRef<Mesh>(null!);
  const lightRef = useRef<PointLight>(null!);
  const spotLight1Ref = useRef<SpotLight>(null!);
  const spotLight2Ref = useRef<SpotLight>(null!);
  const spotLight3Ref = useRef<SpotLight>(null!);

  const colors = useMemo(() => ({
    primary: new Color('#39FF14'),
    glow: new Color('#000000'),
    white: new Color('#ffffff')
  }), []);

  // Load textures for each face of the cube with improved quality
  const textures = useTexture({
    px: 'https://i.ibb.co/vCpkBmCF/futurehack.png', // right
    nx: 'https://i.ibb.co/vCpkBmCF/futurehack.png', // left
    py: 'https://i.ibb.co/vCpkBmCF/futurehack.png', // top
    ny: 'https://i.ibb.co/vCpkBmCF/futurehack.png', // bottom
    pz: 'https://i.ibb.co/vCpkBmCF/futurehack.png', // front
    nz: 'https://i.ibb.co/rGV3M8yf/Whats-App-Image-2025-06-30-at-1-03-39-AM.jpg'  // back
  });

  // Improve texture quality
  Object.values(textures).forEach(texture => {
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.needsUpdate = true;
  });

  // Set spotlight targets after components are mounted
  useEffect(() => {
    if (cubeRef.current) {
      if (spotLight1Ref.current) {
        spotLight1Ref.current.target = cubeRef.current;
      }
      if (spotLight2Ref.current) {
        spotLight2Ref.current.target = cubeRef.current;
      }
      if (spotLight3Ref.current) {
        spotLight3Ref.current.target = cubeRef.current;
      }
    }
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (cubeRef.current) {
      // Slower, smoother rotation pattern
      cubeRef.current.rotation.x = Math.sin(time * 0.15) * 0.5;
      cubeRef.current.rotation.y = time * 0.15;
      cubeRef.current.rotation.z = Math.sin(time * 0.08) * 0.15;

      // Gentle floating motion
      cubeRef.current.position.y = Math.sin(time * 0.4) * 0.15;
      cubeRef.current.position.x = Math.sin(time * 0.3) * 0.15;

      // Very subtle scale breathing
      const scale = 1.8 + Math.sin(time * 0.8) * 0.03;
      cubeRef.current.scale.set(scale, scale, scale);
    }

    // Animate main light intensity for glow effect
    if (lightRef.current) {
      lightRef.current.intensity = 3 + Math.sin(time * 2) * 1;
    }

    // Animate spotlight intensities for dynamic white neon effect
    if (spotLight1Ref.current) {
      spotLight1Ref.current.intensity = 8 + Math.sin(time * 1.5) * 3;
    }
    if (spotLight2Ref.current) {
      spotLight2Ref.current.intensity = 6 + Math.cos(time * 1.8) * 2;
    }
    if (spotLight3Ref.current) {
      spotLight3Ref.current.intensity = 7 + Math.sin(time * 2.2) * 2.5;
    }
  });

  return (
    <>
      {/* Main Cube */}
      <mesh ref={cubeRef}>
        <boxGeometry args={[1, 1, 1]} />
        {/* Right face */}
        <meshStandardMaterial
          map={textures.px}
          attachArray="material"
          transparent
          opacity={0.95}
          emissive={colors.glow}
          emissiveIntensity={0.5}
        />
        {/* Left face */}
        <meshStandardMaterial
          map={textures.nx}
          attachArray="material"
          transparent
          opacity={0.95}
          emissive={colors.glow}
          emissiveIntensity={0.5}
        />
        {/* Top face */}
        <meshStandardMaterial
          map={textures.py}
          attachArray="material"
          transparent
          opacity={0.95}
          emissive={colors.glow}
          emissiveIntensity={0.5}
        />
        {/* Bottom face */}
        <meshStandardMaterial
          map={textures.ny}
          attachArray="material"
          transparent
          opacity={0.95}
          emissive={colors.glow}
          emissiveIntensity={0.5}
        />
        {/* Front face */}
        <meshStandardMaterial
          map={textures.pz}
          attachArray="material"
          transparent
          opacity={0.95}
          emissive={colors.glow}
          emissiveIntensity={0.5}
        />
        {/* Back face */}
        <meshStandardMaterial
          map={textures.nz}
          attachArray="material"
          transparent
          opacity={0.95}
          emissive={colors.glow}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* White Neon Background Glow - Multiple Spotlights */}
      <spotLight
        ref={spotLight1Ref}
        position={[-3, 2, 3]}
        color={colors.white}
        intensity={8}
        distance={10}
        angle={Math.PI / 3}
        penumbra={0.8}
        decay={1}
        castShadow={false}
      />

      <spotLight
        ref={spotLight2Ref}
        position={[3, -2, 3]}
        color={colors.white}
        intensity={6}
        distance={8}
        angle={Math.PI / 4}
        penumbra={0.9}
        decay={1}
        castShadow={false}
      />

      <spotLight
        ref={spotLight3Ref}
        position={[0, 3, -3]}
        color={colors.white}
        intensity={7}
        distance={12}
        angle={Math.PI / 2.5}
        penumbra={1}
        decay={1}
        castShadow={false}
      />

      {/* Additional Point Lights for Enhanced Glow */}
      <pointLight
        position={[-2, 2, 2]}
        color={colors.white}
        intensity={4}
        distance={6}
        decay={2}
      />

      <pointLight
        position={[2, -2, 2]}
        color={colors.white}
        intensity={3}
        distance={5}
        decay={2}
      />

      {/* Main Point Light for Cube Glow */}
      <pointLight
        ref={lightRef}
        position={[0, 0, 2]}
        color={colors.primary}
        intensity={3}
        distance={5}
        decay={2}
      />

      {/* Ambient light for overall illumination */}
      <ambientLight intensity={0.3} color={colors.white} />

      {/* Enable Mouse Dragging */}
      <OrbitControls enableZoom={false} />

      {/* Invisible Background Plane for Light Reflection */}
      <mesh position={[0, 0, -4]} rotation={[0, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color={colors.white}
          transparent
          opacity={0.05}
          emissive={colors.white}
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Additional Background Glow Spheres */}
      <mesh position={[-1.5, 1.5, -2]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color={colors.white}
          transparent
          opacity={0.1}
          emissive={colors.white}
          emissiveIntensity={0.8}
        />
      </mesh>

      <mesh position={[1.5, -1.5, -2]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial
          color={colors.white}
          transparent
          opacity={0.08}
          emissive={colors.white}
          emissiveIntensity={0.6}
        />
      </mesh>

      <mesh position={[0, 0, -3]}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial
          color={colors.white}
          transparent
          opacity={0.03}
          emissive={colors.white}
          emissiveIntensity={0.4}
        />
      </mesh>
    </>
  );
};