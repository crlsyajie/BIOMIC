import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls, FontLoader, TextGeometry } from 'three-stdlib';
import { motion, AnimatePresence } from 'motion/react';
import { BIOMES, BiomeConfig } from './biomes';
import { GrowthEngine } from './GrowthEngine';
import { ParticleSystem } from './ParticleSystem';

const FONT_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r147/examples/fonts/helvetiker_bold.typeface.json';

export default function BiomicCountdown() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(10);
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState('00:00:00:00');
  
  const engineRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    growthEngine: GrowthEngine;
    particleSystem: ParticleSystem;
    currentMesh?: THREE.Mesh;
    frameId: number;
    mouse: THREE.Vector2;
  } | null>(null);

  // Biological Clock simulation
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const hh = Math.floor(elapsed / 3600000).toString().padStart(2, '0');
      const mm = Math.floor((elapsed % 3600000) / 60000).toString().padStart(2, '0');
      const ss = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
      const ms = Math.floor((elapsed % 1000) / 10).toString().padStart(2, '0');
      setTime(`${hh}:${mm}:${ss}:${ms}`);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '1';
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controls.enableZoom = false;
    controls.target.set(0, 0, 0);

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2);
    mainLight.position.set(5, 10, 7);
    scene.add(mainLight);

    const pointLight1 = new THREE.PointLight(0xffffff, 3);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffff, 2);
    pointLight2.position.set(-10, -5, 5);
    scene.add(pointLight2);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
    scene.add(hemiLight);

    const growthEngine = new GrowthEngine(scene);
    const particleSystem = new ParticleSystem(scene);
    const mouse = new THREE.Vector2();

    engineRef.current = { scene, camera, renderer, controls, growthEngine, particleSystem, frameId: 0, mouse };

    const animate = () => {
      const { scene, camera, renderer, controls, growthEngine, particleSystem, mouse, currentMesh } = engineRef.current!;
      controls.update();
      growthEngine.update(mouse);
      particleSystem.update();

      const time = performance.now() * 0.001;

      // Update shader uniforms
      if (currentMesh) {
        const mat = currentMesh.material as any;
        if (mat.uniforms && mat.uniforms.time) {
            mat.uniforms.time.value = time;
        } else if (mat.userData && mat.userData.shader && mat.userData.shader.uniforms.time) {
            mat.userData.shader.uniforms.time.value = time;
        }
        
        // Pulse emissive for extra "shine"
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.emissiveIntensity = 1.0 + Math.sin(time * 4.0) * 0.5;
        }
      }

      renderer.render(scene, camera);
      engineRef.current!.frameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    animate();
    setMounted(true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (engineRef.current) {
        cancelAnimationFrame(engineRef.current.frameId);
        renderer.dispose();
      }
    };
  }, []);

  // LOAD FONT AND START COUNTDOWN logic
  useEffect(() => {
    if (!mounted) return;

    const loader = new FontLoader();
    loader.load(
      FONT_URL, 
      (font) => {
        setLoading(false);
        let currentNumber = 10;
        
        const updateNumber = (num: number) => {
          const biome = BIOMES[num];
          const { scene, growthEngine, particleSystem } = engineRef.current!;
          
          // Burst effect on transition
          particleSystem.burst(biome.leafColor);

          // Animate old mesh out
          const oldMesh = engineRef.current?.currentMesh;
          if (oldMesh) {
            const shrink = () => {
                oldMesh.scale.multiplyScalar(0.85);
                if (oldMesh.scale.x < 0.1) {
                    scene.remove(oldMesh);
                    oldMesh.geometry.dispose();
                } else {
                    requestAnimationFrame(shrink);
                }
            };
            shrink();
          }

          // Create new Text Geometry
          const geometry = new TextGeometry(num.toString(), {
            font: font,
            size: 6,
            height: 2,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 0.2,
            bevelSize: 0.2,
            bevelOffset: 0,
            bevelSegments: 5
          } as any);
          geometry.computeVertexNormals();
          geometry.center();

          const material = createBiomeMaterial(biome);
          const mesh = new THREE.Mesh(geometry, material);
          mesh.rotation.y = -Math.PI / 8;
          mesh.scale.set(0, 0, 0); // Start small for entry animation
          scene.add(mesh);
          engineRef.current!.currentMesh = mesh;

          // Entry animation for the number
          const grow = () => {
            if (!engineRef.current || engineRef.current.currentMesh !== mesh) return;
            mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
            if (mesh.scale.x < 0.999) {
                requestAnimationFrame(grow);
            } else {
                mesh.scale.set(1, 1, 1);
            }
          };
          grow();

          // Clear and Generate Growth & Particles
          growthEngine.generateOnMesh(mesh, biome);
          particleSystem.generateForBiome(biome);
        };

        updateNumber(currentNumber);

        const interval = setInterval(() => {
          currentNumber = currentNumber > 1 ? currentNumber - 1 : 10;
          setCountdown(currentNumber);
          updateNumber(currentNumber);
        }, 5000);

        return () => clearInterval(interval);
      },
      undefined,
      (err) => {
        console.error('Font loading failed:', err);
        setLoading(false); // Hide loading even if it fails so we can see something
      }
    );
  }, [mounted]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050505] font-sans" ref={containerRef}>
      {/* Decorative Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0" 
           style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      
      {/* Central Glow Accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C9A050] opacity-[0.03] blur-[120px] rounded-full pointer-events-none"></div>

      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#050505] flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-[1px] bg-white/20 overflow-hidden">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="w-full h-full bg-white/60"
                />
              </div>
              <span className="text-[10px] font-mono whitespace-nowrap text-white/40 uppercase tracking-[0.3em]">Initializing Seed</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Left: System Info */}
      <div className="absolute top-10 left-10 z-10 pointer-events-none flex flex-col gap-1">
        <span className="text-[10px] tracking-[0.3em] font-medium text-white/40 uppercase">Biological Computing Unit</span>
        <span className="text-[14px] tracking-widest font-light text-white/80">BIOMIC // PHASE 01</span>
      </div>

      {/* Top Right: Biological Clock */}
      <div className="absolute top-10 right-10 z-10 pointer-events-none flex items-baseline gap-4">
        <div className="flex flex-col items-end">
          <span className="text-[10px] tracking-[0.3em] text-white/40 uppercase">Current System Time</span>
          <span className="text-xl font-mono tracking-tighter text-[#C9A050]">{time}</span>
        </div>
      </div>

      {/* Bottom Left: Biome Context */}
      <AnimatePresence mode="wait">
        <motion.div
           key={countdown}
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: 20 }}
           transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
           className="absolute bottom-12 left-10 z-10 pointer-events-none flex flex-col gap-3"
        >
          <div className="flex items-center gap-4">
            <span className="text-[48px] font-serif italic text-white/90 leading-tight">{BIOMES[countdown].name}</span>
            <div className="h-[1px] w-24 bg-white/20"></div>
          </div>
          <p className="max-w-xs text-[10px] tracking-wide leading-relaxed text-white/40 uppercase font-medium">
            {BIOMES[countdown].description}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Bottom Right: Navigation Rail */}
      <div className="absolute bottom-12 right-10 z-10 flex gap-4 items-center pointer-events-none">
        <span className="text-[10px] tracking-[0.3em] text-white/30 font-medium uppercase">Biome Sequence</span>
        <div className="flex gap-2 items-center">
          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
            <div 
              key={n} 
              className={`transition-all duration-700 ${
                countdown === n 
                  ? 'w-3 h-3 rounded-full bg-[#C9A050] ring-4 ring-[#C9A050]/20' 
                  : 'w-1.5 h-1.5 rounded-full border border-white/20'
              }`} 
            />
          ))}
        </div>
      </div>

      {/* Side Tech Indicators */}
      <div className="absolute top-1/2 left-4 -translate-y-1/2 flex flex-col gap-8 opacity-20 pointer-events-none">
        <div className="w-[1px] h-32 bg-gradient-to-b from-transparent via-white to-transparent" />
        <span className="text-[8px] font-mono text-white vertical-rl uppercase tracking-tighter">Growth Optimization Active</span>
        <div className="w-[1px] h-32 bg-gradient-to-b from-transparent via-white to-transparent" />
      </div>
    </div>
  );
}

function createBiomeMaterial(biome: BiomeConfig): THREE.Material {
  const timeUniform = { value: 0 };
  let material: THREE.Material;

  switch (biome.key) {
    case 'volcanic':
      material = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a, roughness: 0.2, metalness: 0.8,
        emissive: 0xff4400, emissiveIntensity: 1.0
      });
      material.onBeforeCompile = (shader) => {
        shader.uniforms.time = timeUniform;
        shader.vertexShader = `uniform float time;\n${shader.vertexShader}`.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          transformed.x += sin(transformed.y * 2.0 + time * 5.0) * 0.05;
          transformed.z += cos(transformed.x * 2.0 + time * 3.0) * 0.05;
          `
        );
        material.userData.shader = shader;
      };
      break;

    case 'cyber':
      material = new THREE.MeshStandardMaterial({ 
        color: 0x111111, metalness: 1.0, roughness: 0.05, 
        emissive: 0x00ffff, emissiveIntensity: 1.0 
      });
      // Force UV usage so vUv is available in fragment shader
      material.defines = { 'USE_UV': '' };
      material.onBeforeCompile = (shader) => {
        shader.uniforms.time = timeUniform;
        shader.vertexShader = `
          #ifndef USE_UV
            varying vec2 vUv;
          #endif
          uniform float time;
          ${shader.vertexShader}
        `.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          #ifndef USE_UV
            vUv = uv;
          #endif
          `
        );
        shader.fragmentShader = `
          #ifndef USE_UV
            varying vec2 vUv;
          #endif
          uniform float time;
          ${shader.fragmentShader}
        `.replace(
          '#include <emissivemap_fragment>',
          `
          #include <emissivemap_fragment>
          float pulse = (sin(time * 4.0) * 0.5 + 0.5);
          float grid = abs(sin(vUv.x * 40.0 + time) * sin(vUv.y * 40.0)) * 0.5;
          float scanline = smoothstep(0.48, 0.5, abs(fract(vUv.y * 10.0 + time * 0.5) - 0.5));
          totalEmissiveRadiance *= (0.2 + pulse * 1.5 + grid * 2.0 + scanline * 5.0);
          `
        );
        material.userData.shader = shader;
      };
      break;

    case 'deepsea':
      material = new THREE.MeshStandardMaterial({
        color: 0x001144, roughness: 0.1, metalness: 0.9,
        emissive: 0x0088ff, emissiveIntensity: 1.0
      });
      material.defines = { 'USE_UV': '' };
      material.onBeforeCompile = (shader) => {
        shader.uniforms.time = timeUniform;
        shader.vertexShader = `
          #ifndef USE_UV
            varying vec2 vUv;
          #endif
          uniform float time;
          ${shader.vertexShader}
        `.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          #ifndef USE_UV
            vUv = uv;
          #endif
          transformed.x += sin(transformed.y * 1.5 + time * 1.5) * 0.04;
          transformed.z += cos(transformed.x * 1.5 + time * 1.2) * 0.04;
          `
        );
        shader.fragmentShader = `
          #ifndef USE_UV
            varying vec2 vUv;
          #endif
          uniform float time;
          ${shader.fragmentShader}
        `.replace(
          '#include <emissivemap_fragment>',
          `
          #include <emissivemap_fragment>
          
          // Camera-reactive offset for parallax caustics
          vec3 viewDir = normalize(vViewPosition);
          vec2 shift = viewDir.xy * 0.15; 
          
          vec2 uv = (vUv + shift) * 7.0;
          float t = time * 0.6;
          
          float c = 0.0;
          for(int i=1; i<5; i++) {
            float fi = float(i);
            uv += sin(uv.yx * fi + t) * 0.3;
            c += 1.0 / length(uv - sin(uv.yx * 0.5 + t));
          }
          c = pow(c * 0.12, 4.0);
          c = clamp(c, 0.0, 1.0);
          
          // Secondary layer for more organic depth
          float c2 = 0.0;
          vec2 uv2 = (vUv + shift * 0.6) * 10.0;
          for(int i=1; i<4; i++) {
            float fi = float(i);
            uv2 += cos(uv2.yx * fi - t * 0.4) * 0.2;
            c2 += 1.0 / length(uv2 - cos(uv2.yx * 0.3 - t));
          }
          c2 = pow(c2 * 0.1, 3.5);
          c2 = clamp(c2, 0.0, 1.0);
          
          totalEmissiveRadiance += vec3(0.0, 0.5, 1.0) * c * 4.0;
          totalEmissiveRadiance += vec3(0.1, 0.3, 0.6) * c2 * 2.0;
          totalEmissiveRadiance *= (0.3 + 0.7 * vUv.y);
          `
        );
        material.userData.shader = shader;
      };
      break;

    case 'zenith':
      material = new THREE.MeshStandardMaterial({ 
        color: 0xffd700, metalness: 1.0, roughness: 0.1, 
        emissive: 0xffaa00, emissiveIntensity: 1.0 
      });
      material.defines = { 'USE_UV': '' };
      material.onBeforeCompile = (shader) => {
        shader.uniforms.time = timeUniform;
        shader.vertexShader = `
          #ifndef USE_UV
            varying vec2 vUv;
          #endif
          uniform float time;
          ${shader.vertexShader}
        `.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          #ifndef USE_UV
            vUv = uv;
          #endif
          transformed.y += sin(transformed.x * 2.5 + time * 3.0) * 0.05;
          transformed.x += cos(transformed.y * 2.0 + time * 2.0) * 0.04;
          transformed.z += sin(transformed.x * 1.5 + transformed.y * 1.5 + time * 4.0) * 0.02;
          `
        );
        shader.fragmentShader = `
          #ifndef USE_UV
            varying vec2 vUv;
          #endif
          uniform float time;
          ${shader.fragmentShader}
        `.replace(
          '#include <emissivemap_fragment>',
          `
          #include <emissivemap_fragment>
          vec2 uv = vUv;
          float t = time * 0.6;
          
          // Flowing liquid texture
          float n = sin(uv.x * 12.0 + t + sin(uv.y * 10.0 + t)) * 0.5 + 0.5;
          float n2 = sin(uv.y * 15.0 - t * 0.5 + cos(uv.x * 8.0 + t * 1.5)) * 0.5 + 0.5;
          float goldFlow = pow(n * n2, 2.0);
          
          // Specular-like highlights
          float shimmer = pow(sin(uv.x * 20.0 + uv.y * 10.0 + t * 5.0) * 0.5 + 0.5, 8.0);
          
          totalEmissiveRadiance += emissive * (goldFlow * 2.0 + shimmer * 3.0);
          totalEmissiveRadiance *= (0.6 + 0.4 * sin(t + uv.y * 5.0)); // Slow surface pulse
          `
        );
        material.userData.shader = shader;
      };
      break;

    case 'autumn':
      material = new THREE.MeshStandardMaterial({ 
        color: 0x8a5c3d, 
        roughness: 0.5, 
        metalness: 0.3,
        emissive: 0xffaa44,
        emissiveIntensity: 0.4
      });
      break;
    case 'meadow':
      material = new THREE.MeshStandardMaterial({ 
        color: 0x4d8a4d, 
        roughness: 0.6, 
        metalness: 0.2,
        emissive: 0x44ff44,
        emissiveIntensity: 0.3
      });
      break;
    case 'fungal':
      material = new THREE.MeshStandardMaterial({ 
        color: 0x6633aa, 
        emissive: 0xaa00ff, 
        emissiveIntensity: 1.5, 
        metalness: 0.4, 
        roughness: 0.3 
      });
      break;
    case 'rainforest':
      material = new THREE.MeshStandardMaterial({ 
        color: 0x0a6a0a, 
        roughness: 0.2, 
        metalness: 0.5,
        emissive: 0x00ff00,
        emissiveIntensity: 0.5
      });
      break;
    case 'desert':
      material = new THREE.MeshStandardMaterial({ 
        color: 0xf5e1c0, 
        roughness: 0.6, 
        metalness: 0.3,
        emissive: 0xffd700,
        emissiveIntensity: 0.4
      });
      break;
    case 'tundra':
      material = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        metalness: 1.0, 
        roughness: 0.02, 
        transparent: true, 
        opacity: 0.9,
        emissive: 0x00ffff,
        emissiveIntensity: 0.6
      });
      break;
    default:
      material = new THREE.MeshStandardMaterial({ color: 0xffffff });
  }
  return material;
}
