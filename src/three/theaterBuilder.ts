import * as THREE from 'three';
import type { AuditoriumConfig, Movie, TheaterSeat } from '../types/cinema';

export interface SeatVisualNode {
  seat: TheaterSeat;
  group: THREE.Group;
  cushionMesh: THREE.Mesh;
  backrestMesh: THREE.Mesh;
  trimMesh: THREE.Mesh;
  hitProxy: THREE.Mesh;
}

export interface BuiltTheaterScene {
  root: THREE.Group;
  screenMaterial: THREE.MeshStandardMaterial;
  screenTexture: THREE.CanvasTexture;
  screenCanvas: HTMLCanvasElement;
  screenCtx: CanvasRenderingContext2D;
  seatNodes: Map<string, SeatVisualNode>;
  interactables: THREE.Mesh[];
  seatMaterials: {
    standardAvailable: THREE.MeshStandardMaterial;
    vipAvailable: THREE.MeshStandardMaterial;
    selected: THREE.MeshStandardMaterial;
    occupied: THREE.MeshStandardMaterial;
    hovered: THREE.MeshStandardMaterial;
    armrestDark: THREE.MeshStandardMaterial;
    brassTrim: THREE.MeshStandardMaterial;
    pedestalMetal: THREE.MeshStandardMaterial;
  };
  updateScreenFrame: (movie: Movie, phase: number) => void;
  dispose: () => void;
}

/**
 * Generates a subtle procedural woven carpet/fabric bump texture (zero external 404s).
 */
function createCarpetBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 2) {
    for (let x = 0; x < 128; x += 2) {
      const n = ((x * 17 + y * 31) % 37) - 18;
      const v = Math.max(0, Math.min(255, 128 + n));
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}

/**
 * Draws a crisp, widescreen cinematic frame onto the curved cinema screen texture.
 */
export function drawMovieScreenCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  movie: Movie,
  phase: number,
): void {
  const { primary, secondary, highlight, theme } = movie.screenPalette;

  // Background cinematic gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#070910');
  grad.addColorStop(0.55, primary);
  grad.addColorStop(1, '#090A0F');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  if (theme === 'cosmos') {
    // Deep starfield
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    for (let i = 0; i < 90; i++) {
      const sx = ((i * 197 + 43) % width);
      const sy = ((i * 113 + 19) % (height * 0.78));
      const r = (i % 3 === 0 ? 1.8 : 1.0);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glowing solar eclipse halo & ringed exoplanet
    const cx = width * 0.52;
    const cy = height * 0.44;
    const glow = ctx.createRadialGradient(cx, cy, 45, cx, cy, 240);
    glow.addColorStop(0, highlight);
    glow.addColorStop(0.35, secondary);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 240, 0, Math.PI * 2);
    ctx.fill();

    // Tilted planetary rings
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.28);
    ctx.strokeStyle = 'rgba(253, 230, 138, 0.55)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, 215, 42, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(229, 169, 59, 0.3)';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.ellipse(0, 0, 175, 32, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Planet core silhouette
    ctx.fillStyle = '#0D111D';
    ctx.beginPath();
    ctx.arc(cx, cy, 86, 0, Math.PI * 2);
    ctx.fill();

    // Rim crescent
    ctx.strokeStyle = highlight;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 87, -0.8, 1.3);
    ctx.stroke();

    // Foreground basalt ridge
    ctx.fillStyle = '#07080D';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.8);
    ctx.lineTo(width * 0.24, height * 0.72);
    ctx.lineTo(width * 0.42, height * 0.83);
    ctx.lineTo(width * 0.7, height * 0.77);
    ctx.lineTo(width, height * 0.86);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  } else if (theme === 'noir') {
    // Rain-slicked cobblestone street & warm streetlamps
    ctx.fillStyle = '#120D0A';
    ctx.fillRect(0, 0, width * 0.26, height);
    ctx.fillRect(width * 0.74, 0, width * 0.26, height);

    const lampGlow = ctx.createRadialGradient(width * 0.67, height * 0.34, 8, width * 0.67, height * 0.34, 210);
    lampGlow.addColorStop(0, highlight);
    lampGlow.addColorStop(0.3, secondary);
    lampGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lampGlow;
    ctx.fillRect(width * 0.35, 0, width * 0.65, height);

    // Wet puddle reflection streaks
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(245, 158, 11, 0.28)' : 'rgba(252, 211, 77, 0.14)';
      const ry = height * 0.64 + i * 9;
      const rw = 60 + ((i * 29) % 140);
      ctx.fillRect(width * 0.56 - rw * 0.3, ry, rw, 3);
    }

    // Silhouette in center alley
    ctx.fillStyle = '#070607';
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.56, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(width * 0.482, height * 0.58, 36, 78);
  } else if (theme === 'concert') {
    // Dramatic single golden overhead spotlight cone onto grand piano
    const beam = ctx.createLinearGradient(width * 0.5, 0, width * 0.5, height * 0.85);
    beam.addColorStop(0, 'rgba(254, 243, 199, 0.75)');
    beam.addColorStop(0.65, 'rgba(200, 141, 50, 0.28)');
    beam.addColorStop(1, 'rgba(200, 141, 50, 0.05)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(width * 0.45, 0);
    ctx.lineTo(width * 0.55, 0);
    ctx.lineTo(width * 0.7, height * 0.86);
    ctx.lineTo(width * 0.3, height * 0.86);
    ctx.closePath();
    ctx.fill();

    // Stage floor pool
    const pool = ctx.createRadialGradient(width * 0.5, height * 0.8, 15, width * 0.5, height * 0.8, 190);
    pool.addColorStop(0, 'rgba(253, 230, 138, 0.42)');
    pool.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = pool;
    ctx.fillRect(width * 0.2, height * 0.62, width * 0.6, height * 0.35);

    // Grand piano silhouette
    ctx.fillStyle = '#0A0807';
    ctx.fillRect(width * 0.41, height * 0.64, 150, 42);
    ctx.fillRect(width * 0.43, height * 0.68, 10, 46);
    ctx.fillRect(width * 0.54, height * 0.68, 10, 46);
  } else {
    // Alpine mist & twin warm headlights
    const mist = ctx.createLinearGradient(0, height * 0.2, 0, height * 0.7);
    mist.addColorStop(0, 'rgba(147, 197, 253, 0.22)');
    mist.addColorStop(1, 'rgba(15, 23, 34, 0)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, height * 0.2, width, height * 0.5);

    // Sweeping alpine road
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = 42;
    ctx.beginPath();
    ctx.moveTo(width * 0.1, height);
    ctx.quadraticCurveTo(width * 0.45, height * 0.62, width * 0.88, height * 0.72);
    ctx.stroke();

    // Headlight beams
    const beamX = width * (0.48 + Math.sin(phase) * 0.04);
    const hl = ctx.createRadialGradient(beamX, height * 0.68, 6, beamX + 120, height * 0.72, 200);
    hl.addColorStop(0, 'rgba(251, 191, 36, 0.85)');
    hl.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = hl;
    ctx.fillRect(width * 0.3, height * 0.55, width * 0.55, height * 0.35);
  }

  // Subtle letterbox bars & crisp title watermark on bottom corner of projection
  ctx.fillStyle = '#040508';
  ctx.fillRect(0, 0, width, height * 0.06);
  ctx.fillRect(0, height * 0.94, width, height * 0.06);

  // Subtle cinematic frame border
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  ctx.strokeRect(8, height * 0.06 + 4, width - 16, height * 0.88 - 8);

  // Crisp film title card in lower-left of screen so users judge visual legibility from each seat
  ctx.fillStyle = 'rgba(244, 242, 238, 0.9)';
  ctx.font = '600 28px Georgia, serif';
  ctx.fillText(movie.title, 44, height * 0.84);

  ctx.fillStyle = 'rgba(229, 169, 59, 0.88)';
  ctx.font = '500 14px sans-serif';
  ctx.fillText(`${movie.tagline}  ·  ${movie.formats[0]}`, 44, height * 0.89);
}

/**
 * Builds the entire 3D cinema auditorium, curved screen, lighting coves, and composite seats.
 */
export function buildTheaterScene(
  config: AuditoriumConfig,
  seats: TheaterSeat[],
  movie: Movie,
  maxAnisotropy: number,
): BuiltTheaterScene {
  const root = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const carpetBump = track(createCarpetBumpTexture());

  // Materials
  const wallMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x13161e,
      roughness: 0.88,
      metalness: 0.08,
    }),
  );
  const acousticPanelMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1b202b,
      roughness: 0.78,
      metalness: 0.14,
      bumpMap: carpetBump,
      bumpScale: 0.02,
    }),
  );
  const carpetMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x161820,
      roughness: 0.94,
      metalness: 0.02,
      bumpMap: carpetBump,
      bumpScale: 0.04,
    }),
  );
  const stageMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x0b0c10,
      roughness: 0.85,
      metalness: 0.08,
    }),
  );
  const coveGoldEmissiveMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf0b84e,
      emissive: 0xd99b26,
      emissiveIntensity: 1.6,
      roughness: 0.3,
      metalness: 0.2,
    }),
  );
  const aisleLedMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffc663,
      emissive: 0xe5a93b,
      emissiveIntensity: 1.25,
      roughness: 0.25,
    }),
  );

  // Dimensions of the hall enclosing all rows cleanly
  const lastRow = seats[seats.length - 1];
  const hallWidth = Math.max(config.screenWidth + 6.4, 21.5);
  const hallBackZ = (lastRow ? lastRow.z : 6) + 3.8;
  const hallFrontZ = config.screenZ - 2.0;
  const hallLength = hallBackZ - hallFrontZ;
  const hallCenterZ = (hallBackZ + hallFrontZ) / 2;
  const ceilingY = Math.max(config.screenCenterY + config.screenHeight / 2 + 2.2, (lastRow ? lastRow.y : 3) + 4.8);

  // Main sub-floor
  const floorGeo = track(new THREE.PlaneGeometry(hallWidth, hallLength));
  const floorMesh = new THREE.Mesh(floorGeo, carpetMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(0, 0, hallCenterZ);
  floorMesh.receiveShadow = true;
  root.add(floorMesh);

  // Ceiling
  const ceilingMesh = new THREE.Mesh(floorGeo, wallMat);
  ceilingMesh.rotation.x = Math.PI / 2;
  ceilingMesh.position.set(0, ceilingY, hallCenterZ);
  root.add(ceilingMesh);

  // Side & Back & Screen-End Walls (indoor auditorium enclosed cleanly)
  const sideWallGeo = track(new THREE.PlaneGeometry(hallLength, ceilingY));
  const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-hallWidth / 2, ceilingY / 2, hallCenterZ);
  root.add(leftWall);

  const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(hallWidth / 2, ceilingY / 2, hallCenterZ);
  root.add(rightWall);

  const endWallGeo = track(new THREE.PlaneGeometry(hallWidth, ceilingY));
  const frontWall = new THREE.Mesh(endWallGeo, stageMat);
  frontWall.position.set(0, ceilingY / 2, hallFrontZ);
  root.add(frontWall);

  const backWall = new THREE.Mesh(endWallGeo, wallMat);
  backWall.rotation.y = Math.PI;
  backWall.position.set(0, ceilingY / 2, hallBackZ);
  root.add(backWall);

  // Architectural Acoustic Wall Ribs & Warm Gold Sconce Strips along Left & Right Walls
  const ribGeo = track(new THREE.BoxGeometry(0.16, ceilingY - 1.2, 0.9));
  const sconceGeo = track(new THREE.BoxGeometry(0.06, ceilingY * 0.55, 0.08));
  const ribCount = 6;
  for (let i = 0; i < ribCount; i++) {
    const rz = hallFrontZ + 3.2 + i * ((hallLength - 5.2) / (ribCount - 1));
    for (const side of [-1, 1]) {
      const rib = new THREE.Mesh(ribGeo, acousticPanelMat);
      rib.position.set(side * (hallWidth / 2 - 0.1), ceilingY / 2, rz);
      root.add(rib);

      const sconce = new THREE.Mesh(sconceGeo, coveGoldEmissiveMat);
      sconce.position.set(side * (hallWidth / 2 - 0.19), ceilingY * 0.48, rz);
      root.add(sconce);
    }
  }

  // Ceiling Cove Beams
  const beamGeo = track(new THREE.BoxGeometry(hallWidth - 1.4, 0.18, 0.35));
  const beamStripGeo = track(new THREE.BoxGeometry(hallWidth - 2.0, 0.05, 0.08));
  for (let i = 0; i < 4; i++) {
    const bz = hallFrontZ + 3.8 + i * ((hallLength - 6.5) / 3);
    const beam = new THREE.Mesh(beamGeo, acousticPanelMat);
    beam.position.set(0, ceilingY - 0.12, bz);
    root.add(beam);

    const strip = new THREE.Mesh(beamStripGeo, coveGoldEmissiveMat);
    strip.position.set(0, ceilingY - 0.22, bz + 0.12);
    root.add(strip);
  }

  // Projection Booth Window & Subtle Translucent Light Cone
  const boothGeo = track(new THREE.BoxGeometry(2.2, 0.75, 0.12));
  const boothMesh = new THREE.Mesh(boothGeo, stageMat);
  boothMesh.position.set(0, ceilingY - 1.15, hallBackZ - 0.06);
  root.add(boothMesh);

  const lensGeo = track(new THREE.CircleGeometry(0.14, 16));
  const lensMat = track(
    new THREE.MeshBasicMaterial({ color: 0xffe4a3 }),
  );
  const lensMesh = new THREE.Mesh(lensGeo, lensMat);
  lensMesh.rotation.y = Math.PI;
  lensMesh.position.set(0, ceilingY - 1.15, hallBackZ - 0.13);
  root.add(lensMesh);

  // Subtle projector light cone
  const coneLen = hallBackZ - config.screenZ - 0.8;
  const coneGeo = track(new THREE.ConeGeometry(config.screenWidth * 0.24, coneLen, 24, 1, true));
  const coneMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: 0.025,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const coneMesh = new THREE.Mesh(coneGeo, coneMat);
  coneMesh.rotation.x = Math.PI / 2;
  coneMesh.position.set(0, (ceilingY - 1.15 + config.screenCenterY) * 0.5, (hallBackZ + config.screenZ) * 0.5);
  coneMesh.lookAt(0, config.screenCenterY, config.screenZ);
  coneMesh.rotateX(-Math.PI / 2);
  root.add(coneMesh);

  // Tiered Stadium Risers + Warm Amber Step Edge Lights
  const riserWidth = hallWidth - 0.4;
  const rowDepth = config.rowSpacing;
  const ledBarGeo = track(new THREE.BoxGeometry(0.45, 0.035, 0.05));

  for (let r = 0; r < config.rows; r++) {
    const rowSeats = seats.filter((s) => s.rowIndex === r);
    if (rowSeats.length === 0) continue;
    const riserY = rowSeats[0].y;
    const riserZ = config.firstRowZ + r * config.rowSpacing;
    const riserHeight = Math.max(0.2, riserY + 0.06);

    const riserGeo = track(new THREE.BoxGeometry(riserWidth, riserHeight, rowDepth + 0.08));
    const riserMesh = new THREE.Mesh(riserGeo, carpetMat);
    riserMesh.position.set(0, riserY - riserHeight / 2, riserZ);
    riserMesh.receiveShadow = true;
    root.add(riserMesh);

    // Subtle amber LED step strips along aisle edges of each riser
    const frontEdgeZ = riserZ - rowDepth / 2 + 0.04;
    for (const ax of [-4.4, 0, 4.4]) {
      const led = new THREE.Mesh(ledBarGeo, aisleLedMat);
      led.position.set(ax, riserY + 0.02, frontEdgeZ);
      root.add(led);
    }
  }

  // Stage Apron below Screen
  const stageGeo = track(new THREE.BoxGeometry(config.screenWidth + 3.2, 0.45, 2.2));
  const stageMesh = new THREE.Mesh(stageGeo, stageMat);
  stageMesh.position.set(0, 0.225, config.screenZ + 1.1);
  root.add(stageMesh);

  // Curved Cinema Screen Geometry
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 1024;
  screenCanvas.height = 512;
  const screenCtx = screenCanvas.getContext('2d')!;
  drawMovieScreenCanvas(screenCtx, screenCanvas.width, screenCanvas.height, movie, 0);

  const screenTexture = track(new THREE.CanvasTexture(screenCanvas));
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.anisotropy = maxAnisotropy;

  const segX = 32;
  const screenGeo = track(new THREE.PlaneGeometry(config.screenWidth, config.screenHeight, segX, 1));
  const posAttr = screenGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const normX = x / (config.screenWidth / 2); // -1 to 1
    // Parabolic curve bending forward (+Z) at edges so screen wraps gently around audience
    const curveZ = (normX * normX) * config.screenCurveDepth;
    posAttr.setZ(i, curveZ);
  }
  screenGeo.computeVertexNormals();

  const screenMaterial = track(
    new THREE.MeshStandardMaterial({
      map: screenTexture,
      emissive: 0xffffff,
      emissiveMap: screenTexture,
      emissiveIntensity: 0.72,
      roughness: 0.92,
      metalness: 0.0,
      envMapIntensity: 0.08,
    }),
  );
  const screenMesh = new THREE.Mesh(screenGeo, screenMaterial);
  screenMesh.position.set(0, config.screenCenterY, config.screenZ);
  root.add(screenMesh);

  // Screen Matte Frame Backing (slightly larger & behind screen)
  const frameGeo = track(
    new THREE.PlaneGeometry(config.screenWidth + 0.9, config.screenHeight + 0.9, segX, 1),
  );
  const fAttr = frameGeo.attributes.position;
  for (let i = 0; i < fAttr.count; i++) {
    const x = fAttr.getX(i);
    const normX = x / ((config.screenWidth + 0.9) / 2);
    fAttr.setZ(i, (normX * normX) * config.screenCurveDepth - 0.06);
  }
  frameGeo.computeVertexNormals();
  const frameMesh = new THREE.Mesh(frameGeo, stageMat);
  frameMesh.position.set(0, config.screenCenterY, config.screenZ);
  root.add(frameMesh);

  // Shared Seat Geometries (Composite 4-part procedural chair, zero single-cube placeholders)
  const pedestalGeo = track(new THREE.CylinderGeometry(0.11, 0.16, 0.24, 12));

  // Beveled ExtrudeGeometry for ergonomic seat cushion
  const cushionShape = new THREE.Shape();
  cushionShape.moveTo(-0.24, -0.22);
  cushionShape.lineTo(0.24, -0.22);
  cushionShape.lineTo(0.24, 0.2);
  cushionShape.lineTo(-0.24, 0.2);
  cushionShape.closePath();
  const cushionGeo = track(
    new THREE.ExtrudeGeometry(cushionShape, {
      depth: 0.11,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
    }),
  );
  cushionGeo.rotateX(Math.PI / 2);

  // Contoured tall backrest + bolster
  const backShape = new THREE.Shape();
  backShape.moveTo(-0.24, 0);
  backShape.lineTo(0.24, 0);
  backShape.lineTo(0.21, 0.64);
  backShape.lineTo(-0.21, 0.64);
  backShape.closePath();
  const backrestGeo = track(
    new THREE.ExtrudeGeometry(backShape, {
      depth: 0.09,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.025,
      bevelSegments: 2,
    }),
  );

  const armrestGeo = track(new THREE.BoxGeometry(0.065, 0.07, 0.44));
  const cupholderGeo = track(new THREE.TorusGeometry(0.034, 0.009, 8, 14));
  cupholderGeo.rotateX(Math.PI / 2);

  // Invisible slightly generous hitbox for crisp touch/click raycasting
  const hitGeo = track(new THREE.BoxGeometry(0.68, 1.05, 0.68));
  const hitMat = track(new THREE.MeshBasicMaterial({ visible: false }));

  // Seat Material Pool (varied roughness & metalness between fabric/leather/metal parts)
  const seatMaterials = {
    standardAvailable: track(
      new THREE.MeshStandardMaterial({
        color: 0x881d2d,
        roughness: 0.82,
        metalness: 0.04,
      }),
    ),
    vipAvailable: track(
      new THREE.MeshStandardMaterial({
        color: 0x6f1938,
        roughness: 0.68,
        metalness: 0.08,
      }),
    ),
    selected: track(
      new THREE.MeshStandardMaterial({
        color: 0xe5a93b,
        emissive: 0x8f6214,
        emissiveIntensity: 0.45,
        roughness: 0.52,
        metalness: 0.14,
      }),
    ),
    occupied: track(
      new THREE.MeshStandardMaterial({
        color: 0x262a34,
        roughness: 0.9,
        metalness: 0.04,
      }),
    ),
    hovered: track(
      new THREE.MeshStandardMaterial({
        color: 0xc24156,
        emissive: 0x5c1824,
        emissiveIntensity: 0.35,
        roughness: 0.65,
        metalness: 0.08,
      }),
    ),
    armrestDark: track(
      new THREE.MeshStandardMaterial({
        color: 0x181a22,
        roughness: 0.42,
        metalness: 0.18,
      }),
    ),
    brassTrim: track(
      new THREE.MeshStandardMaterial({
        color: 0xd4a448,
        roughness: 0.24,
        metalness: 0.88,
      }),
    ),
    pedestalMetal: track(
      new THREE.MeshStandardMaterial({
        color: 0x15171c,
        roughness: 0.32,
        metalness: 0.78,
      }),
    ),
  };

  const seatNodes = new Map<string, SeatVisualNode>();
  const interactables: THREE.Mesh[] = [];

  for (const seat of seats) {
    const group = new THREE.Group();
    group.position.set(seat.x, seat.y, seat.z);
    group.rotation.y = seat.yawToScreen;
    if (seat.tier === 'vip') {
      group.scale.set(1.12, 1.04, 1.1);
    }

    const initialMat = seat.occupied
      ? seatMaterials.occupied
      : seat.tier === 'vip'
        ? seatMaterials.vipAvailable
        : seatMaterials.standardAvailable;

    // 1. Pedestal grounded at y=0 of riser
    const pedestal = new THREE.Mesh(pedestalGeo, seatMaterials.pedestalMetal);
    pedestal.position.set(0, 0.12, 0.02);
    group.add(pedestal);

    // 2. Seat pan cushion
    const cushionMesh = new THREE.Mesh(cushionGeo, initialMat);
    cushionMesh.position.set(0, 0.36, 0.02);
    cushionMesh.castShadow = true;
    cushionMesh.receiveShadow = true;
    group.add(cushionMesh);

    // 3. Contoured backrest slightly reclined backward (+Z)
    const backrestMesh = new THREE.Mesh(backrestGeo, initialMat);
    backrestMesh.position.set(0, 0.34, 0.2);
    backrestMesh.rotation.x = 0.15;
    backrestMesh.castShadow = true;
    backrestMesh.receiveShadow = true;
    group.add(backrestMesh);

    // 4. Twin armrests + cupholder ring
    const leftArm = new THREE.Mesh(armrestGeo, seatMaterials.armrestDark);
    leftArm.position.set(-0.29, 0.49, 0.02);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armrestGeo, seatMaterials.armrestDark);
    rightArm.position.set(0.29, 0.49, 0.02);
    group.add(rightArm);

    const cupholder = new THREE.Mesh(
      cupholderGeo,
      seat.tier === 'vip' ? seatMaterials.brassTrim : seatMaterials.pedestalMetal,
    );
    cupholder.position.set(0.29, 0.53, -0.14);
    group.add(cupholder);

    // Raycast hit proxy
    const hitProxy = new THREE.Mesh(hitGeo, hitMat);
    hitProxy.position.set(0, 0.52, 0.02);
    hitProxy.userData.seatId = seat.id;
    group.add(hitProxy);
    interactables.push(hitProxy);

    root.add(group);
    seatNodes.set(seat.id, {
      seat,
      group,
      cushionMesh,
      backrestMesh,
      trimMesh: cupholder,
      hitProxy,
    });
  }

  return {
    root,
    screenMaterial,
    screenTexture,
    screenCanvas,
    screenCtx,
    seatNodes,
    interactables,
    seatMaterials,
    updateScreenFrame(nextMovie: Movie, phase: number) {
      drawMovieScreenCanvas(
        screenCtx,
        screenCanvas.width,
        screenCanvas.height,
        nextMovie,
        phase,
      );
      screenTexture.needsUpdate = true;
    },
    dispose() {
      for (const d of disposables) {
        d.dispose();
      }
    },
  };
}
