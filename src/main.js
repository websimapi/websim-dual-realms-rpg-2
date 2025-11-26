import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GameWorld } from './world.js';
import { SKILL_PAIRS, getLevel } from './skills.js';

// --- Global State ---
const state = {
    player: {
        mesh: null,
        mixer: null,
        actions: {},
        pos: new THREE.Vector3(0, 0, 0),
        targetPos: null,
        speed: 8,
        isMoving: false,
        interactTarget: null,
        skills: {}
    },
    inventory: [],
    lastTime: 0
};

// --- Init Skills ---
SKILL_PAIRS.forEach(pair => {
    state.player.skills[pair.a] = { xp: 0, level: 1 };
    state.player.skills[pair.b] = { xp: 0, level: 1 };
});

// --- UI Elements & Helpers ---
const ui = {
    inventoryWindow: document.getElementById('window-inventory'),
    skillsWindow: document.getElementById('window-skills'),
    inventoryBtn: document.getElementById('btn-inventory'),
    skillsBtn: document.getElementById('btn-skills'),
    saveBtn: document.getElementById('btn-save'),
    closeButtons: document.querySelectorAll('.window .close-btn'),
    skillsList: document.getElementById('skills-list'),
    inventoryGrid: document.getElementById('inventory-grid')
};

function toggleWindow(win) {
    if (!win) return;
    win.classList.toggle('hidden');
}

function initSkillsUI() {
    if (!ui.skillsList) return;
    ui.skillsList.innerHTML = '';

    SKILL_PAIRS.forEach(pair => {
        const card = document.createElement('div');
        card.className = 'skill-card';

        const title = document.createElement('div');
        title.className = 'skill-pair-title';
        title.textContent = `${pair.category} – ${pair.a} / ${pair.b}`;
        card.appendChild(title);

        const pairContainer = document.createElement('div');
        pairContainer.className = 'skill-pair';

        [pair.a, pair.b].forEach(name => {
            const row = document.createElement('div');
            row.className = 'skill-row';

            const label = document.createElement('span');
            label.className = 'skill-name';
            label.textContent = name;

            const level = document.createElement('span');
            level.className = 'skill-val';
            level.dataset.skillName = name;
            level.textContent = 'Lv 1';

            const bar = document.createElement('div');
            bar.className = 'skill-bar';

            const barFill = document.createElement('div');
            barFill.className = 'skill-bar-fill';
            barFill.dataset.skillName = name;
            bar.appendChild(barFill);

            row.appendChild(label);
            row.appendChild(level);
            pairContainer.appendChild(row);
            pairContainer.appendChild(bar);
        });

        card.appendChild(pairContainer);
        ui.skillsList.appendChild(card);
    });
}

function initInventoryUI(slotCount = 28) {
    if (!ui.inventoryGrid) return;
    ui.inventoryGrid.innerHTML = '';
    // Ensure inventory array has the desired length
    if (state.inventory.length < slotCount) {
        state.inventory.length = slotCount;
    }

    for (let i = 0; i < slotCount; i++) {
        const slot = document.createElement('div');
        slot.className = 'inv-slot empty';
        slot.dataset.slotIndex = i.toString();

        const icon = document.createElement('div');
        icon.className = 'inv-slot-icon';

        const qty = document.createElement('div');
        qty.className = 'inv-slot-qty';

        slot.appendChild(icon);
        slot.appendChild(qty);
        ui.inventoryGrid.appendChild(slot);
    }
}

function initUI() {
    if (ui.inventoryBtn && ui.inventoryWindow) {
        ui.inventoryBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleWindow(ui.inventoryWindow);
        });
    }

    if (ui.skillsBtn && ui.skillsWindow) {
        ui.skillsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleWindow(ui.skillsWindow);
        });
    }

    if (ui.closeButtons && ui.closeButtons.length) {
        ui.closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const win = btn.closest('.window');
                if (win) win.classList.add('hidden');
            });
        });
    }

    // Save button is wired here for future use, even if it does nothing yet
    if (ui.saveBtn) {
        ui.saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Placeholder for future save logic
        });
    }

    // Build static UI structures
    initSkillsUI();
    initInventoryUI();
}

// --- Audio ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const sounds = {};

async function loadSound(name, url) {
    try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const decoded = await audioCtx.decodeAudioData(buffer);
        sounds[name] = decoded;
    } catch (e) { console.error("Sound load error", e); }
}

function playSound(name) {
    if (sounds[name]) {
        const src = audioCtx.createBufferSource();
        src.buffer = sounds[name];
        src.connect(audioCtx.destination);
        src.start(0);
    }
}

// Load SFX
loadSound('chop', '/sfx_chop.mp3');
loadSound('mine', '/sfx_mine.mp3');
loadSound('step', '/sfx_step.mp3');
loadSound('levelup', '/sfx_levelup.mp3');

// --- Three.js Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 20, 60);

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(20, 20, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('game-container').appendChild(renderer.domElement);

// Lighting
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.camera.top = 50;
dirLight.shadow.camera.bottom = -50;
dirLight.shadow.camera.left = -50;
dirLight.shadow.camera.right = 50;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// World
const world = new GameWorld(scene);

// --- Minimap Setup ---
const minimapCanvas = document.getElementById('minimap');

// Use a separate WebGL renderer and top-down orthographic camera for the minimap
let minimapRenderer = null;
let minimapCamera = null;

if (minimapCanvas) {
    minimapRenderer = new THREE.WebGLRenderer({
        canvas: minimapCanvas,
        antialias: false,
        alpha: true
    });
    minimapRenderer.setPixelRatio(window.devicePixelRatio || 1);
    minimapRenderer.shadowMap.enabled = false;
    minimapRenderer.autoClear = true;

    // World is 100x100, so use an ortho camera that comfortably fits it
    const size = 120;
    minimapCamera = new THREE.OrthographicCamera(
        -size / 2,
        size / 2,
        size / 2,
        -size / 2,
        0.1,
        200
    );
    minimapCamera.position.set(0, 80, 0);
    minimapCamera.up.set(0, 0, -1); // make +Z up on the minimap
    minimapCamera.lookAt(0, 0, 0);
}

function resizeMinimap() {
    if (!minimapCanvas || !minimapRenderer) return;
    const container = document.getElementById('minimap-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    minimapRenderer.setSize(rect.width, rect.height, false);
}

// Keep the minimap centered on the player from a top-down view
function updateMinimapCamera() {
    if (!minimapCamera) return;
    const playerPos = state.player.pos;
    minimapCamera.position.x = playerPos.x;
    minimapCamera.position.z = playerPos.z;
    minimapCamera.lookAt(playerPos.x, 0, playerPos.z);
    minimapCamera.updateProjectionMatrix();
}

resizeMinimap();

function drawMinimap() {
    if (!minimapRenderer || !minimapCamera) return;
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;
    minimapRenderer.clear();

    // Background
    minimapRenderer.setClearColor(0x000000, 0.6);
    minimapRenderer.render(scene, minimapCamera);

    // Center and scale to world (world terrain is 100x100)
    minimapRenderer.save();
    minimapRenderer.translate(w / 2, h / 2);
    const scale = Math.min(w, h) / 120; // padding around 100x100 area
    minimapRenderer.scale(scale, -scale); // flip Y so up is north

    // Draw world objects
    if (world && world.interactables) {
        world.interactables.forEach(obj => {
            if (!obj.position) return;
            const x = obj.position.x;
            const z = obj.position.z;
            let color;
            switch (obj.userData?.type) {
                case 'tree':
                case 'stump':
                    color = '#2ecc71'; // green
                    break;
                case 'rock':
                case 'rubble':
                    color = '#bdc3c7'; // grey
                    break;
                case 'enemy':
                    color = '#e74c3c'; // red
                    break;
                default:
                    color = '#ffffff';
                    break;
            }
            minimapRenderer.setClearColor(color);
            minimapRenderer.render(scene, minimapCamera);
        });
    }

    // Draw player
    const playerPos = state.player.pos;
    minimapRenderer.setClearColor('#f1c40f'); // yellow for player
    minimapRenderer.render(scene, minimapCamera);

    minimapRenderer.restore();
}

// Init UI interactions
initUI();

// --- Camera Zoom / Touch State ---
let cameraZoom = 1; // 1 = default, <1 closer, >1 further
const activeTouches = new Map();
const pinchState = {
    active: false,
    startDist: 0,
    startZoom: 1
};

// Helper to compute distance between first two active touches
function getTouchDistance() {
    if (activeTouches.size < 2) return 0;
    const touches = Array.from(activeTouches.values());
    const a = touches[0];
    const b = touches[1];
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// --- Player Loading ---
const loader = new FBXLoader();
loader.load('/Walking.fbx', (object) => {
    object.scale.set(0.02, 0.02, 0.02); // Adjust scale based on typical FBX
    object.traverse(c => {
        if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
        }
    });

    state.player.mesh = object;
    state.player.mesh.position.copy(state.player.pos);
    scene.add(object);

    state.player.mixer = new THREE.AnimationMixer(object);
    // Assuming the FBX contains the walk animation
    if (object.animations.length > 0) {
        const action = state.player.mixer.clipAction(object.animations[0]);
        state.player.actions['walk'] = action;
        action.play();
        action.paused = true; // Start idle
    }

    updateUI();
});

// --- Input Handling ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.6, 32),
    new THREE.MeshBasicMaterial({
        color: 0xffff00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
    })
);
selectionRing.rotation.x = -Math.PI / 2;
selectionRing.visible = false;
scene.add(selectionRing);

function onPointerDown(event) {
    if (
        event.target.closest('.ui-btn') ||
        event.target.closest('.window') ||
        event.target.closest('#chat-box')
    ) return;

    // Resume audio context if needed
    if (audioCtx.state === 'suspended') audioCtx.resume();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const hit = intersects[0];
        const point = hit.point;

        // Move player towards clicked point on terrain
        state.player.targetPos = new THREE.Vector3(point.x, 0, point.z);
        state.player.isMoving = true;

        selectionRing.position.set(point.x, 0.01, point.z);
        selectionRing.visible = true;

        playSound('step');
    }
}

window.addEventListener('pointerdown', onPointerDown);

// --- Player & Camera Update ---
function updatePlayer(delta) {
    const player = state.player;
    if (!player.mesh) return;

    // Movement
    if (player.targetPos) {
        const dir = new THREE.Vector3().subVectors(player.targetPos, player.pos);
        const dist = dir.length();

        if (dist < 0.1) {
            // Reached target
            player.pos.copy(player.targetPos);
            player.targetPos = null;
            player.isMoving = false;
            selectionRing.visible = false;
        } else {
            dir.normalize();
            const moveDist = Math.min(dist, player.speed * delta);
            player.pos.addScaledVector(dir, moveDist);

            // Rotate character towards movement direction
            const yaw = Math.atan2(dir.x, dir.z);
            player.mesh.rotation.y = yaw;
        }
    }

    player.mesh.position.copy(player.pos);

    // Animation
    const walkAction = player.actions['walk'];
    if (walkAction) {
        if (player.isMoving && player.targetPos) {
            walkAction.paused = false;
        } else {
            walkAction.paused = true;
        }
    }

    // Mixer
    if (player.mixer) {
        player.mixer.update(delta);
    }
}

function updateCamera() {
    const player = state.player;
    if (!player.mesh) return;

    // Simple isometric follow
    const offset = new THREE.Vector3(20, 25, 20);
    const desiredPos = new THREE.Vector3().addVectors(player.pos, offset);

    camera.position.lerp(desiredPos, 0.1);
    camera.lookAt(player.pos.x, player.pos.y, player.pos.z);
}

// --- Resize Handling ---
function onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    resizeMinimap();
}

window.addEventListener('resize', onWindowResize);

// --- UI Stub ---
function updateUI() {
    // Update skills
    if (ui.skillsList) {
        const levelEls = ui.skillsList.querySelectorAll('.skill-val');
        levelEls.forEach(el => {
            const name = el.dataset.skillName;
            const skill = state.player.skills[name];
            if (!skill) return;
            el.textContent = `Lv ${skill.level}`;
        });

        const barEls = ui.skillsList.querySelectorAll('.skill-bar-fill');
        barEls.forEach(el => {
            const name = el.dataset.skillName;
            const skill = state.player.skills[name];
            if (!skill) return;
            // Placeholder: until XP gain is implemented, show 0% progress
            const width = 0;
            el.style.width = `${width}%`;
        });
    }

    // Update inventory
    if (ui.inventoryGrid) {
        const slots = ui.inventoryGrid.querySelectorAll('.inv-slot');
        slots.forEach(slot => {
            const idx = parseInt(slot.dataset.slotIndex, 10);
            const item = state.inventory[idx];
            const iconEl = slot.querySelector('.inv-slot-icon');
            const qtyEl = slot.querySelector('.inv-slot-qty');

            if (!item) {
                slot.classList.add('empty');
                if (iconEl) iconEl.textContent = '';
                if (qtyEl) qtyEl.textContent = '';
            } else {
                slot.classList.remove('empty');
                if (iconEl) iconEl.textContent = item.icon || '';
                if (qtyEl) qtyEl.textContent = item.quantity > 1 ? item.quantity.toString() : '';
            }
        });
    }
}

// --- Main Loop ---
function animate(time) {
    const t = time * 0.001;
    const delta = state.lastTime ? t - state.lastTime : 0;
    state.lastTime = t;

    updatePlayer(delta);
    updateCamera();
    updateMinimapCamera();

    renderer.render(scene, camera);

    if (minimapRenderer && minimapCamera) {
        minimapRenderer.render(scene, minimapCamera);
    }
}

state.lastTime = performance.now() * 0.001;
renderer.setAnimationLoop(animate);

