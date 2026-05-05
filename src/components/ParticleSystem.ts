import * as THREE from 'three';
import { BiomeConfig } from './biomes';

export class ParticleSystem {
  scene: THREE.Scene;
  particles: THREE.Points | THREE.Group | null = null;
  type: string = 'none';

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  generateForBiome(biome: BiomeConfig) {
    this.clear();
    this.type = biome.key;

    if (biome.key === 'volcanic') {
      this.createVolcanicParticles();
    } else if (biome.key === 'autumn') {
      this.createAutumnParticles();
    } else if (biome.key === 'zenith') {
      this.createZenithParticles();
    } else {
      this.createGenericParticles(biome.leafColor);
    }
  }

  burst(color: number) {
    const geo = new THREE.BufferGeometry();
    const count = 200;
    const pos = new Float32Array(count * 3);
    const vels = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
        pos[i*3] = 0;
        pos[i*3+1] = 0;
        pos[i*3+2] = 0;
        
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed = 0.1 + Math.random() * 0.2;
        
        vels[i*3] = Math.sin(phi) * Math.cos(theta) * speed;
        vels[i*3+1] = Math.sin(phi) * Math.sin(theta) * speed;
        vels[i*3+2] = Math.cos(phi) * speed;
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ 
        color, 
        size: 0.1, 
        transparent: true, 
        opacity: 1,
        blending: THREE.AdditiveBlending 
    });
    
    const burstPoints = new THREE.Points(geo, mat);
    burstPoints.userData.vels = vels;
    burstPoints.userData.life = 1.0;
    
    this.scene.add(burstPoints);
    
    // Auto-remove burst
    const animateBurst = () => {
        burstPoints.userData.life -= 0.02;
        if (burstPoints.userData.life <= 0) {
            this.scene.remove(burstPoints);
            geo.dispose();
            mat.dispose();
            return;
        }
        
        const pArr = geo.attributes.position.array as Float32Array;
        const vArr = burstPoints.userData.vels;
        for (let i = 0; i < pArr.length; i++) {
            pArr[i] += vArr[i];
            vArr[i] *= 0.98; // Friction
        }
        geo.attributes.position.needsUpdate = true;
        mat.opacity = burstPoints.userData.life;
        
        requestAnimationFrame(animateBurst);
    };
    
    animateBurst();
  }

  private createVolcanicParticles() {
    const group = new THREE.Group();
    
    // Ash (rising dark particles)
    const ashCount = 300;
    const ashGeo = new THREE.BufferGeometry();
    const ashPos = new Float32Array(ashCount * 3);
    const ashVels = new Float32Array(ashCount);
    for (let i = 0; i < ashCount; i++) {
      ashPos[i * 3] = (Math.random() - 0.5) * 30;
      ashPos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      ashPos[i * 3 + 2] = (Math.random() - 0.5) * 15;
      ashVels[i] = 0.01 + Math.random() * 0.03;
    }
    ashGeo.setAttribute('position', new THREE.BufferAttribute(ashPos, 3));
    const ashMat = new THREE.PointsMaterial({ 
      color: 0x222222, 
      size: 0.08, 
      transparent: true, 
      opacity: 0.6 
    });
    const ash = new THREE.Points(ashGeo, ashMat);
    ash.userData.vels = ashVels;
    group.add(ash);

    // Lava Embers (twinkling hot particles)
    const sparkCount = 150;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkVels = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      sparkPos[i * 3] = (Math.random() - 0.5) * 10;
      sparkPos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      sparkVels[i * 3] = (Math.random() - 0.5) * 0.02;
      sparkVels[i * 3 + 1] = 0.05 + Math.random() * 0.1;
      sparkVels[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({ 
      color: 0xff6600, 
      size: 0.12, 
      transparent: true, 
      opacity: 1.0,
      blending: THREE.AdditiveBlending 
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    sparks.userData.vels = sparkVels;
    group.add(sparks);

    this.particles = group;
    this.scene.add(group);
  }

  private createAutumnParticles() {
    const group = new THREE.Group();
    const leafCount = 60;
    const colors = [0xd35400, 0xe67e22, 0xc0392b, 0xf1c40f];
    
    for (let i = 0; i < leafCount; i++) {
      const geometry = new THREE.PlaneGeometry(0.12, 0.12);
      const material = new THREE.MeshStandardMaterial({ 
        color: colors[Math.floor(Math.random() * colors.length)], 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        roughness: 0.8
      });
      const leaf = new THREE.Mesh(geometry, material);
      leaf.position.set((Math.random() - 0.5) * 30, 10 + Math.random() * 10, (Math.random() - 0.5) * 20);
      leaf.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      
      leaf.userData.rotVel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05
      );
      leaf.userData.fallVel = 0.03 + Math.random() * 0.04;
      leaf.userData.swayOffset = Math.random() * Math.PI * 2;
      group.add(leaf);
    }
    this.particles = group;
    this.scene.add(group);
  }

  private createZenithParticles() {
    const geo = new THREE.BufferGeometry();
    const count = 500;
    const pos = new Float32Array(count * 3);
    const life = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
        pos[i*3] = (Math.random() - 0.5) * 40;
        pos[i*3+1] = (Math.random() - 0.5) * 30;
        pos[i*3+2] = (Math.random() - 0.5) * 30;
        life[i] = Math.random();
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('life', new THREE.BufferAttribute(life, 1));
    
    const mat = new THREE.PointsMaterial({ 
        color: 0xffe066, 
        size: 0.05, 
        transparent: true, 
        opacity: 0.7,
        blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geo, mat);
    points.userData.timeOffset = Math.random() * 1000;
    this.particles = points;
    this.scene.add(points);
  }

  private createGenericParticles(color: number) {
    const geo = new THREE.BufferGeometry();
    const count = 150;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        pos[i*3] = (Math.random() - 0.5) * 30;
        pos[i*3+1] = (Math.random() - 0.5) * 30;
        pos[i*3+2] = (Math.random() - 0.5) * 30;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.04, transparent: true, opacity: 0.5 });
    const points = new THREE.Points(geo, mat);
    this.particles = points;
    this.scene.add(points);
  }

  update() {
    if (!this.particles) return;
    const time = performance.now() * 0.001;

    if (this.type === 'volcanic' && this.particles instanceof THREE.Group) {
      this.particles.children.forEach((child, idx) => {
        const pArr = (child as THREE.Points).geometry.attributes.position.array as Float32Array;
        if (idx === 0) { // Ash
          const vels = child.userData.vels;
          for (let i = 0; i < pArr.length / 3; i++) {
            pArr[i*3+1] += vels[i];
            pArr[i*3] += Math.sin(time + i) * 0.01;
            if (pArr[i*3+1] > 15) pArr[i*3+1] = -10;
          }
        } else { // Lava Sparks
          const vels = child.userData.vels;
          for (let i = 0; i < pArr.length / 3; i++) {
            pArr[i*3] += vels[i*3];
            pArr[i*3+1] += vels[i*3+1];
            pArr[i*3+2] += vels[i*3+2];
            vels[i*3+1] -= 0.002; // Gravity
            if (pArr[i*3+1] < -10 || Math.random() < 0.01) {
                pArr[i*3] = (Math.random() - 0.5) * 5;
                pArr[i*3+1] = -2;
                pArr[i*3+2] = (Math.random() - 0.5) * 5;
                vels[i*3+1] = 0.1 + Math.random() * 0.15;
            }
          }
        }
        (child as THREE.Points).geometry.attributes.position.needsUpdate = true;
      });
    }

    if (this.type === 'autumn' && this.particles instanceof THREE.Group) {
        this.particles.children.forEach(leaf => {
            const mesh = leaf as THREE.Mesh;
            mesh.position.y -= mesh.userData.fallVel;
            mesh.position.x += Math.sin(time + mesh.userData.swayOffset) * 0.02;
            mesh.rotation.x += mesh.userData.rotVel.x;
            mesh.rotation.y += mesh.userData.rotVel.y;
            mesh.rotation.z += mesh.userData.rotVel.z;
            if (mesh.position.y < -10) {
              mesh.position.y = 15;
              mesh.position.x = (Math.random() - 0.5) * 30;
            }
        });
    }

    if (this.type === 'zenith' && this.particles instanceof THREE.Points) {
        const posArr = this.particles.geometry.attributes.position.array as Float32Array;
        const mat = this.particles.material as THREE.PointsMaterial;
        mat.opacity = 0.5 + Math.sin(time * 2.0) * 0.2; // Twinkle
        
        for (let i = 0; i < posArr.length; i += 3) {
            posArr[i] += Math.sin(time * 0.5 + posArr[i+1]) * 0.015;
            posArr[i+1] += Math.sin(time * 0.3 + posArr[i]) * 0.015;
            posArr[i+2] += Math.cos(time * 0.4 + posArr[i]) * 0.015;
        }
        this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }

  clear() {
    if (this.particles) {
      this.scene.remove(this.particles);
      if (this.particles instanceof THREE.Group) {
          this.particles.traverse(c => {
             if (c instanceof THREE.Mesh || c instanceof THREE.Points) {
                 c.geometry.dispose();
                 if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
                 else c.material.dispose();
             }
          });
      } else {
        this.particles.geometry.dispose();
        (this.particles.material as THREE.Material).dispose();
      }
      this.particles = null;
    }
  }
}
