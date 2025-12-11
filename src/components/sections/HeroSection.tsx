import React, { useState, useEffect, Suspense } from 'react';
import { ArrowRight, Shield, Skull, ChevronDown, Eye, AlertTriangle, Users, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { FloatingCube } from '../FloatingCube';
import { DynamicText } from '../DynamicText';

const LoadingFallback = () => (
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="w-32 h-32 border-4 border-primary rounded-full animate-[pulseAndRotate_2s_ease-in-out_infinite]" />
  </div>
);

export const HeroSection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Cyberpunk Grid Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(transparent_1px,_#00000000_1px),_linear-gradient(90deg,_transparent_1px,_#00000000_1px)] bg-[size:30px_30px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,_#000_70%,transparent_100%)] opacity-20" />
        <div className="absolute inset-0 bg-gradient-radial from-primary/20 via-dark-300 to-dark-300" />
        
        {/* Glitch Lines */}
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-px w-full bg-primary/30"
            initial={{ y: Math.random() * window.innerHeight }}
            animate={{
              y: [
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight
              ],
              opacity: [0.3, 0, 0.3],
              scaleX: [1, 1.5, 1]
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}

        {/* Digital Rain Effect */}
        <div className="absolute inset-0 overflow-hidden opacity-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-primary font-mono text-xs"
              initial={{
                x: Math.random() * window.innerWidth,
                y: -20,
                opacity: 0
              }}
              animate={{
                y: window.innerHeight + 20,
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: Math.random() * 2 + 1,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            >
              {Math.random().toString(36).substring(2, 3)}
            </motion.div>
          ))}
        </div>

        {/* CRT Scan Effect */}
        <div className="absolute inset-0 crt-effect pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="text-center lg:text-left lg:flex items-center justify-between gap-12">
          <div className="lg:w-2/3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="relative mb-8"
            >
              <h1 className="text-5xl md:text-7xl font-cyber font-bold mb-6 text-shadow-neon">
                Cyber{''}
                <span className="text-primary neon-text glitch" data-text="">Hx</span>
              </h1>
              <div className="text-3xl md:text-4xl font-cyber text-white/80">
                <DynamicText texts={[
                  "Digital Guardian",
                  "Scam Hunter",
                  "Cyber Protector"
                ]} />
              </div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-xl md:text-2xl text-gray-300 mb-8 font-cyber leading-relaxed"
            >
              Master cybersecurity, detect scams, and protect the digital world.
            </motion.p>

            {/* Key Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
            >
              <div className="flex items-center gap-3 bg-dark-100/50 backdrop-blur-sm rounded-lg p-4 border border-primary/20">
                <Shield className="w-6 h-6 text-primary" />
                <span className="text-white font-medium">CTF Challenges</span>
              </div>
              <div className="flex items-center gap-3 bg-dark-100/50 backdrop-blur-sm rounded-lg p-4 border border-primary/20">
                <Eye className="w-6 h-6 text-primary" />
                <span className="text-white font-medium">Scam Detection</span>
              </div>
              <div className="flex items-center gap-3 bg-dark-100/50 backdrop-blur-sm rounded-lg p-4 border border-primary/20">
                <AlertTriangle className="w-6 h-6 text-primary" />
                <span className="text-white font-medium">Threat Reporter</span>
              </div>
              <div className="flex items-center gap-3 bg-dark-100/50 backdrop-blur-sm rounded-lg p-4 border border-primary/20">
                <Users className="w-6 h-6 text-primary" />
                <span className="text-white font-medium">Expert Community</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <motion.a
                href="https://tranquil-truffle-15401f.netlify.app"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-primary text-dark-300 px-8 py-4 rounded-lg font-semibold text-lg inline-flex items-center justify-center hover:bg-secondary transition-colors relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                <Shield className="w-5 h-5 mr-2 relative z-10" />
                <span className="relative z-10">Start Learning</span>
              </motion.a>

              <motion.a
                href="https://fsociety.cyberhx.com"
  target="_blank"
  rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-primary text-primary px-8 py-4 rounded-lg font-semibold text-lg inline-flex items-center justify-center hover:bg-primary/10 transition-colors relative overflow-hidden group"
              >
                <AlertTriangle className="w-5 h-5 mr-2" />
                <span>HACKING MODULES</span>
              </motion.a>
            </motion.div>
          </div>

          {!isMobile && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 1 }}
              className="lg:w-1/3 mt-12 lg:mt-0"
            >
              <div className="relative w-full aspect-square max-w-[400px] mx-auto">
                <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                  <ambientLight intensity={0.5} />
                  <pointLight position={[10, 10, 10]} />
                  <Suspense fallback={null}>
                    <FloatingCube />
                  </Suspense>
                </Canvas>
                <div className="absolute inset-0 pointer-events-none bg-gradient-radial from-transparent to-black opacity-50" />
              </div>
            </motion.div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{
              y: [0, 10, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="text-primary cursor-pointer"
          >
            <ChevronDown size={32} className="animate-pulse" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};