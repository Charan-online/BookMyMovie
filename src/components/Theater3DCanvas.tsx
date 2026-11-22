import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { AuditoriumConfig, CameraMode, Movie, TheaterSeat } from '../types/cinema';
import { getSeatEyePosition, getSeatLookTarget } from '../utils/theaterMath';
import { buildTheaterScene, type BuiltTheaterScene } from '../three/theaterBuilder';

interface Theater3DCanvasProps {
  auditorium: AuditoriumConfig;
  seats: TheaterSeat[];
  selectedSeatIds: string[];
  focusedSeatId: string | null;
  cameraMode: CameraMode;
  movie: Movie;
  onSelectSeat: (seat: TheaterSeat) => void;
  onHoverSeat: (seat: TheaterSeat | null) => void;
}

const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function Theater3DCanvas({
  auditorium,
  seats,
  selectedSeatIds,
  focusedSeatId,
  cameraMode,
  movie,
  onSelectSeat,
  onHoverSeat,
}: Theater3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  // Refs for latest props inside Three.js lifecycle without tearing down WebGL context
  const propsRef = useRef({
    seats,
    selectedSeatIds,
    focusedSeatId,
    cameraMode,
    movie,
    auditorium,
    onSelectSeat,
    onHoverSeat,
  });
  propsRef.current = {
    seats,
    selectedSeatIds,
    focusedSeatId,
    cameraMode,
    movie,
    auditorium,
    onSelectSeat,
    onHoverSeat,
  };

  const sceneApiRef = useRef<{
    built: BuiltTheaterScene | null;
    syncSeats: () => void;
    syncCameraTarget: (snap?: boolean) => void;
    requestRender: () => void;
  }>({
    built: null,
    syncSeats: () => {},
    syncCameraTarget: () => {},
    requestRender: () => {},
  });

  // Mount Three.js WebGLRenderer once per auditorium ID
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07080b);
    scene.fog = new THREE.FogExp2(0x07080b, 0.016);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(58, width / height, 0.12, 120);
    // Start in an elevated panoramic overview angle showing screen + tiered velvet seats
    camera.position.set(7.8, 7.6, 10.6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.target.set(0, auditorium.screenCenterY * 0.72, -1.8);
    controls.minDistance = 0.05;
    controls.maxDistance = 24;
    controls.maxPolarAngle = Math.PI * 0.56;
    controls.minPolarAngle = 0.25;
    controls.update();

    // Balanced 3-point warm/cool cinema rig
    const hemiLight = new THREE.HemisphereLight(0x8fa6cc, 0x261d17, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffdfb0, 1.35);
    keyLight.position.set(6, 12, 8);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.left = -16;
      keyLight.shadow.camera.right = 16;
      keyLight.shadow.camera.top = 16;
      keyLight.shadow.camera.bottom = -16;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const screenBounceLight = new THREE.PointLight(0xffe1a8, 1.15, 24, 1.5);
    screenBounceLight.position.set(0, auditorium.screenCenterY, auditorium.screenZ + 4.0);
    scene.add(screenBounceLight);

    const rearWarmFill = new THREE.PointLight(0xd99b26, 1.15, 22, 1.6);
    rearWarmFill.position.set(0, 7.2, 8.5);
    scene.add(rearWarmFill);

    const built = buildTheaterScene(
      auditorium,
      propsRef.current.seats,
      propsRef.current.movie,
      renderer.capabilities.getMaxAnisotropy(),
    );
    scene.add(built.root);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Camera transition state (smooth exponential damping)
    let transitioning = false;
    let goalPos = camera.position.clone();
    let goalLook = controls.target.clone();
    let goalFov = 58;
    let lastTime = performance.now();
    let hoveredSeatId: string | null = null;
    let rafId = 0;
    let timerId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const startedAt = performance.now();
      const poll = () => {
        if (disposed) return;
        const elapsed = performance.now() - startedAt;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED && elapsed < 100) {
          timerId = window.setTimeout(poll, 10);
        } else {
          if (sync) gl.deleteSync(sync);
          timerId = window.setTimeout(cb, 20);
        }
      };
      timerId = window.setTimeout(poll, 10);
    };

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      rafId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;

        const now = performance.now();
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;

        if (transitioning) {
          const lambda = isSoftwareGl ? 18 : 6.5;
          const alpha = 1 - Math.exp(-lambda * dt);
          camera.position.lerp(goalPos, alpha);
          controls.target.lerp(goalLook, alpha);
          camera.fov = THREE.MathUtils.lerp(camera.fov, goalFov, alpha);
          camera.updateProjectionMatrix();

          if (
            camera.position.distanceTo(goalPos) < 0.03 &&
            controls.target.distanceTo(goalLook) < 0.03
          ) {
            camera.position.copy(goalPos);
            controls.target.copy(goalLook);
            camera.fov = goalFov;
            camera.updateProjectionMatrix();
            transitioning = false;
          } else {
            renderDirty = true;
          }
        }

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };

    const syncSeats = () => {
      const { seats: curSeats, selectedSeatIds: selIds, focusedSeatId: focId } = propsRef.current;
      const selectedSet = new Set(selIds);
      for (const s of curSeats) {
        const node = built.seatNodes.get(s.id);
        if (!node) continue;
        let mat = built.seatMaterials.standardAvailable;
        if (s.occupied) {
          mat = built.seatMaterials.occupied;
        } else if (selectedSet.has(s.id) || s.id === focId) {
          mat = built.seatMaterials.selected;
        } else if (s.id === hoveredSeatId) {
          mat = built.seatMaterials.hovered;
        } else if (s.tier === 'vip') {
          mat = built.seatMaterials.vipAvailable;
        }
        node.cushionMesh.material = mat;
        node.backrestMesh.material = mat;
      }
      requestRender();
    };

    const computeAdaptiveFov = (baseDesktopFov: number, minHorizontalFovDeg: number) => {
      if (camera.aspect >= 1) return baseDesktopFov;
      const halfH = THREE.MathUtils.degToRad(minHorizontalFovDeg / 2);
      const reqV = THREE.MathUtils.radToDeg(
        2 * Math.atan(Math.tan(halfH) / Math.max(0.46, camera.aspect)),
      );
      return Math.min(102, Math.max(baseDesktopFov, reqV));
    };

    const syncCameraTarget = (snap = false) => {
      const {
        cameraMode: mode,
        focusedSeatId: focId,
        seats: curSeats,
        auditorium: aud,
      } = propsRef.current;

      if (mode === 'seat-pov' && focId) {
        const seat = curSeats.find((s) => s.id === focId);
        if (seat) {
          const eye = getSeatEyePosition(seat);
          const look = getSeatLookTarget(seat, aud);
          _targetPos.set(eye.x, eye.y, eye.z);
          _targetLook.set(look.x, look.y, look.z).sub(_targetPos).normalize().multiplyScalar(0.18).add(_targetPos);
          goalPos.copy(_targetPos);
          goalLook.copy(_targetLook);
          goalFov = computeAdaptiveFov(66, 72);
          controls.minDistance = 0.05;
          controls.maxDistance = 0.35;
          controls.enablePan = false;
          controls.enableZoom = false;
          controls.maxPolarAngle = Math.PI * 0.68;
          controls.minPolarAngle = Math.PI * 0.25;

          if (snap || isSoftwareGl) {
            camera.position.copy(goalPos);
            controls.target.copy(goalLook);
            camera.fov = goalFov;
            camera.updateProjectionMatrix();
            controls.update();
            transitioning = false;
          } else {
            transitioning = true;
          }
          requestRender();
          return;
        }
      }

      // Overview mode
      goalPos.set(7.8, 7.6, 10.6);
      goalLook.set(0, aud.screenCenterY * 0.72, -1.8);
      goalFov = computeAdaptiveFov(54, 68);
      controls.minDistance = 3.2;
      controls.maxDistance = 23;
      controls.enablePan = true;
      controls.enableZoom = true;
      controls.maxPolarAngle = Math.PI * 0.56;
      controls.minPolarAngle = 0.25;

      if (snap || isSoftwareGl) {
        camera.position.copy(goalPos);
        controls.target.copy(goalLook);
        camera.fov = goalFov;
        camera.updateProjectionMatrix();
        controls.update();
        transitioning = false;
      } else {
        transitioning = true;
      }
      requestRender();
    };

    sceneApiRef.current = {
      built,
      syncSeats,
      syncCameraTarget,
      requestRender,
    };

    // Cancel scripted camera transition when user manually drags/zooms
    const onControlStart = () => {
      transitioning = false;
    };
    const onControlChange = () => {
      requestRender();
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('change', onControlChange);

    // Raycasting for mouse + touch seat selection (ignore drags > 8px)
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let lastHoverCheck = 0;

    const getHitSeat = (clientX: number, clientY: number): TheaterSeat | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(built.interactables, false);
      if (hits.length === 0) return null;
      const seatId = hits[0].object.userData.seatId as string | undefined;
      if (!seatId) return null;
      return propsRef.current.seats.find((s) => s.id === seatId) || null;
    };

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist > 8) return; // User was orbiting/panning
      const hitSeat = getHitSeat(e.clientX, e.clientY);
      if (hitSeat) {
        propsRef.current.onSelectSeat(hitSeat);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 50) return;
      lastHoverCheck = now;

      const hitSeat = getHitSeat(e.clientX, e.clientY);
      const nextHoverId = hitSeat && !hitSeat.occupied ? hitSeat.id : null;
      renderer.domElement.style.cursor = hitSeat
        ? hitSeat.occupied
          ? 'not-allowed'
          : 'pointer'
        : 'grab';

      if (nextHoverId !== hoveredSeatId) {
        hoveredSeatId = nextHoverId;
        propsRef.current.onHoverSeat(hitSeat);
        syncSeats();
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    const onResize = () => {
      if (!container) return;
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 320);
      camera.aspect = w / h;
      renderer.setSize(w, h);
      syncCameraTarget(true);
    };
    window.addEventListener('resize', onResize);

    // Initial sync & first frame
    syncSeats();
    syncCameraTarget(true);
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      window.removeEventListener('resize', onResize);
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('change', onControlChange);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      built.dispose();
      envTex.dispose();
      renderer.dispose();
    };
  }, [auditorium.id]);

  // Sync seat visual states when selection or occupancy updates
  useEffect(() => {
    sceneApiRef.current.syncSeats();
  }, [seats, selectedSeatIds, focusedSeatId]);

  // Sync camera position smoothly when switching between Overview & Seat POV or picking a new seat
  useEffect(() => {
    sceneApiRef.current.syncCameraTarget(false);
  }, [cameraMode, focusedSeatId]);

  // Update curved screen image if movie changes
  useEffect(() => {
    if (sceneApiRef.current.built) {
      sceneApiRef.current.built.updateScreenFrame(movie, 0);
      sceneApiRef.current.requestRender();
    }
  }, [movie]);

  return (
    <div
      className="relative w-full h-full bg-[#07080B] select-none overflow-hidden"
      data-testid="theater-3d-canvas"
      data-camera-mode={cameraMode}
      data-focused-seat={focusedSeatId || 'none'}
    >
      <div ref={mountRef} className="w-full h-full touch-none" />
      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0A0B0E] text-center p-6">
          <div className="max-w-sm space-y-2">
            <p className="font-display text-lg text-[#F4F2EE]">3D Theater Paused</p>
            <p className="text-sm text-[#9CA3AF]">
              Graphics context is restoring. Use the 2D seat map below to continue selecting seats.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
