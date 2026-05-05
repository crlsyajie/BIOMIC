import * as THREE from 'three';
import { BiomeConfig } from './biomes';

export class GrowthEngine {
  scene: THREE.Scene;
  groups: THREE.Group[] = [];
  startTime: number = 0;
  isGrowing: boolean = false;
  currentSpread: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  generateOnMesh(mesh: THREE.Mesh, config: BiomeConfig) {
    // Clear old growth
    this.clear();

    const geometry = mesh.geometry;
    if (!geometry.attributes.position) return;

    const positions = geometry.attributes.position.array;
    const normals = geometry.attributes.normal?.array;
    
    if (!normals) return;

    const count = geometry.attributes.position.count;
    const group = new THREE.Group();
    this.scene.add(group);
    this.groups.push(group);

    // Sample random points on the surface
    const plantCount = config.branchLimit;
    this.currentSpread = config.spread;

    for (let i = 0; i < plantCount; i++) {
        const idx = Math.floor(Math.random() * count) * 3;
        const pos = new THREE.Vector3(positions[idx], positions[idx+1], positions[idx+2]);
        const norm = new THREE.Vector3(normals[idx], normals[idx+1], normals[idx+2]);
        
        // Transform local to world 
        mesh.localToWorld(pos);
        const worldNorm = norm.clone().applyQuaternion(mesh.quaternion).normalize();
        
        // Align pivot to normal
        const pivot = new THREE.Group();
        pivot.position.copy(pos);
        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, worldNorm);
        pivot.applyQuaternion(quaternion);
        
        const plant = this.createPlant(config);
        // Organic metadata for variations
        plant.userData.delay = Math.random() * 0.5; // Up to 0.5s stagger
        plant.userData.growthSpeed = 0.8 + Math.random() * 0.4; // Varied speed
        plant.userData.swayOffset = Math.random() * Math.PI * 2;
        
        plant.scale.set(0, 0, 0);
        pivot.add(plant);
        group.add(pivot);
    }

    this.startTime = performance.now();
    this.isGrowing = true;
  }

  createPlant(config: BiomeConfig) {
    const group = new THREE.Group();
    
    // Simple L-System generation
    let sentence = config.lAxiom;
    for (let i = 0; i < config.maxIter; i++) {
      let nextSentence = "";
      for (const char of sentence) {
        if (char === 'F') {
          nextSentence += config.lRule;
        } else {
          nextSentence += char;
        }
      }
      sentence = nextSentence;
    }

    const length = config.key === 'rainforest' ? 0.7 : 0.45;
    const baseAngle = Math.PI / 5;
    const stack: { pos: THREE.Vector3, quat: THREE.Quaternion, thickness: number, depth: number }[] = [];
    
    let currentPos = new THREE.Vector3(0, -0.05, 0); // Sink slightly into surface
    let currentQuat = new THREE.Quaternion();
    let currentThickness = config.key === 'desert' ? 0.2 : 0.08;
    let depth = 0;
    let maxDepth = 0;

    // PRE-PASS: Calculate maxDepth for normalization
    let tempDepth = 0;
    for (const char of sentence) {
        if (char === 'F') {
            tempDepth++;
            maxDepth = Math.max(maxDepth, tempDepth);
        } else if (char === '[') {
            stack.push({ pos: new THREE.Vector3(), quat: new THREE.Quaternion(), thickness: 0, depth: tempDepth });
        } else if (char === ']') {
            const s = stack.pop()!;
            tempDepth = s.depth;
        }
    }
    stack.length = 0; // Clear stack
    depth = 0; // Reset for actual generation

    // Add root anchor (small bulb or base spreading)
    const anchorGeom = new THREE.SphereGeometry(currentThickness * 1.8, 8, 8);
    anchorGeom.scale(1, 0.4, 1); // Flatten it
    const anchorMat = new THREE.MeshStandardMaterial({ 
        color: config.treeColor,
        roughness: 0.9,
        flatShading: true
    });
    const anchor = new THREE.Mesh(anchorGeom, anchorMat);
    anchor.userData.depth = 0;
    anchor.position.set(0, -0.02, 0); // Sink base slightly
    group.add(anchor);

    // Add spreading "ground" roots targeting the number surface
    const rootCount = 5;
    for (let i = 0; i < rootCount; i++) {
        const rootLen = currentThickness * (3 + Math.random() * 3);
        const rootGeom = new THREE.CylinderGeometry(currentThickness * 0.2, currentThickness * 0.8, rootLen, 4);
        rootGeom.rotateX(Math.PI / 2);
        rootGeom.translate(0, 0, rootLen / 2);
        
        const root = new THREE.Mesh(rootGeom, anchorMat);
        root.userData.depth = 0.1; // Roots grow almost immediately
        root.rotation.y = (i / rootCount) * Math.PI * 2 + Math.random() * 0.5;
        root.rotation.x = 0.15 + Math.random() * 0.1; // Subtly tilt down to hug surface
        root.position.y = -0.01;
        group.add(root);
    }

    for (const char of sentence) {
      if (char === 'F') {
        const randLen = length * (0.8 + Math.random() * 0.4);
        const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(currentQuat);
        const nextPos = currentPos.clone().add(dir.multiplyScalar(randLen));
        
        // Create branch
        const segments = config.key === 'cyber' ? 4 : 8;
        const branchGeom = new THREE.CylinderGeometry(currentThickness * 0.7, currentThickness, randLen, segments);
        branchGeom.translate(0, randLen / 2, 0);
        
        const depthFactor = Math.min(1, depth / (maxDepth || 1));
        const branchColor = new THREE.Color(config.treeColor).clone();
        
        // Organic color gradient: Darker/browner at base, lighter/leaf-colored at tips
        branchColor.lerp(new THREE.Color(config.leafColor), depthFactor * 0.5);
        
        const branchMat = new THREE.MeshPhysicalMaterial({ 
            color: branchColor,
            roughness: (config.key === 'cyber' || config.key === 'zenith' ? 0.1 : 0.7) + (1.0 - depthFactor) * 0.2,
            metalness: config.key === 'cyber' || config.key === 'zenith' ? 0.8 : 0.05,
            clearcoat: config.key === 'rainforest' ? 0.3 : 0,
            clearcoatRoughness: 0.2
        });

        // Improved organic subsurface scattering (fake SSS) + Zenith Liquid Gold
        branchMat.onBeforeCompile = (shader) => {
            shader.uniforms.depthFactor = { value: depthFactor };
            shader.uniforms.sssColor = { value: new THREE.Color(config.leafColor).multiplyScalar(0.25) };
            shader.uniforms.time = { value: 0 };
            
            const isZenith = config.key === 'zenith';
            const isOrganic = config.key !== 'cyber' && config.key !== 'zenith';

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `#include <common>
                 uniform float depthFactor;
                 uniform vec3 sssColor;
                 uniform float time;
                 varying vec3 vWorldPosition;
                 
                 // Simple noise for organic texture
                 float hash(vec3 p) {
                    p = fract(p * 0.3183099 + 0.1);
                    p *= 17.0;
                    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
                 }
                `
            ).replace(
                '#include <dithering_fragment>',
                `#include <dithering_fragment>
                 
                 // Add subtle internal glow (SSS) - peaks at thinner tips
                 float sssPower = depthFactor;
                 float sss = pow(sssPower, 2.0) * 0.25;
                 gl_FragColor.rgb += sssColor * sss;
                 
                 ${isOrganic ? `
                 // Organic grain and roughness variation
                 float noise = hash(vWorldPosition * 15.0);
                 gl_FragColor.rgb *= 0.92 + noise * 0.12;
                 ` : ''}

                 ${isZenith ? `
                 // Liquid Gold Flow for Zenith branches
                 float t = time * 0.8;
                 vec3 pos = vWorldPosition * 2.0;
                 float flow = sin(pos.y * 5.0 + t + sin(pos.x * 4.0 + t)) * 0.5 + 0.5;
                 float shimmer = pow(max(0.0, sin(pos.y * 30.0 + t * 5.0)), 15.0) * 0.4;
                 
                 // Hover-reactive pulse
                 float pulse = sin(time * 5.0) * 0.5 + 0.5;
                 gl_FragColor.rgb += vec3(1.0, 0.8, 0.2) * (flow * 0.15 + shimmer + pulse * 0.1);
                 ` : ''}
                 `
            );
            
            // We need world position for the flow
            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>
                 varying vec3 vWorldPosition;`
            ).replace(
                '#include <worldpos_vertex>',
                `#include <worldpos_vertex>
                 vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`
            );

            branchMat.userData.shader = shader;
        };

        const branch = new THREE.Mesh(branchGeom, branchMat);
        branch.position.copy(currentPos);
        branch.applyQuaternion(currentQuat);
        branch.userData.depth = depth;
        branch.userData.isBranch = true;
        branch.userData.baseRot = branch.rotation.clone();
        group.add(branch);

        currentPos = nextPos;
        currentThickness *= 0.85;
        depth++;
        maxDepth = Math.max(maxDepth, depth);
      } else if (char === '+') {
        const angle = baseAngle * (0.8 + Math.random() * 0.4);
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(angle, Math.random() * Math.PI, 0));
        currentQuat.multiply(q);
      } else if (char === '-') {
        const angle = -baseAngle * (0.8 + Math.random() * 0.4);
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(angle, Math.random() * Math.PI, 0));
        currentQuat.multiply(q);
      } else if (char === '[') {
        stack.push({ pos: currentPos.clone(), quat: currentQuat.clone(), thickness: currentThickness, depth: depth });
      } else if (char === ']') {
        const s = stack.pop()!;
        
        // Add a "leaf" or "flower" at the end of a branch
        if (Math.random() > 0.3) {
            const leafType = config.key;
            let leafGeom: THREE.BufferGeometry;
            let leafMat: THREE.Material;
            
            const leafDepthFactor = Math.min(1, depth / (maxDepth || 1));
            const colorVariation = 0.1 + Math.random() * 0.2;
            const finalLeafColor = new THREE.Color(config.leafColor).clone();
            finalLeafColor.lerp(new THREE.Color(0xffffff), colorVariation * 0.5);

            if (leafType === 'desert') {
                leafGeom = new THREE.BoxGeometry(0.12, 0.12, 0.12);
                leafMat = new THREE.MeshPhysicalMaterial({ 
                    color: finalLeafColor,
                    roughness: 0.9,
                    transmission: 0.05,
                    thickness: 0.5,
                    ior: 1.4
                });
            } else if (leafType === 'cyber') {
                leafGeom = new THREE.OctahedronGeometry(0.1, 0); 
                leafMat = new THREE.MeshPhysicalMaterial({ 
                    color: finalLeafColor,
                    roughness: 0.15,
                    metalness: 0.9,
                    emissive: finalLeafColor,
                    emissiveIntensity: 1.5,
                    transparent: true,
                    opacity: 0.85
                });
            } else if (leafType === 'deepsea') {
                leafGeom = new THREE.TorusGeometry(0.07, 0.025, 8, 16);
                leafMat = new THREE.MeshPhysicalMaterial({ 
                    color: finalLeafColor,
                    roughness: 0.1,
                    transmission: 0.95,
                    thickness: 1.0,
                    ior: 1.33,
                    attenuationColor: finalLeafColor,
                    attenuationDistance: 0.2,
                    emissive: new THREE.Color(0x00ffff).lerp(finalLeafColor, 0.4),
                    emissiveIntensity: 1.2
                });
            } else if (leafType === 'fungal') {
                leafGeom = new THREE.CylinderGeometry(0.14, 0.03, 0.1, 12);
                leafMat = new THREE.MeshPhysicalMaterial({
                    color: finalLeafColor,
                    emissive: finalLeafColor,
                    emissiveIntensity: 0.6,
                    roughness: 0.6,
                    sheen: 1.0,
                    sheenColor: 0xaa66ff
                });
            } else if (leafType === 'zenith') {
                leafGeom = new THREE.IcosahedronGeometry(0.12, 0);
                leafMat = new THREE.MeshPhysicalMaterial({
                    color: 0xffffff,
                    metalness: 1.0,
                    roughness: 0.0,
                    transmission: 0.5,
                    thickness: 0.5,
                    emissive: 0xffffff,
                    emissiveIntensity: 0.7
                });
            } else {
                leafGeom = new THREE.SphereGeometry(0.14, 5, 5);
                leafMat = new THREE.MeshPhysicalMaterial({ 
                    color: finalLeafColor,
                    roughness: 0.4,
                    transmission: 0.45,
                    thickness: 0.2,
                    ior: 1.45,
                    sheen: 1.0,
                    sheenColor: new THREE.Color(0xffffff),
                    emissive: finalLeafColor,
                    emissiveIntensity: 0.1 + (leafDepthFactor * 0.15)
                });
            }

            const leaf = new THREE.Mesh(leafGeom, leafMat);
            leaf.position.copy(currentPos);
            leaf.userData.depth = depth + 1; // Leaves sprout after branch
            leaf.userData.isLeaf = true;
            leaf.userData.baseRot = leaf.rotation.clone();
            group.add(leaf);
        }

        currentPos = s.pos;
        currentQuat = s.quat;
        currentThickness = s.thickness;
        depth = s.depth;
      }
    }

    group.userData.maxDepth = maxDepth + 1;
    return group;
  }

  update(mouse: THREE.Vector2, camera: THREE.Camera): { hoveredPos: THREE.Vector3 | null; influence: number } {
    const now = performance.now();
    const elapsed = (now - this.startTime) / 1000;
    const growthDuration = 3; // Total growth timeline
    
    let bestHoverPos: THREE.Vector3 | null = null;
    let maxInfluence = 0;

    this.groups.forEach(group => {
      group.children.forEach(pivot => {
        const plant = pivot.children[0] as THREE.Group;
        if (!plant) return;
        
        const { delay, growthSpeed, swayOffset } = plant.userData;
        const time = now * 0.001;
        
        // Calculate screen-space proximity for subtle hover effect
        const plantWorldPos = new THREE.Vector3();
        pivot.getWorldPosition(plantWorldPos);
        const projection = plantWorldPos.clone().project(camera);
        
        const distToMouse = mouse.distanceTo(new THREE.Vector2(projection.x, projection.y));
        const hoverInfluence = Math.max(0, 1.0 - distToMouse * 3.0); // Effective within closer range
        
        if (hoverInfluence > maxInfluence) {
          maxInfluence = hoverInfluence;
          bestHoverPos = plantWorldPos;
        }

        // Growth animation for each segment
        const totalT = this.isGrowing ? Math.max(0, Math.min(1, (elapsed - delay) / (growthDuration * growthSpeed))) : 1;
        const currentMaxDepth = plant.userData.maxDepth || 1;
        
        plant.children.forEach(child => {
          const segmentDepth = child.userData.depth || 0;
          
          // Calculate growth progress for this segment
          const depthThreshold = segmentDepth / currentMaxDepth;
          const segT = Math.max(0, Math.min(1, (totalT - depthThreshold * 0.6) * 3));
          const t = segT;

          // Update shader uniforms (for Zenith flow etc)
          if (child instanceof THREE.Mesh) {
            const mat = child.material as any;
            if (mat.userData && mat.userData.shader && mat.userData.shader.uniforms.time) {
                mat.userData.shader.uniforms.time.value = time;
            }
          }

          if (this.isGrowing) {
            // Smooth 'Back Out' easing for an organic organic spring/overshoot
            const s = 2.0; // Overshoot intensity
            let scale = 0;
            if (t > 0) {
              if (t < 1.0) {
                const t1 = t - 1;
                scale = t1 * t1 * ((s + 1) * t1 + s) + 1;
              } else {
                scale = 1.0;
              }
            }
            
            // Prevent negative scale during the very start of the back-ease if any
            scale = Math.max(0, scale);
                
            child.scale.set(scale, scale, scale);
          }
            
          // Subtle idle wiggle for segments (independent of growth)
          if ((child.userData.isBranch || child.userData.isLeaf) && child.userData.baseRot) {
            const wiggleSpeed = (child.userData.isLeaf ? 2.5 : 1.2) + hoverInfluence * 2.0;
            const wiggleAmt = (child.userData.isLeaf ? 0.06 : 0.03) + hoverInfluence * 0.04;
            
            // Lively 'snap' effect during growth
            let snapX = 0;
            if (this.isGrowing && t > 0.8 && t < 1.0) {
              const snapIntensity = (t - 0.8) * 5.0; // 0 to 1
              snapX = Math.sin(time * 15) * 0.02 * snapIntensity;
            }

            // Combine base rotation with wiggles and snaps
            child.rotation.x = child.userData.baseRot.x + snapX;
            child.rotation.y = child.userData.baseRot.y;
            child.rotation.z = child.userData.baseRot.z + Math.sin(time * wiggleSpeed + segmentDepth) * wiggleAmt;
          }
        });
        
        if (this.isGrowing) {
          // Overall plant entry scale (the pivot itself)
          const entryScale = totalT > 0 ? 1 : 0;
          if (plant.scale.x !== entryScale) plant.scale.set(entryScale, entryScale, entryScale);
        }

        // Sway/Wind effect (Gentle breeze + Mouse influence)
        const idleSwayIntensity = 0.04 + hoverInfluence * 0.08;
        const idleX = Math.sin(time * (0.8 + hoverInfluence) + swayOffset) * idleSwayIntensity;
        const idleZ = Math.cos(time * (0.7 + hoverInfluence) + swayOffset * 1.1) * idleSwayIntensity;

        const mouseX = mouse.x * (0.12 + hoverInfluence * 0.15); // Mouse tilt more when near
        const mouseY = mouse.y * (0.12 + hoverInfluence * 0.15);
        
        plant.rotation.x = idleZ + mouseY;
        plant.rotation.z = idleX + mouseX;
      });
    });

    return { hoveredPos: bestHoverPos, influence: maxInfluence };
  }

  clear() {
    this.groups.forEach(g => {
      this.scene.remove(g);
      g.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    });
    this.groups = [];
    this.isGrowing = false;
  }
}
