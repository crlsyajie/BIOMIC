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

    switch (biome.key) {
      case 'sakura': this.createSakuraParticles(); break;
      case 'monsoon': this.createMonsoonParticles(); break;
      case 'autumn': this.createAutumnParticles(); break;
      case 'cactus': this.createCactusParticles(); break;
      case 'meadow': this.createMeadowParticles(); break;
      case 'winter': this.createWinterParticles(); break;
      case 'lavender': this.createLavenderParticles(); break;
      case 'deepsea': this.createDeepSeaParticles(); break;
      case 'mushroom': this.createMushroomParticles(); break;
      case 'zenith': this.createZenithParticles(); break;
      default: this.createGenericParticles(biome.leafColor);
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

  private createSakuraParticles() {
    const group = new THREE.Group();
    const count = 100;
    for (let i = 0; i < count; i++) {
        const geo = new THREE.PlaneGeometry(0.1, 0.1);
        const mat = new THREE.MeshStandardMaterial({
            color: Math.random() > 0.5 ? 0xffb7c5 : 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        const petal = new THREE.Mesh(geo, mat);
        petal.position.set((Math.random() - 0.5) * 40, 10 + Math.random() * 10, (Math.random() - 0.5) * 30);
        petal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        petal.userData.rotVel = new THREE.Vector3((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, Math.random() * 0.05);
        petal.userData.fallVel = 0.02 + Math.random() * 0.03;
        petal.userData.swayOffset = Math.random() * Math.PI * 2;
        group.add(petal);
    }
    this.particles = group;
    this.scene.add(group);
  }

  private createMonsoonParticles() {
    const group = new THREE.Group();
    const dropCount = 500;
    const dropGeo = new THREE.BufferGeometry();
    const dropPos = new Float32Array(dropCount * 3);
    for (let i = 0; i < dropCount; i++) {
      dropPos[i * 3] = (Math.random() - 0.5) * 40;
      dropPos[i * 3 + 1] = Math.random() * 30;
      dropPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    dropGeo.setAttribute('position', new THREE.BufferAttribute(dropPos, 3));
    const dropMat = new THREE.PointsMaterial({ color: 0xaaccff, size: 0.05, transparent: true, opacity: 0.4 });
    const drops = new THREE.Points(dropGeo, dropMat);
    drops.userData.isDrops = true;
    group.add(drops);
    this.particles = group;
    this.scene.add(group);
  }

  private createCactusParticles() {
    const geo = new THREE.BufferGeometry();
    const count = 300;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        pos[i*3] = (Math.random() - 0.5) * 30;
        pos[i*3+1] = (Math.random() - 0.5) * 30;
        pos[i*3+2] = (Math.random() - 0.5) * 30;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffd700, size: 0.03, transparent: true, opacity: 0.6 });
    const points = new THREE.Points(geo, mat);
    points.userData.isPollen = true;
    this.particles = points;
    this.scene.add(points);
  }

  private createMeadowParticles() {
    const group = new THREE.Group();
    const count = 30; // Increased count for better atmosphere
    for (let i = 0; i < count; i++) {
        const geo = new THREE.PlaneGeometry(0.12, 0.1);
        const mat = new THREE.MeshBasicMaterial({ 
          color: 0xffffff, 
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6 // Slight translucency as requested
        });
        const butterfly = new THREE.Mesh(geo, mat);
        // Wider spread for butterflies
        butterfly.position.set((Math.random() - 0.5) * 40, 2 + Math.random() * 8, (Math.random() - 0.5) * 40);
        butterfly.userData.center = butterfly.position.clone();
        butterfly.userData.timeOffset = Math.random() * 100;
        butterfly.userData.isButterfly = true;
        // Random speed factors for more variety
        butterfly.userData.speedX = 0.3 + Math.random() * 0.5;
        butterfly.userData.speedY = 0.2 + Math.random() * 0.4;
        butterfly.userData.speedZ = 0.4 + Math.random() * 0.6;
        group.add(butterfly);
    }
    this.particles = group;
    this.scene.add(group);
  }

  private createWinterParticles() {
    const geo = new THREE.BufferGeometry();
    const count = 1000;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        pos[i*3] = (Math.random() - 0.5) * 50;
        pos[i*3+1] = Math.random() * 30;
        pos[i*3+2] = (Math.random() - 0.5) * 50;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.8 });
    const points = new THREE.Points(geo, mat);
    points.userData.isSnow = true;
    this.particles = points;
    this.scene.add(points);
  }

  private createLavenderParticles() {
    this.createMeadowParticles();
    // Butterflies should remain white for lavender biome as per request
  }

  private createDeepSeaParticles() {
    const group = new THREE.Group();
    const bubbleCount = 200;
    const bubbleGeo = new THREE.BufferGeometry();
    const bubblePos = new Float32Array(bubbleCount * 3);
    const bubbleVels = new Float32Array(bubbleCount);
    for (let i = 0; i < bubbleCount; i++) {
        bubblePos[i*3] = (Math.random() - 0.5) * 40;
        bubblePos[i*3+1] = (Math.random() - 0.5) * 20;
        bubblePos[i*3+2] = (Math.random() - 0.5) * 40;
        bubbleVels[i] = 0.02 + Math.random() * 0.05;
    }
    bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePos, 3));
    const bubbleMat = new THREE.PointsMaterial({ color: 0x88ffff, size: 0.08, transparent: true, opacity: 0.4 });
    const bubbles = new THREE.Points(bubbleGeo, bubbleMat);
    bubbles.userData.isBubbles = true;
    bubbles.userData.vels = bubbleVels;
    group.add(bubbles);
    this.particles = group;
    this.scene.add(group);
  }

  private createMushroomParticles() {
    const geo = new THREE.BufferGeometry();
    const count = 400;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        pos[i*3] = (Math.random() - 0.5) * 30;
        pos[i*3+1] = (Math.random() - 0.5) * 30;
        pos[i*3+2] = (Math.random() - 0.5) * 30;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.04, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
    const points = new THREE.Points(geo, mat);
    points.userData.isSpores = true;
    this.particles = points;
    this.scene.add(points);
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

    if (this.particles instanceof THREE.Group) {
      this.particles.children.forEach((child) => {
        if (child.userData.fallVel) { // Sakura / Autumn
          const mesh = child as THREE.Mesh;
          mesh.position.y -= mesh.userData.fallVel;
          mesh.position.x += Math.sin(time + mesh.userData.swayOffset) * 0.03;
          mesh.rotation.x += mesh.userData.rotVel.x;
          mesh.rotation.y += mesh.userData.rotVel.y;
          mesh.rotation.z += mesh.userData.rotVel.z;
          if (mesh.position.y < -15) {
            mesh.position.y = 20;
            mesh.position.x = (Math.random() - 0.5) * 50;
          }
        } else if (child.userData.isButterfly) {
          const mesh = child as THREE.Mesh;
          const t = time + mesh.userData.timeOffset;
          // More subtle and random movement pattern
          mesh.position.x = mesh.userData.center.x + Math.sin(t * mesh.userData.speedX) * 4;
          mesh.position.y = mesh.userData.center.y + Math.cos(t * mesh.userData.speedY) * 2;
          mesh.position.z = mesh.userData.center.z + Math.sin(t * mesh.userData.speedZ) * 4;
          // Flapping effect
          mesh.scale.x = Math.sin(t * 20) > 0 ? 0.8 : -0.8;
          mesh.rotation.y = Math.atan2(Math.cos(t * mesh.userData.speedX), Math.sin(t * mesh.userData.speedZ));
        } else if (child instanceof THREE.Points && child.userData.isDrops) {
          const pArr = child.geometry.attributes.position.array as Float32Array;
          for (let i = 0; i < pArr.length; i += 3) {
            pArr[i+1] -= 0.6;
            if (pArr[i+1] < -15) pArr[i+1] = 25;
          }
          child.geometry.attributes.position.needsUpdate = true;
        } else if (child instanceof THREE.Points && child.userData.isBubbles) {
          const pArr = child.geometry.attributes.position.array as Float32Array;
          const vels = child.userData.vels;
          for (let i = 0; i < pArr.length / 3; i++) {
            pArr[i*3+1] += vels[i];
            pArr[i*3] += Math.sin(time + i) * 0.02;
            if (pArr[i*3+1] > 20) pArr[i*3+1] = -15;
          }
          child.geometry.attributes.position.needsUpdate = true;
        }
      });
    }

    if (this.particles instanceof THREE.Points) {
        const pArr = this.particles.geometry.attributes.position.array as Float32Array;
        if (this.particles.userData.isSnow) {
          for (let i = 0; i < pArr.length; i += 3) {
            pArr[i+1] -= 0.03;
            pArr[i] += Math.sin(time + i) * 0.01;
            if (pArr[i+1] < -15) pArr[i+1] = 25;
          }
          this.particles.geometry.attributes.position.needsUpdate = true;
        } else if (this.particles.userData.isPollen || this.particles.userData.isSpores) {
          for (let i = 0; i < pArr.length; i += 3) {
            pArr[i] += Math.sin(time * 0.4 + i) * 0.02;
            pArr[i+1] += Math.cos(time * 0.4 + i) * 0.02;
          }
          this.particles.geometry.attributes.position.needsUpdate = true;
        }
    }

    if (this.type === 'zenith' && this.particles instanceof THREE.Points) {
        const posArr = this.particles.geometry.attributes.position.array as Float32Array;
        const mat = this.particles.material as THREE.PointsMaterial;
        mat.opacity = 0.5 + Math.sin(time * 2.0) * 0.2; // Twinkle
        
        for (let i = 0; i < posArr.length; i += 3) {
            posArr[i] += Math.sin(time * 0.5 + i) * 0.015;
            posArr[i+1] += Math.sin(time * 0.3 + i) * 0.015;
            posArr[i+2] += Math.cos(time * 0.4 + i) * 0.015;
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
