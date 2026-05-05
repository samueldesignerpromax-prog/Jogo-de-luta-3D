import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// ========== CONFIGURAÇÃO INICIAL ==========
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050b1a);
scene.fog = new THREE.FogExp2(0x050b1a, 0.02);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 3.5, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ========== UI ==========
let loadingScreen = document.getElementById('loading');
let uiScreen = document.getElementById('ui');

// ========== ILUMINAÇÃO REALISTA ==========
// Luz ambiente
const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
scene.add(ambientLight);

// Luz direcional principal (sol)
const mainLight = new THREE.DirectionalLight(0xfff5e6, 1.3);
mainLight.position.set(5, 12, 4);
mainLight.castShadow = true;
mainLight.receiveShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.near = 0.5;
mainLight.shadow.camera.far = 25;
mainLight.shadow.camera.left = -10;
mainLight.shadow.camera.right = 10;
mainLight.shadow.camera.top = 10;
mainLight.shadow.camera.bottom = -10;
scene.add(mainLight);

// Luz de preenchimento
const fillLight = new THREE.PointLight(0x4466cc, 0.5);
fillLight.position.set(-3, 5, -4);
scene.add(fillLight);

// Luz de rim (contorno)
const rimLight = new THREE.PointLight(0xffaa66, 0.6);
rimLight.position.set(-2, 3, -5);
scene.add(rimLight);

// Luz dinâmica do jogador
const playerLight = new THREE.PointLight(0xff8844, 0.8, 12);
playerLight.castShadow = true;
scene.add(playerLight);

// Luz de chão
const groundLight = new THREE.PointLight(0x3366aa, 0.3);
groundLight.position.y = 1;
scene.add(groundLight);

// ========== CENÁRIO ==========
// Chão com textura
const groundMat = new THREE.MeshStandardMaterial({ 
    color: 0x2a3a2a, 
    roughness: 0.85, 
    metalness: 0.1,
    flatShading: false
});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(35, 35), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.6;
ground.receiveShadow = true;
scene.add(ground);

// Grade decorativa
const gridHelper = new THREE.GridHelper(35, 20, 0x88aa88, 0x446644);
gridHelper.position.y = -0.55;
scene.add(gridHelper);

// Arena circular
const arenaBorder = new THREE.Mesh(
    new THREE.TorusGeometry(12, 0.3, 32, 100),
    new THREE.MeshStandardMaterial({ color: 0xaa8866, metalness: 0.5, roughness: 0.3 })
);
arenaBorder.rotation.x = Math.PI / 2;
arenaBorder.position.y = -0.55;
arenaBorder.receiveShadow = true;
scene.add(arenaBorder);

// Árvores decorativas
class Tree {
    constructor(x, z) {
        this.group = new THREE.Group();
        
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 });
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 1.8, 8), trunkMat);
        trunk.castShadow = true;
        trunk.position.y = 0.6;
        this.group.add(trunk);
        
        const foliageMat = new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.5 });
        const foliage1 = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.2, 8), foliageMat);
        foliage1.position.y = 1.4;
        foliage1.castShadow = true;
        this.group.add(foliage1);
        
        const foliage2 = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.9, 8), foliageMat);
        foliage2.position.y = 2.0;
        foliage2.castShadow = true;
        this.group.add(foliage2);
        
        this.group.position.set(x, -0.6, z);
        scene.add(this.group);
    }
}

// Criar árvores ao redor da arena
for (let i = 0; i < 50; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 13 + Math.random() * 4;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    new Tree(x, z);
}

// Pedras decorativas
const rockMat = new THREE.MeshStandardMaterial({ color: 0x6b5a4a, roughness: 0.9 });
for (let i = 0; i < 120; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15), rockMat);
    const angle = Math.random() * Math.PI * 2;
    const radius = 8 + Math.random() * 5;
    rock.position.x = Math.cos(angle) * radius;
    rock.position.z = Math.sin(angle) * radius;
    rock.position.y = -0.6;
    rock.scale.setScalar(0.5 + Math.random() * 1);
    rock.castShadow = true;
    scene.add(rock);
}

// ========== CRIAÇÃO DO PERSONAGEM NINJA (DETALHADO) ==========
class Ninja {
    constructor() {
        this.group = new THREE.Group();
        this.animTime = 0;
        this.isRunning = false;
        this.attackRotation = 0;
        
        // Cores e materiais
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xe8c8a8, roughness: 0.25, metalness: 0.05 });
        const clothMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3c, roughness: 0.3, metalness: 0.1 });
        const armorMat = new THREE.MeshStandardMaterial({ color: 0xccaa77, metalness: 0.7, roughness: 0.3 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffcc66, metalness: 0.9 });
        const weaponMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.95 });
        const redMat = new THREE.MeshStandardMaterial({ color: 0xdd3333 });
        
        // Corpo principal
        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.45, 1.2, 12);
        this.body = new THREE.Mesh(bodyGeo, clothMat);
        this.body.castShadow = true;
        this.body.position.y = 0.6;
        this.group.add(this.body);
        
        // Armadura de peito
        const chestGeo = new THREE.BoxGeometry(0.68, 0.55, 0.45);
        const chestArmor = new THREE.Mesh(chestGeo, armorMat);
        chestArmor.position.y = 0.68;
        chestArmor.castShadow = true;
        this.group.add(chestArmor);
        
        // Detalhes dourados na armadura
        const goldTrim = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.05, 8, 32), goldMat);
        goldTrim.rotation.x = Math.PI / 2;
        goldTrim.position.y = 0.88;
        this.group.add(goldTrim);
        
        // Cabeça
        const headGeo = new THREE.SphereGeometry(0.46, 32, 32);
        this.head = new THREE.Mesh(headGeo, skinMat);
        this.head.position.y = 1.2;
        this.head.castShadow = true;
        this.group.add(this.head);
        
        // Cabelo (faixa ninja)
        const hairGeo = new THREE.CylinderGeometry(0.5, 0.54, 0.25, 8);
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a });
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.y = 1.45;
        hair.castShadow = true;
        this.group.add(hair);
        
        // Faixa vermelha
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.07, 8, 32), redMat);
        band.rotation.x = Math.PI / 2;
        band.position.y = 1.35;
        this.group.add(band);
        
        // Olhos realistas
        const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 32, 32), eyeWhiteMat);
        leftEye.position.set(-0.17, 1.28, 0.48);
        const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 32, 32), eyeWhiteMat);
        rightEye.position.set(0.17, 1.28, 0.48);
        
        const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 32, 32), pupilMat);
        leftPupil.position.set(-0.17, 1.26, 0.56);
        const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 32, 32), pupilMat);
        rightPupil.position.set(0.17, 1.26, 0.56);
        
        this.group.add(leftEye, rightEye, leftPupil, rightPupil);
        
        // Sobrancelhas
        const browMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a });
        const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.05), browMat);
        leftBrow.position.set(-0.19, 1.36, 0.48);
        const rightBrow = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.05), browMat);
        rightBrow.position.set(0.19, 1.36, 0.48);
        this.group.add(leftBrow, rightBrow);
        
        // Katana principal (nas costas)
        const katanaBlade = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.0, 0.07), weaponMat);
        katanaBlade.position.set(0.45, 0.7, 0.28);
        katanaBlade.rotation.z = 0.35;
        const katanaHandle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
        katanaHandle.position.set(0.45, 1.18, 0.28);
        katanaHandle.rotation.z = 0.35;
        this.group.add(katanaBlade, katanaHandle);
        
        // Katana secundária (cintura)
        const wakizashi = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.05), weaponMat);
        wakizashi.position.set(-0.4, 0.55, 0.35);
        wakizashi.rotation.z = -0.2;
        this.group.add(wakizashi);
        
        // Ombreiras
        const shoulderMat = new THREE.MeshStandardMaterial({ color: 0xaa8866, metalness: 0.6 });
        const leftShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), shoulderMat);
        leftShoulder.position.set(-0.5, 0.95, 0);
        const rightShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), shoulderMat);
        rightShoulder.position.set(0.5, 0.95, 0);
        this.group.add(leftShoulder, rightShoulder);
        
        // Capa ninja
        const capeMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.5 });
        const cape = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 0.08), capeMat);
        cape.position.set(0, 0.55, -0.48);
        cape.castShadow = true;
        this.group.add(cape);
        
        // Pernas com proteção
        const legMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a });
        const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.7, 8), legMat);
        leftLeg.position.set(-0.22, 0.2, 0);
        const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.7, 8), legMat);
        rightLeg.position.set(0.22, 0.2, 0);
        this.group.add(leftLeg, rightLeg);
        
        this.group.position.set(0, -0.6, 0);
        scene.add(this.group);
        
        // Stats
        this.health = 100;
        this.maxHealth = 100;
        this.velocityY = 0;
        this.isGrounded = true;
        this.baseSpeed = 4.5;
        this.speed = this.baseSpeed;
        this.attackCooldown = 0;
        this.combo = 0;
        this.lastAttackTime = 0;
    }
    
    update(delta, keys, shiftPressed) {
        this.speed = shiftPressed ? this.baseSpeed * 1.6 : this.baseSpeed;
        this.isRunning = shiftPressed && this.isMoving(keys);
        
        let moveX = 0, moveZ = 0;
        if (keys.ArrowUp || keys.KeyW) moveZ -= 1;
        if (keys.ArrowDown || keys.KeyS) moveZ += 1;
        if (keys.ArrowLeft || keys.KeyA) moveX -= 1;
        if (keys.ArrowRight || keys.KeyD) moveX += 1;
        
        if (moveX !== 0 || moveZ !== 0) {
            const len = Math.hypot(moveX, moveZ);
            moveX /= len;
            moveZ /= len;
        }
        
        let newX = this.group.position.x + moveX * this.speed * delta;
        let newZ = this.group.position.z + moveZ * this.speed * delta;
        
        // Limites da arena
        const arenaRadius = 12;
        if (Math.hypot(newX, newZ) > arenaRadius) {
            const angle = Math.atan2(newZ, newX);
            newX = Math.cos(angle) * arenaRadius;
            newZ = Math.sin(angle) * arenaRadius;
        }
        
        this.group.position.x = newX;
        this.group.position.z = newZ;
        
        // Pulo
        if (keys.Space && this.isGrounded) {
            this.velocityY = 6.2;
            this.isGrounded = false;
        }
        
        // Gravidade
        if (!this.isGrounded) {
            this.velocityY -= 15 * delta;
            this.group.position.y += this.velocityY * delta;
            if (this.group.position.y <= -0.6) {
                this.group.position.y = -0.6;
                this.isGrounded = true;
                this.velocityY = 0;
            }
        }
        
        // Cooldown
        if (this.attackCooldown > 0) this.attackCooldown -= delta;
        
        // Rotação suave
        if (moveX !== 0 || moveZ !== 0) {
            const targetAngle = Math.atan2(moveX, moveZ);
            this.group.rotation.y = targetAngle;
        }
        
        // Animações
        this.animTime += delta * 8;
        if (this.isGrounded && !this.isRunning && this.attackCooldown <= 0) {
            // Idle animation (respiração)
            this.body.position.y = 0.6 + Math.sin(this.animTime) * 0.005;
            this.head.position.y = 1.2 + Math.sin(this.animTime * 1.5) * 0.003;
        } else if (this.isRunning) {
            // Correndo
            this.body.rotation.x = Math.sin(this.animTime * 15) * 0.1;
        }
    }
    
    isMoving(keys) {
        return keys.ArrowUp || keys.KeyW || keys.ArrowDown || keys.KeyS || 
               keys.ArrowLeft || keys.KeyA || keys.ArrowRight || keys.KeyD;
    }
    
    attack() {
        if (this.attackCooldown <= 0) {
            this.attackCooldown = 0.45;
            const now = Date.now();
            if (now - this.lastAttackTime < 800) {
                this.combo = Math.min(5, this.combo + 1);
            } else {
                this.combo = 1;
            }
            this.lastAttackTime = now;
            
            // Efeito visual de ataque
            const slashGroup = new THREE.Group();
            const slashMat = new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff4400, emissiveIntensity: 0.8 });
            const slash = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), slashMat);
            slash.position.set(Math.sin(this.group.rotation.y) * 1.4, 0.8, Math.cos(this.group.rotation.y) * 1.4);
            slashGroup.add(slash);
            slashGroup.position.copy(this.group.position);
            scene.add(slashGroup);
            setTimeout(() => scene.remove(slashGroup), 150);
            
            return true;
        }
        return false;
    }
    
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        this.body.material.color.setHex(0x4a2a3c);
        setTimeout(() => { if(this.health > 0) this.body.material.color.setHex(0x1a2a3c); }, 150);
        return this.health <= 0;
    }
    
    getPosition() {
        return this.group.position;
    }
}

// ========== INIMIGO SAMURAI ==========
class SamuraiEnemy {
    constructor(x, z) {
        this.group = new THREE.Group();
        this.animTime = Math.random() * Math.PI * 2;
        this.health = 100;
        this.maxHealth = 100;
        this.alive = true;
        
        // Materiais
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, metalness: 0.6, roughness: 0.4 });
        const darkArmorMat = new THREE.MeshStandardMaterial({ color: 0x3a2a2a, metalness: 0.5 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xccaa88 });
        const weaponMat = new THREE.MeshStandardMaterial({ color: 0x9999bb, metalness: 0.9 });
        const redMat = new THREE.MeshStandardMaterial({ color: 0xcc4444 });
        
        // Corpo
        const bodyGeo = new THREE.CylinderGeometry(0.52, 0.48, 1.25, 8);
        this.bodyMesh = new THREE.Mesh(bodyGeo, darkArmorMat);
        this.bodyMesh.castShadow = true;
        this.bodyMesh.position.y = 0.62;
        this.group.add(this.bodyMesh);
        
        // Armadura de placas
        for (let i = 0; i < 4; i++) {
            const plate = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.13, 0.48), armorMat);
            plate.position.y = 0.42 + i * 0.34;
            plate.castShadow = true;
            this.group.add(plate);
        }
        
        // Cabeça
        const headGeo = new THREE.SphereGeometry(0.44, 32, 32);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 1.2;
        head.castShadow = true;
        this.group.add(head);
        
        // Capacete Kabuto
        const kabutoMat = new THREE.MeshStandardMaterial({ color: 0xaa8866, metalness: 0.7 });
        const kabuto = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.56, 0.4, 8), kabutoMat);
        kabuto.position.y = 1.48;
        kabuto.castShadow = true;
        this.group.add(kabuto);
        
        // Crista do capacete
        const crest = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 6), kabutoMat);
        crest.position.y = 1.7;
        this.group.add(crest);
        
        // Máscara Oni (demoníaca)
        const mask = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.06), redMat);
        mask.position.set(0, 1.2, 0.48);
        this.group.add(mask);
        
        // Olhos vermelhos
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x440000 });
        const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), eyeMat);
        leftEye.position.set(-0.15, 1.28, 0.52);
        const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), eyeMat);
        rightEye.position.set(0.15, 1.28, 0.52);
        this.group.add(leftEye, rightEye);
        
        // Katana
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.9, 0.07), weaponMat);
        blade.position.set(0.5, 0.68, 0.25);
        blade.rotation.z = -0.25;
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.22, 0.11), new THREE.MeshStandardMaterial({ color: 0x6b4a2a }));
        handle.position.set(0.5, 1.12, 0.25);
        handle.rotation.z = -0.25;
        this.group.add(blade, handle);
        
        // Ombreiras grandes
        const shoulderMat = new THREE.MeshStandardMaterial({ color: 0xaa8866, metalness: 0.6 });
        const leftShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), shoulderMat);
        leftShoulder.position.set(-0.55, 0.98, 0);
        const rightShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), shoulderMat);
        rightShoulder.position.set(0.55, 0.98, 0);
        this.group.add(leftShoulder, rightShoulder);
        
        this.group.position.set(x, -0.6, z);
        scene.add(this.group);
        
        this.speed = 1.8;
        this.attackCooldown = 0;
    }
    
    update(playerPos, delta) {
        if (!this.alive) return;
        
        this.animTime += delta * 5;
        const dx = playerPos.x - this.group.position.x;
        const dz = playerPos.z - this.group.position.z;
        const dist = Math.hypot(dx, dz);
        
        if (dist > 1.2 && dist < 12) {
            const move = this.speed * delta;
            const dirX = dx / dist;
            const dirZ = dz / dist;
            this.group.position.x += dirX * move;
            this.group.position.z += dirZ * move;
        }
        
        // Limites da arena
        const arenaRadius = 11.5;
        if (Math.hypot(this.group.position.x, this.group.position.z) > arenaRadius) {
            const angle = Math.atan2(this.group.position.z, this.group.position.x);
            this.group.position.x = Math.cos(angle) * arenaRadius;
            this.group.position.z = Math.sin(angle) * arenaRadius;
        }
        
        // Rotação para o jogador
        const angle = Math.atan2(dx, dz);
        this.group.rotation.y = angle;
        
        // Animação de respiração
        this.bodyMesh.position.y = 0.62 + Math.sin(this.animTime) * 0.005;
        
        // Atualizar cooldown
        if (this.attackCooldown > 0) this.attackCooldown -= delta;
    }
    
    attack() {
        if (this.attackCooldown <= 0) {
            this.attackCooldown = 1.0;
            
            // Efeito visual do ataque
            const slashGroup = new THREE.Group();
            const slashMat = new THREE.MeshStandardMaterial({ color: 0xff6666, emissive: 0x440000 });
            const slash = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), slashMat);
            slash.position.set(Math.sin(this.group.rotation.y) * 1.3, 0.8, Math.cos(this.group.rotation.y) * 1.3);
            slashGroup.add(slash);
            slashGroup.position.copy(this.group.position);
            scene.add(slashGroup);
            setTimeout(() => scene.remove(slashGroup), 150);
            
            return true;
        }
        return false;
    }
    
    takeDamage(amount) {
        if (!this.alive) return false;
        this.health = Math.max(0, this.health - amount);
        this.bodyMesh.material.color.setHex(0xcc5555);
        setTimeout(() => { 
            if(this.alive && this.health > 0) this.bodyMesh.material.color.setHex(0x3a2a2a); 
        }, 150);
        
        if (this.health <= 0) {
            this.alive = false;
            scene.remove(this.group);
            return true;
        }
        return false;
    }
    
    getPosition() {
        return this.group.position;
    }
}

// ========== SISTEMA DE PARTÍCULAS ==========
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.geometry = new THREE.SphereGeometry(0.08, 4, 4);
    }
    
    createHitEffect(position, color = 0xffaa44) {
        const material = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.5 });
        const count = 15;
        
        for (let i = 0; i < count; i++) {
            const particle = new THREE.Mesh(this.geometry, material.clone());
            particle.position.copy(position);
            particle.position.y += 0.8;
            scene.add(particle);
            
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                Math.random() * 3,
                (Math.random() - 0.5) * 4
            );
            
            this.particles.push({ mesh: particle, velocity: velocity, life: 0.6 });
        }
    }
    
    update(delta) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= delta;
            p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
            p.mesh.scale.multiplyScalar(0.95);
            p.mesh.material.emissiveIntensity = p.life * 2;
            
            if (p.life <= 0) {
                scene.remove(p.mesh);
                this.particles.splice(i, 1);
            }
        }
    }
}

// ========== INICIALIZAÇÃO DO JOGO ==========
let player, enemy, particleSystem;
let gameRunning = true;
let score = 0;
let invincibleFrames = 0;
let lastTime = performance.now() / 1000;

// Controles
const keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    KeyW: false, KeyS: false, KeyA: false, KeyD: false,
    Space: false, ShiftLeft: false, ShiftRight: false, KeyR: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = true;
        if (e.code === 'Space') e.preventDefault();
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') e.preventDefault();
    }
    if (e.code === 'KeyR') location.reload();
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
});

let mouseAttack = false;
window.addEventListener('mousedown', (e) => {
    if (e.button === 0) mouseAttack = true;
});
window.addEventListener('mouseup', () => mouseAttack = false);

// ========== UI FUNCTIONS ==========
function updateUI() {
    const playerPercent = (player.health / player.maxHealth) * 100;
    const enemyPercent = (enemy.health / enemy.maxHealth) * 100;
    
    document.getElementById('player-health-fill').style.width = `${playerPercent}%`;
    document.getElementById('enemy-health-fill').style.width = `${enemyPercent}%`;
    document.getElementById('player-health-value').textContent = `${Math.floor(playerPercent)}%`;
    document.getElementById('enemy-health-value').textContent = `${Math.floor(enemyPercent)}%`;
    document.getElementById('score-value').textContent = score;
    
    // Efeito de combo
    if (player.combo >= 2) {
        const comboDiv = document.getElementById('combo-text');
        comboDiv.textContent = `${player.combo}x COMBO!`;
        comboDiv.style.opacity = '1';
        comboDiv.style.transform = 'scale(1.1)';
        setTimeout(() => {
            comboDiv.style.opacity = '0.7';
            comboDiv.style.transform = 'scale(1)';
        }, 300);
    } else {
        document.getElementById('combo-text').style.opacity = '0';
    }
}

function showCombatText(text, isGood = true) {
    const combatText = document.getElementById('combat-text');
    combatText.textContent = text;
    combatText.style.color = isGood ? '#ffd700' : '#ff6666';
    combatText.style.opacity = '1';
    setTimeout(() => combatText.style.opacity = '0', 500);
}

function showDamageOverlay() {
    const overlay = document.getElementById('damage-overlay');
    overlay.style.opacity = '0.5';
    setTimeout(() => overlay.style.opacity = '0', 200);
}

function showFloatingDamage(position, damage, isEnemy = true) {
    const vector = position.clone().project(camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
    
    const div = document.createElement('div');
    div.className = 'floating-damage';
    div.textContent = `-${damage}`;
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    div.style.color = isEnemy ? '#ffd700' : '#ff6666';
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 800);
}

function gameOver(isVictory) {
    gameRunning = false;
    const gameoverScreen = document.getElementById('gameover-screen');
    const title = document.getElementById('gameover-title');
    const message = document.getElementById('gameover-message');
    const stats = document.getElementById('gameover-stats');
    
    if (isVictory) {
        title.className = 'victory';
        title.innerHTML = '🏆 VITÓRIA! 🏆';
        message.innerHTML = 'Você derrotou o Samurai Sombra!';
        stats.innerHTML = `⚔️ Pontuação Final: ${score} ⚔️<br>🎯 Maior Combo: ${player.combo}x 🎯`;
    } else {
        title.className = 'defeat';
        title.innerHTML = '💀 DERROTA 💀';
        message.innerHTML = 'O Samurai Sombra foi mais forte...';
        stats.innerHTML = `⚔️ Pontuação: ${score} ⚔️<br>🎯 Maior Combo: ${player.combo}x 🎯`;
    }
    
    gameoverScreen.style.display = 'flex';
}

// ========== CÂMERA EM TERCEIRA PESSOA ==========
let cameraOffset = new THREE.Vector3(0, 2.8, 7);
let targetCameraPos = new THREE.Vector3();

function updateCamera() {
    if (!player) return;
    targetCameraPos.copy(player.getPosition()).add(cameraOffset);
    camera.position.lerp(targetCameraPos, 0.1);
    camera.lookAt(player.getPosition().x, player.getPosition().y + 1.2, player.getPosition().z);
}

// ========== ANIMAÇÃO DE LUZES ==========
let lightTime = 0;
function updateLights(delta) {
    lightTime += delta;
    rimLight.intensity = 0.5 + Math.sin(lightTime) * 0.2;
    fillLight.intensity = 0.4 + Math.cos(lightTime * 0.7) * 0.1;
    
    if (player) {
        playerLight.position.copy(player.getPosition());
        playerLight.position.y += 1.2;
        groundLight.position.x = player.getPosition().x;
        groundLight.position.z = player.getPosition().z;
    }
}

// ========== LOOP PRINCIPAL ==========
function animate() {
    const now = performance.now() / 1000;
    let delta = Math.min(0.033, now - lastTime);
    if (delta <= 0) { lastTime = now; requestAnimationFrame(animate); return; }
    lastTime = now;
    
    if (gameRunning && player && enemy) {
        const shiftPressed = keys['ShiftLeft'] || keys['ShiftRight'];
        player.update(delta, keys, shiftPressed);
        enemy.update(player.getPosition(), delta);
        
        // Ataque do jogador
        if (mouseAttack || keys.Space) {
            if (player.attack()) {
                const playerPos = player.getPosition();
                const dist = playerPos.distanceTo(enemy.getPosition());
                
                if (dist < 2.0 && enemy.alive) {
                    const damage = 12 + (player.combo * 2);
                    const killed = enemy.takeDamage(damage);
                    
                    showFloatingDamage(enemy.getPosition(), damage, true);
                    particleSystem.createHitEffect(enemy.getPosition(), 0xffaa44);
                    
                    if (killed) {
                        score += 100;
                        showCombatText(`+${100} PONTOS!`, true);
                        gameOver(true);
                    } else {
                        score += 10;
                    }
                    
                    updateUI();
                    
                    if (player.combo >= 3) {
                        showCombatText(`${player.combo}x COMBO!`, true);
                    }
                }
            }
        }
        
        // Ataque do inimigo
        const distToPlayer = player.getPosition().distanceTo(enemy.getPosition());
        if (distToPlayer < 1.5 && invincibleFrames <= 0 && enemy.alive) {
            enemy.attack();
            const damage = 10;
            const dead = player.takeDamage(damage);
            
            showFloatingDamage(player.getPosition(), damage, false);
            particleSystem.createHitEffect(player.getPosition(), 0xff4444);
            showDamageOverlay();
            
            if (dead) {
                gameOver(false);
            }
            
            invincibleFrames = 0.8;
            updateUI();
        }
        
        if (invincibleFrames > 0) invincibleFrames -= delta;
        
        updateUI();
        updateCamera();
    }
    
    if (particleSystem) particleSystem.update(delta);
    updateLights(delta);
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// ========== INICIALIZAÇÃO ==========
function init() {
    // Criar personagens
    player = new Ninja();
    enemy = new SamuraiEnemy(3, 2);
    particleSystem = new ParticleSystem();
    
    // Esconder loading e mostrar UI
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        uiScreen.style.display = 'block';
    }, 2000);
    
    updateUI();
    animate();
    
    console.log('🔥 JOGO INICIADO! 🔥');
    console.log('🎮 Controles:');
    console.log('   - WASD: Movimentar');
    console.log('   - ESPAÇO ou CLICK: Atacar');
    console.log('   - SHIFT: Correr');
    console.log('   - R: Reiniciar');
}

// Iniciar jogo
init();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
