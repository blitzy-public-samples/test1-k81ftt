// vite.config.ts
// External dependencies versions:
// vite: ^4.5.0
// @vitejs/plugin-react: ^4.0.0
// vite-tsconfig-paths: ^4.2.0
// terser: ^5.4.0
// vite-plugin-compression: ^0.5.1

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import viteCompression from 'vite-plugin-compression';
import path from 'path';

export default defineConfig({
  // Enhanced plugin stack with React support, TypeScript path resolution, and compression
  plugins: [
    react({
      // Enable Fast Refresh for rapid development
      fastRefresh: true,
      // Babel configuration for optimal React compilation
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
        ]
      }
    }),
    // TypeScript path aliases resolution
    tsconfigPaths(),
    // Gzip compression for production builds
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Only compress files > 10KB
      deleteOriginFile: false
    }),
    // Brotli compression for enhanced compression ratios
    viteCompression({
      algorithm: 'brotli',
      ext: '.br',
      threshold: 10240,
      deleteOriginFile: false
    })
  ],

  // Development server configuration
  server: {
    port: 3000,
    host: true, // Listen on all local IPs
    strictPort: true,
    cors: true, // Enable CORS for development
    hmr: {
      overlay: true // Enable HMR overlay for error display
    },
    proxy: {
      // API proxy configuration for development
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  },

  // Production build configuration
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps in production
    minify: 'terser',
    target: 'es2020', // Target modern browsers for better optimization
    cssCodeSplit: true, // Enable CSS code splitting
    chunkSizeWarningLimit: 1000, // Increase chunk size warning limit
    assetsInlineLimit: 4096, // Inline assets smaller than 4KB
    
    // Terser optimization configuration
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      format: {
        comments: false
      }
    },

    // Rollup-specific optimizations
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal caching
        manualChunks: {
          vendor: ['react', 'react-dom', '@mui/material'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          utils: ['date-fns', 'lodash'],
          socket: ['socket.io-client']
        },
        // Asset file naming configuration
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name.split('.')[1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        }
      }
    }
  },

  // Path resolution configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@store': path.resolve(__dirname, './src/store'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@features': path.resolve(__dirname, './src/features'),
      '@api': path.resolve(__dirname, './src/api')
    }
  },

  // CSS configuration
  css: {
    modules: {
      localsConvention: 'camelCase',
      scopeBehaviour: 'local',
      generateScopedName: '[name]__[local]___[hash:base64:5]'
    },
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@styles/variables.scss"; @import "@styles/mixins.scss";'
      }
    }
  },

  // Dependency optimization configuration
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@mui/material',
      '@reduxjs/toolkit',
      'react-redux',
      'socket.io-client',
      'date-fns',
      'lodash'
    ],
    exclude: ['@testing-library/react']
  },

  // ESBuild configuration
  esbuild: {
    jsxInject: "import React from 'react'",
    legalComments: 'none',
    target: 'es2020',
    supported: {
      'async-await': true,
      'dynamic-import': true,
      'import-meta': true
    }
  },

  // Preview server configuration
  preview: {
    port: 3000,
    strictPort: true,
    cors: true
  }
});