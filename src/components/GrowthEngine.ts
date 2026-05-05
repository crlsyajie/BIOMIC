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
        
        const depthFactor = Math.min(1, depth / (maxDepth || 10));
        const branchColor = new THREE.Color(config.treeColor).clone();
        // Shift color towards a lighter, more vibrant hue at the tips
        branchColor.lerp(new THREE.Color(config.leafColor), depthFactor * 0.4);
        
        const branchMat = new THREE.MeshStandardMaterial({ 
            color: branchColor,
            roughness: (config.key === 'cyber' || config.key === 'zenith' ? 0.1 : 0.8) - depthFactor * 0.2,
            metalness: config.key === 'cyber' || config.key === 'zenith' ? 1.0 : 0.05
        });

        // Add a subtle organic glow (fake SSS)
        branchMat.onBeforeCompile = (shader) => {
            shader.uniforms.depthFactor = { value: depthFactor };
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `#include <common>
                 uniform float depthFactor;`
            ).replace(
                '#include <dithering_fragment>',
                `#include <dithering_fragment>
                 gl_FragColor.rgb += vec3(0.05, 0.1, 0.05) * (1.0 - depthFactor) * 0.5;`
            );
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
            
            if (leafType === 'desert') {
                leafGeom = new THREE.BoxGeometry(0.1, 0.1, 0.1); // Succulent bit
            } else if (leafType === 'cyber') {
                leafGeom = new THREE.IcosahedronGeometry(0.08, 0);
            } else {
                leafGeom = new THREE.SphereGeometry(0.12, 5, 5);
            }

            const leafDepthFactor = Math.min(1, depth / (maxDepth || 10));
            const colorVariation = 0.1 + Math.random() * 0.2;
            const finalLeafColor = new THREE.Color(config.leafColor).clone();
            finalLeafColor.lerp(new THREE.Color(0xffffff), colorVariation * 0.5);

            const leafMat = new THREE.MeshPhysicalMaterial({ 
                color: finalLeafColor,
                roughness: 0.6,
                transmission: 0.3, // Semi-translucent for organic feel
                thickness: 0.05,
                ior: 1.4,
                sheen: 0.5,
                sheenColor: new THREE.Color(0xffffff),
                emissive: finalLeafColor,
                emissiveIntensity: leafType === 'cyber' ? 1.0 : 0.15 + (leafDepthFactor * 0.2)
            });

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

  update(mouse: THREE.Vector2) {
    const now = performance.now();
    const elapsed = (now - this.startTime) / 1000;
    const growthDuration = 3; // Total growth timeline

    this.groups.forEach(group => {
      group.children.forEach(pivot => {
        const plant = pivot.children[0] as THREE.Group;
        if (!plant) return;
        
        const { delay, growthSpeed, swayOffset, maxDepth } = plant.userData;
        const time = now * 0.001;
        
        // Growth animation for each segment
        const totalT = this.isGrowing ? Math.max(0, Math.min(1, (elapsed - delay) / (growthDuration * growthSpeed))) : 1;
        const currentMaxDepth = plant.userData.maxDepth || 1;
        
        plant.children.forEach(child => {
          const segmentDepth = child.userData.depth || 0;
          
          // Calculate growth progress for this segment
          const depthThreshold = segmentDepth / currentMaxDepth;
          const segT = Math.max(0, Math.min(1, (totalT - depthThreshold * 0.6) * 3));
          const t = segT;

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
            const wiggleSpeed = child.userData.isLeaf ? 2.5 : 1.2;
            const wiggleAmt = child.userData.isLeaf ? 0.06 : 0.03;
            
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
        const idleSwayIntensity = 0.04;
        const idleX = Math.sin(time * 0.8 + swayOffset) * idleSwayIntensity;
        const idleZ = Math.cos(time * 0.7 + swayOffset * 1.1) * idleSwayIntensity;

        const windIntensity = 0.05 + (this.isGrowing ? 0.03 : 0);
        const mouseX = mouse.x * 0.12;
        const mouseY = mouse.y * 0.12;
        
        plant.rotation.x = idleZ + mouseY;
        plant.rotation.z = idleX + mouseX;
      });
    });
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
