import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ViteImageOptimizer({
      test: /\.(jpe?g|png|gif|webp|svg)$/i,
      includePublic: true,
      logStats: true,
      ansiColors: true,
      svg: {
        multipass: true,
        plugins: [
          {
            name: 'preset-default',
            params: {
              overrides: {
                cleanupNumericValues: false,
                removeViewBox: false,
              },
            },
          },
        ],
      },
      png: {
        // Optimize PNG quality while maintaining visual fidelity
        quality: 85,
        compressionLevel: 9,
      },
      jpeg: {
        // Optimize JPEG quality
        quality: 85,
        progressive: true,
      },
      jpg: {
        quality: 85,
        progressive: true,
      },
      webp: {
        // Use WebP for better compression
        lossless: false,
        quality: 90,
        effort: 6,
      },
    }),
  ],
  build: {
    // Enable minification and optimization
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Split chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'animation-vendor': ['framer-motion', 'gsap'],
          'router': ['react-router-dom'],
          'ui': ['lucide-react'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Generate source maps for production debugging
    sourcemap: true,
    // Optimize CSS
    cssCodeSplit: true,
    // Enable asset optimization
    assetsInlineLimit: 4096,
  },
  // Enable server-side compression
  server: {
    compression: true,
  },
  // Configure preview server
  preview: {
    compression: true,
  },
});