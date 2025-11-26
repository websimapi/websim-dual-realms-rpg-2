import * as THREE from 'three';

export class GameWorld {
    constructor(scene) {
        this.scene = scene;
        this.interactables = [];
        this.entities = [];
        
        this.materials = {
            selected: new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true }),
            tree: new THREE.MeshStandardMaterial({ color: 0x2d5a27 }),
            wood: new THREE.MeshStandardMaterial({ color: 0x5c4033 }),
            rock: new THREE.MeshStandardMaterial({ color: 0x808080 }),
            rubble: new THREE.MeshStandardMaterial({ color: 0x505050 }),
            enemy: new THREE.MeshStandardMaterial({ color: 0xaa2222 })
        };

        this.generateTerrain();
        this.populateWorld();
    }

    generateTerrain() {
        const textureLoader = new THREE.TextureLoader();
        const grassMap = textureLoader.load('/terrain_grass.png');
        grassMap.wrapS = THREE.RepeatWrapping;
        grassMap.wrapT = THREE.RepeatWrapping;
        grassMap.repeat.set(20, 20);
        grassMap.magFilter = THREE.NearestFilter;

        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshStandardMaterial({ map: grassMap });
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.name = "ground";
        this.scene.add(ground);
    }

    populateWorld() {
        // Trees
        for(let i=0; i<30; i++) {
            this.createTree(
                (Math.random() - 0.5) * 80,
                (Math.random() - 0.5) * 80
            );
        }

        // Rocks
        for(let i=0; i<15; i++) {
            this.createRock(
                (Math.random() - 0.5) * 80,
                (Math.random() - 0.5) * 80
            );
        }

        // Enemies
        for(let i=0; i<5; i++) {
            this.createEnemy(
                (Math.random() - 0.5) * 60,
                (Math.random() - 0.5) * 60
            );
        }
    }

    createTree(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 2, 6);
        const trunk = new THREE.Mesh(trunkGeo, this.materials.wood);
        trunk.position.y = 1;
        trunk.castShadow = true;
        group.add(trunk);

        // Leaves
        const leavesGeo = new THREE.ConeGeometry(2.5, 6, 8);
        const leaves = new THREE.Mesh(leavesGeo, this.materials.tree);
        leaves.position.y = 4;
        leaves.castShadow = true;
        group.add(leaves);

        group.userData = { 
            type: 'tree', 
            hp: 3, 
            maxHp: 3,
            respawnTime: 5000,
            id: Math.random().toString(36)
        };
        
        this.scene.add(group);
        this.interactables.push(group);
        return group;
    }

    createStump(x, z, parentData) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        
        const stumpGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.8, 7);
        const stump = new THREE.Mesh(stumpGeo, this.materials.wood);
        stump.position.y = 0.4;
        group.add(stump);

        group.userData = {
            type: 'stump',
            originalData: parentData,
            spawnTime: Date.now()
        };

        this.scene.add(group);
        this.interactables.push(group);
        return group;
    }

    createRock(x, z) {
        const geo = new THREE.DodecahedronGeometry(1.5);
        const rock = new THREE.Mesh(geo, this.materials.rock);
        rock.position.set(x, 1, z);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        
        rock.userData = {
            type: 'rock',
            hp: 4,
            maxHp: 4
        };

        this.scene.add(rock);
        this.interactables.push(rock);
        return rock;
    }

    createRubble(x, z, parentData) {
        const geo = new THREE.DodecahedronGeometry(0.8);
        const rubble = new THREE.Mesh(geo, this.materials.rubble);
        rubble.position.set(x, 0.5, z);
        
        rubble.userData = {
            type: 'rubble',
            originalData: parentData
        };
        
        this.scene.add(rubble);
        this.interactables.push(rubble);
        return rubble;
    }

    createEnemy(x, z) {
        const geo = new THREE.CapsuleGeometry(0.6, 1.5, 4, 8);
        const enemy = new THREE.Mesh(geo, this.materials.enemy);
        enemy.position.set(x, 1.25, z);
        enemy.castShadow = true;

        enemy.userData = {
            type: 'enemy',
            hp: 10,
            maxHp: 10,
            name: "Goblin",
            isMoving: false,
            targetPos: null
        };

        this.scene.add(enemy);
        this.interactables.push(enemy);
        this.entities.push(enemy);
        return enemy;
    }

    replaceObject(obj, newObj) {
        this.scene.remove(obj);
        const idx = this.interactables.indexOf(obj);
        if(idx > -1) this.interactables.splice(idx, 1);
        
        // Remove from entities if applicable
        const eIdx = this.entities.indexOf(obj);
        if(eIdx > -1) this.entities.splice(eIdx, 1);
    }
}

