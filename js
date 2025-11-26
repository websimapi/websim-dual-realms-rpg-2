// --- Input Handling ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
// ... existing code ...
scene.add(selectionRing);

function handleTapToMove(event) {
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

function onPointerDown(event) {
    if (
        event.target.closest('.ui-btn') ||
        event.target.closest('.window') ||
        event.target.closest('#chat-box')
    ) return;

    // Track touches for pinch-zoom on mobile
    if (event.pointerType === 'touch') {
        activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });

        if (activeTouches.size === 2) {
            // Start pinch
            pinchState.active = true;
            pinchState.startDist = getTouchDistance();
            pinchState.startZoom = cameraZoom;
            return; // Don't treat as tap when starting pinch
        } else if (activeTouches.size > 2) {
            // Ignore extra fingers beyond two
            return;
        }
        // If only one touch so far, fall through to tap-to-move
    }

    handleTapToMove(event);
}

function onPointerMove(event) {
    if (event.pointerType !== 'touch') return;
    if (!activeTouches.has(event.pointerId)) return;

    activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pinchState.active && activeTouches.size >= 2) {
        const currentDist = getTouchDistance();
        if (currentDist > 0 && pinchState.startDist > 0) {
            const scale = pinchState.startDist / currentDist;
            const newZoom = pinchState.startZoom * scale;
            // Clamp zoom for usability
            cameraZoom = Math.min(2.0, Math.max(0.4, newZoom));
        }
    }
}

function onPointerUp(event) {
    if (event.pointerType === 'touch') {
        activeTouches.delete(event.pointerId);
        if (activeTouches.size < 2) {
            pinchState.active = false;
        }
    }
}

function onPointerCancel(event) {
    if (event.pointerType === 'touch') {
        activeTouches.delete(event.pointerId);
        if (activeTouches.size < 2) {
            pinchState.active = false;
        }
    }
}

window.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('pointercancel', onPointerCancel);

// --- Player & Camera Update ---
function updatePlayer(delta) {
// ... existing code ...

function updateCamera() {
    const player = state.player;
    if (!player.mesh) return;

    // Simple isometric follow with zoom factor
    const baseOffset = new THREE.Vector3(20, 25, 20);
    const offset = baseOffset.clone().multiplyScalar(cameraZoom);
    const desiredPos = new THREE.Vector3().addVectors(player.pos, offset);

    camera.position.lerp(desiredPos, 0.1);
    camera.lookAt(player.pos.x, player.pos.y, player.pos.z);
}
// ... existing code ...

