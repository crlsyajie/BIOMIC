import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls, FontLoader, TextGeometry, EffectComposer, RenderPass, UnrealBloomPass } from 'three-stdlib';
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
    composer: EffectComposer;
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

  const [hoverInfo, setHoverInfo] = useState<{ pos: THREE.Vector3, opacity: number } | null>(null);

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
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // POST PROCESSING
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.8, // strength (slightly boosted)
      0.65, // radius (softer glow)
      0.35 // threshold (lower to catch more highlights)
    );
    composer.addPass(bloomPass);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controls.enableZoom = false;
    controls.target.set(0, 0, 0);

    // LIGHTING - Redesigned for dramatic depth
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 4);
    mainLight.position.set(10, 20, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -15;
    mainLight.shadow.camera.right = 15;
    mainLight.shadow.camera.top = 15;
    mainLight.shadow.camera.bottom = -15;
    scene.add(mainLight);

    const rimLight = new THREE.PointLight(0x00ffff, 8, 30);
    rimLight.position.set(-10, 5, -5);
    scene.add(rimLight);

    const accentLight = new THREE.PointLight(0xffaa00, 5, 25);
    accentLight.position.set(5, -5, 5);
    scene.add(accentLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x000000, 0.5);
    scene.add(hemiLight);

    const growthEngine = new GrowthEngine(scene);
    const particleSystem = new ParticleSystem(scene);
    const mouse = new THREE.Vector2();

    engineRef.current = { scene, camera, renderer, composer, controls, growthEngine, particleSystem, frameId: 0, mouse };

    const animate = () => {
      const { scene, camera, renderer, composer, controls, growthEngine, particleSystem, mouse, currentMesh } = engineRef.current!;
      controls.update();
      const hover = growthEngine.update(mouse, camera);
      
      if (hover.hoveredPos && hover.influence > 0.05) {
        setHoverInfo({ pos: hover.hoveredPos, opacity: hover.influence });
      } else {
        setHoverInfo(null);
      }

      particleSystem.update();

      const time = performance.now() * 0.001;

      const pulseFreq = 2.5;
      const baseEmissiveIntensity = 1.6 + Math.sin(time * pulseFreq) * 1.2;

      // Update shader uniforms and pulsing for all biomic elements
      const updateMaterial = (mesh: THREE.Mesh) => {
        const mat = mesh.material as any;
        if (!mat) return;

        // Sync Time for custom shaders
        if (mat.uniforms && mat.uniforms.time) {
          mat.uniforms.time.value = time;
        } else if (mat.userData && mat.userData.shader && mat.userData.shader.uniforms.time) {
          mat.userData.shader.uniforms.time.value = time;
        }

        // Pulse emissive ONLY for biomic-tagged materials
        if (mat.userData?.isBiomicMaterial && mat instanceof THREE.MeshStandardMaterial) {
          mat.emissiveIntensity = baseEmissiveIntensity;
        }
      };

      if (currentMesh) {
        updateMaterial(currentMesh);
      }

      growthEngine.groups.forEach(group => {
        group.traverse(child => {
          if (child instanceof THREE.Mesh) {
            updateMaterial(child);
          }
        });
      });

      composer.render();
      engineRef.current!.frameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
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
          mesh.castShadow = true;
          mesh.receiveShadow = true;
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

  const getLabelPos = () => {
    if (!hoverInfo || !engineRef.current) return { left: 0, top: 0, opacity: 0 };
    const { camera } = engineRef.current;
    
    const vector = hoverInfo.pos.clone().project(camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = -(vector.y * 0.5 - 0.5) * window.innerHeight;
    
    return { left: x, top: y };
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050505] font-sans" ref={containerRef}>
      {/* Gentle Hover Label */}
      <AnimatePresence>
        {hoverInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
                opacity: Math.pow(hoverInfo.opacity, 1.5), 
                scale: 0.9 + hoverInfo.opacity * 0.1,
                left: getLabelPos().left,
                top: getLabelPos().top
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="pointer-events-none absolute z-50 text-white/50 text-[10px] sm:text-xs font-mono tracking-[0.3em] italic whitespace-nowrap"
            style={{ transform: 'translate(-50%, -180%)' }}
          >
            gentle...
          </motion.div>
        )}
      </AnimatePresence>
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
    case 'sakura':
      material = new THREE.MeshStandardMaterial({ 
        color: 0x3d2b1f, roughness: 0.8, metalness: 0.1,
        emissive: 0xffb7c5, emissiveIntensity: 0.2
      });
      break;

    case 'monsoon':
      material = new THREE.MeshStandardMaterial({ 
        color: 0x164624, roughness: 0.2, metalness: 0.5,
        emissive: 0x002244, emissiveIntensity: 0.1
      });
      material.defines = { 'USE_UV': '' };
      material.onBeforeCompile = (shader) => {
        shader.uniforms.time = timeUniform;
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `#include <common>
          uniform float time;`
        ).replace(
          '#include <emissivemap_fragment>',
          `
          #include <emissivemap_fragment>
          // Water droplets effect
          vec2 uv = vUv * 10.0;
          float droplet = 0.0;
          for(int i=0; i<3; i++) {
              vec2 p = fract(uv + vec2(0.0, time * 0.2)) - 0.5;
              droplet += smoothstep(0.1, 0.05, length(p)) * 0.5;
          }
          totalEmissiveRadiance += vec3(0.5, 0.8, 1.0) * droplet;
          `
        );
        material.userData.shader = shader;
      };
      break;

    case 'autumn':
      material = new THREE.MeshStandardMaterial({ 
        color: 0x5a3d2b, roughness: 0.9,
        emissive: 0xd35400, emissiveIntensity: 0.3
      });
      break;

    case 'cactus':
      // Sandy texture
      material = new THREE.MeshStandardMaterial({ 
        color: 0xc2b280, roughness: 1.0, 
        emissive: 0xffd700, emissiveIntensity: 0.1
      });
      material.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `#include <common>
           float hash(vec2 p) { return fract(sin(dot(p, vec2(12.7, 31.1))) * 43758.5453); }`
        ).replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
           float n = hash(gl_FragCoord.xy * 0.1);
           gl_FragColor.rgb *= 0.9 + n * 0.2;`
        );
      };
      break;

    case 'meadow':
      material = new THREE.MeshStandardMaterial({ 
        color: 0x228b22, roughness: 0.7,
        emissive: 0x44ff44, emissiveIntensity: 0.2
      });
      break;

    case 'winter':
      // Crystalline frost - replaced MeshPhysical to avoid shader errors
      material = new THREE.MeshStandardMaterial({ 
        color: 0x88ccff, metalness: 0.5, roughness: 0.2,
        transparent: true, opacity: 0.9,
        emissive: 0xffffff, emissiveIntensity: 0.2
      });
      break;

    case 'lavender':
      material = new THREE.MeshStandardMaterial({ 
        color: 0x483d8b, roughness: 0.6,
        emissive: 0x9370db, emissiveIntensity: 0.8
      });
      break;

    case 'deepsea':
      material = new THREE.MeshStandardMaterial({
        color: 0x001144, roughness: 0.1, metalness: 0.9,
        emissive: 0x0088ff, emissiveIntensity: 1.0
      });
      material.defines = { 'USE_UV': '' };
      material.onBeforeCompile = (shader) => {
        shader.uniforms.time = timeUniform;
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `#include <common>
          uniform float time;`
        ).replace(
          '#include <emissivemap_fragment>',
          `
          #include <emissivemap_fragment>
          vec2 uv = vUv * 5.0;
          float glow = sin(uv.x + time) * cos(uv.y + time * 0.5);
          totalEmissiveRadiance += vec3(0.0, 0.5, 1.0) * (glow * 0.5 + 0.5);
          `
        );
        material.userData.shader = shader;
      };
      break;

    case 'mushroom':
      material = new THREE.MeshStandardMaterial({ 
        color: 0x3d2b1f, roughness: 0.4,
        emissive: 0xff0000, emissiveIntensity: 1.2
      });
      break;

    case 'zenith':
      material = new THREE.MeshStandardMaterial({ 
        color: 0xffd700, metalness: 1.0, roughness: 0.1, 
        emissive: 0xffaa00, emissiveIntensity: 1.0 
      });
      material.userData.isBiomicMaterial = true;
      material.defines = { 'USE_UV': '' };
      material.onBeforeCompile = (shader) => {
        shader.uniforms.time = timeUniform;
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `#include <common>
          uniform float time;`
        ).replace(
          '#include <emissivemap_fragment>',
          `
          #include <emissivemap_fragment>
          vec2 uv = vUv;
          float flow = sin(uv.x * 10.0 + time * 2.0) * sin(uv.y * 10.0 + time * 1.5);
          totalEmissiveRadiance += emissive * (flow * 0.5 + 0.5) * 5.0;
          `
        );
        material.userData.shader = shader;
      };
      break;

    default:
      material = new THREE.MeshStandardMaterial({ color: 0xffffff });
      material.userData.isBiomicMaterial = true;
  }
  
  if (material instanceof THREE.MeshStandardMaterial) {
    material.userData.isBiomicMaterial = true;
  }
  
  return material;
}
