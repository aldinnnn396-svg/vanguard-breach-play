// Tactical Map: "Outpost Bastion" - Two Bombsites (A & B), Mid, Long A, B Hall
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { getBrickTexture, getConcreteTexture, getWoodTexture, getHazardTexture, getSignTexture, getTitleSignTexture, getSkyTexture, getCorrugatedTexture, getAsphaltTexture } from './textures.js';

export function createWorld(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const materials = {};
  for (const [key, val] of Object.entries(PALETTE)) {
    materials[key] = new THREE.MeshStandardMaterial({
      color: new THREE.Color(val),
      roughness: key === 'accent' || key === 'siteA' || key === 'siteB' ? 0.4 : 0.88,
      metalness: key === 'hairline' ? 0.2 : 0.05,
    });
  }
  materials.brick = new THREE.MeshStandardMaterial({ map: getBrickTexture(), roughness: 0.88, metalness: 0.05 });
  materials.concrete = new THREE.MeshStandardMaterial({ map: getConcreteTexture(), roughness: 0.92, metalness: 0.04 });
  materials.wood = new THREE.MeshStandardMaterial({ map: getWoodTexture(), roughness: 0.82, metalness: 0.05 });
  materials.hazard = new THREE.MeshStandardMaterial({ map: getHazardTexture(), roughness: 0.65, metalness: 0.15 });
  materials.asphalt = new THREE.MeshStandardMaterial({ map: getAsphaltTexture(), roughness: 0.95, metalness: 0.02 });
  materials.crateBlue = new THREE.MeshStandardMaterial({ map: getCorrugatedTexture('#2a4a6b', 'corrBlue'), roughness: 0.6, metalness: 0.35 });
  materials.crateOrange = new THREE.MeshStandardMaterial({ map: getCorrugatedTexture('#b4622a', 'corrOrange'), roughness: 0.6, metalness: 0.35 });
  materials.steel = new THREE.MeshStandardMaterial({ color: 0x4a525c, roughness: 0.45, metalness: 0.8 });
  materials.lampGlow = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  materials.desert = new THREE.MeshStandardMaterial({ color: 0xc2a06b, roughness: 1, metalness: 0 });
  materials.mountainFar = new THREE.MeshStandardMaterial({ color: 0x7a5a6a, roughness: 1, metalness: 0, flatShading: true });
  materials.mountainNear = new THREE.MeshStandardMaterial({ color: 0x8a6a5a, roughness: 1, metalness: 0, flatShading: true });
  materials.mesa = new THREE.MeshStandardMaterial({ color: 0x9a7a5a, roughness: 1, metalness: 0, flatShading: true });
  materials.towerRed = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  materials.glassRoof = new THREE.MeshStandardMaterial({ color: 0x9ab8d8, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });

  const colliders = [];
  const shootables = [];

  function box(w, h, d, x, y, z, matName = 'surface', tile = 0) {
    const geom = new THREE.BoxGeometry(w, h, d);
    if (tile > 0) {
      const uv = geom.attributes.uv;
      const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
      for (let f = 0; f < 6; f++) {
        const sx = dims[f][0] / tile, sy = dims[f][1] / tile;
        for (let v = 0; v < 4; v++) {
          const i = f * 4 + v;
          uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
        }
      }
    }
    const mesh = new THREE.Mesh(geom, materials[matName] || materials.surface);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push(new THREE.Box3().setFromObject(mesh));
    shootables.push(mesh);
    return mesh;
  }

  // Floors: overall base + distinct zone floor plates
  box(60, 0.4, 76, 0, -0.4, 0, 'asphalt', 4);
  // Site A zone floor (amber tint)
  box(18, 0.05, 20, -15, 0, -11, 'hairline');
  // Site B zone floor (cyan tint)
  box(18, 0.05, 20, 15, 0, -11, 'hairline');
  // Mid courtyard floor
  box(16, 0.05, 24, 0, 0, 0, 'concrete', 3);

  // Outer Perimeter Walls: LOW (2.2m) so the desert horizon reads over
  // them, topped with a steel guard rail. The arena reads open, not a box.
  const WALL_H = 5.0;
  const OUTER_H = 2.2;
  box(60, OUTER_H, 0.8, 0, 0, -38, 'brick', 2.5); // North back wall
  box(60, OUTER_H, 0.8, 0, 0, 38, 'brick', 2.5);  // South back wall
  box(0.8, OUTER_H, 76, -30, 0, 0, 'brick', 2.5); // West outer wall
  box(0.8, OUTER_H, 76, 30, 0, 0, 'brick', 2.5);  // East outer wall

  // Long A divider wall (between Long A and Mid South)
  box(0.8, WALL_H, 26, -8, 0, 16, 'brick', 2.5);
  // Long A corner wall with doorway
  box(10, WALL_H, 0.8, -17, 0, 3, 'brick', 2.5);

  // B Tunnel divider wall (between B lane and Mid South)
  box(0.8, WALL_H, 26, 8, 0, 16, 'brick', 2.5);
  // B Tunnel choke wall with doorway
  box(10, WALL_H, 0.8, 17, 0, 3, 'brick', 2.5);

  // Mid side walls with archway cutouts to Bombsites A and B
  box(0.8, WALL_H, 14, -8, 0, -8, 'brick', 2.5);
  box(0.8, WALL_H, 14, 8, 0, -8, 'brick', 2.5);

  // Defender Spawn partition walls (separating Site A/B from Def Spawn)
  box(14, WALL_H, 0.8, -17, 0, -22, 'brick', 2.5);
  box(14, WALL_H, 0.8, 17, 0, -22, 'brick', 2.5);
  box(10, WALL_H, 0.8, 0, 0, -20, 'brick', 2.5);

  // Cover at headshot height (1.15m high)
  const CRATE_H = 1.15;
  // Bombsite A cover crates (Industrial theme)
  box(2.2, CRATE_H, 1.4, -15, 0, -11, 'wood', 1.5);
  box(1.4, CRATE_H, 2.4, -18, 0, -8, 'wood', 1.5);
  box(2.0, 2.2, 1.2, -12, 0, -15, 'wood', 1.5); // High box

  // Bombsite B cover crates (Tech bunker theme)
  box(2.2, CRATE_H, 1.4, 15, 0, -11, 'wood', 1.5);
  box(1.4, CRATE_H, 2.4, 18, 0, -8, 'wood', 1.5);
  box(2.0, 2.2, 1.2, 12, 0, -15, 'wood', 1.5); // High box

  // Mid Courtyard cover
  box(2.4, CRATE_H, 1.2, 0, 0, 2, 'hazard', 1.2);
  box(1.2, CRATE_H, 2.0, -3.5, 0, -4, 'hazard', 1.2);
  box(1.2, CRATE_H, 2.0, 3.5, 0, -4, 'hazard', 1.2);

  // Long A lane cover
  box(1.2, CRATE_H, 2.0, -14, 0, 14, 'hazard', 1.2);
  // B Tunnel lane cover
  box(1.2, CRATE_H, 2.0, 14, 0, 14, 'hazard', 1.2);

  // ---- War dressing: breaks the boxy look, makes the outpost read as a
  // battlefield. Solid props get colliders (and show on the minimap);
  // scorch/rubble/flags are visual only. Kept off the bot route lanes
  // (x = -15 / 0 / 15 corridors) so AI navigation is unaffected. ----
  materials.barrelRust = new THREE.MeshStandardMaterial({ color: 0x7a4a2b, roughness: 0.7, metalness: 0.35 });
  materials.barrelOlive = new THREE.MeshStandardMaterial({ color: 0x5a5a3a, roughness: 0.7, metalness: 0.35 });
  materials.sand = new THREE.MeshStandardMaterial({ color: 0x9a8a6a, roughness: 0.95, metalness: 0.0 });
  materials.rubble = new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: 0.95, metalness: 0.0 });
  materials.scorch = new THREE.MeshBasicMaterial({ color: 0x0a0a0c, transparent: true, opacity: 0.55, depthWrite: false });

  function barrel(x, z, matName) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.1, 12), materials[matName]);
    mesh.position.set(x, 0.55, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push(new THREE.Box3().setFromObject(mesh));
    shootables.push(mesh);
    // Lid ring.
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 14), materials.hairline);
    ring.position.set(x, 1.05, z);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    return mesh;
  }
  function sandbagWall(x, z, ry = 0) {
    const wall = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 0.7), materials.sand);
    base.position.y = 0.45;
    base.castShadow = true;
    base.receiveShadow = true;
    wall.add(base);
    // Top row of sandbags: squashed spheres.
    for (let i = 0; i < 5; i++) {
      const bag = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), materials.sand);
      bag.scale.set(1.15, 0.55, 0.85);
      bag.position.set(-1.0 + i * 0.5, 0.98, 0);
      bag.castShadow = true;
      wall.add(bag);
    }
    wall.position.set(x, 0, z);
    wall.rotation.y = ry;
    group.add(wall);
    colliders.push(new THREE.Box3().setFromObject(wall));
    shootables.push(base);
  }
  function rubblePile(x, z, s = 1) {
    for (let i = 0; i < 4; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 * s, 0), materials.rubble);
      rock.position.set(x + (i % 2) * 0.55 * s - 0.28 * s, 0.18 * s, z + Math.floor(i / 2) * 0.5 * s - 0.25 * s);
      rock.scale.y = 0.55;
      rock.rotation.set(i * 1.3, i * 2.1, 0.4);
      rock.receiveShadow = true;
      group.add(rock);
    }
  }
  function scorchMark(x, z, r = 1.6) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), materials.scorch);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.03, z);
    group.add(m);
  }
  function angledCrate(x, z, ry) {
    const mesh = box(2.0, CRATE_H, 1.4, x, 0, z, 'wood', 1.5);
    // Re-position after rotation: box() already added an axis-aligned
    // collider; rotate the mesh and rebuild its collider box.
    mesh.rotation.y = ry;
    mesh.updateMatrixWorld(true);
    colliders[colliders.length - 1] = new THREE.Box3().setFromObject(mesh);
  }
  function flagPole(x, z, colorHex) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 4.2, 8), materials.hairline);
    pole.position.set(x, 2.1, z);
    pole.castShadow = true;
    group.add(pole);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 0.75),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(colorHex), roughness: 0.9, side: THREE.DoubleSide })
    );
    flag.position.set(x + 0.7, 3.7, z);
    flag.rotation.y = 0.25;
    group.add(flag);
  }

  // Barrel clusters at site corners and lane mouths.
  barrel(-19.5, -15.5, 'barrelRust'); barrel(-18.6, -16.2, 'barrelOlive'); barrel(-19.2, -16.9, 'barrelRust');
  barrel(19.5, -15.5, 'barrelOlive'); barrel(18.6, -16.2, 'barrelRust'); barrel(19.2, -16.9, 'barrelOlive');
  barrel(-5.5, 10.5, 'barrelRust'); barrel(-4.6, 11.1, 'barrelOlive');
  barrel(5.5, 10.5, 'barrelOlive'); barrel(4.6, 11.1, 'barrelRust');
  barrel(-21.5, 20.5, 'barrelRust'); barrel(21.5, 20.5, 'barrelOlive');
  // Sandbag walls flanking mid and the sites.
  sandbagWall(-4.5, 6, 0.08); sandbagWall(4.5, 6, -0.08);
  sandbagWall(-11, -7, 0.12); sandbagWall(11, -7, -0.12);
  // Angled crates: break the 90-degree grid.
  angledCrate(-8, -14, 0.5); angledCrate(8, -14, -0.5);
  angledCrate(-19, 6, -0.4); angledCrate(19, 6, 0.4);
  // Stacked crates at the far site corners.
  box(1.6, 1.1, 1.6, -19.5, 0, -18.5, 'wood', 1.5);
  box(1.4, 1.0, 1.4, -19.4, 1.1, -18.4, 'wood', 1.5);
  box(1.6, 1.1, 1.6, 19.5, 0, -18.5, 'wood', 1.5);
  box(1.4, 1.0, 1.4, 19.4, 1.1, -18.4, 'wood', 1.5);
  // Rubble + scorch: battle damage.
  rubblePile(-22.5, -18, 1.1); rubblePile(22.5, -18, 1.0);
  rubblePile(-22, 28, 0.9); rubblePile(22, 28, 1.1);
  rubblePile(-6.5, -17.5, 0.8); rubblePile(6.5, -17.5, 0.8);
  scorchMark(-15, -8, 1.8); scorchMark(15, -8, 1.8);
  scorchMark(0, -2, 2.0); scorchMark(-14, 14, 1.5); scorchMark(14, 14, 1.5);
  // Watchtower in the south-west corner (landmark, walk-under).
  (function watchtower(x, z) {
    for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.0, 0.22), materials.wood);
      leg.position.set(x + dx, 1.5, z + dz);
      leg.castShadow = true;
      group.add(leg);
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.25, 2.6), materials.wood);
    deck.position.set(x, 3.1, z);
    deck.castShadow = true;
    group.add(deck);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 0.12), materials.sand);
    rail.position.set(x, 3.6, z - 1.2);
    group.add(rail);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.0, 0.9, 4), materials.rubble);
    roof.position.set(x, 4.6, z);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);
    colliders.push(new THREE.Box3().setFromObject(deck));
  })(-21.5, 26);
  // Site flags.
  flagPole(-15, -18.5, PALETTE.siteA);
  flagPole(15, -18.5, PALETTE.siteB);

  // ---- Houses & warehouses: solid buildings with pitched roofs, doors,
  // windows and chimneys. Placed off the bot lanes and spawn lines so AI
  // routes never cross a footprint. ----
  materials.roof = new THREE.MeshStandardMaterial({ color: 0x6b4a34, roughness: 0.9, metalness: 0.05 });
  materials.windowDark = new THREE.MeshStandardMaterial({ color: 0x141c26, roughness: 0.3, metalness: 0.4 });
  materials.doorMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.85, metalness: 0.05 });
  function house(x, z, w, d, h, faceRy = 0) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials.brick);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry((Math.max(w, d) + 0.8) * Math.SQRT1_2, 1.6, 4), materials.roof);
    roof.position.y = h + 0.8;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
    roof.castShadow = true;
    g.add(roof);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.5), materials.rubble);
    chimney.position.set(w * 0.28, h + 1.2, -d * 0.2);
    chimney.castShadow = true;
    g.add(chimney);
    // Door + windows on the facing side (+z local).
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.9), materials.doorMat);
    door.position.set(0, 0.95, d / 2 + 0.02);
    g.add(door);
    for (const wx of [-w * 0.3, w * 0.3]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), materials.windowDark);
      win.position.set(wx, h * 0.62, d / 2 + 0.02);
      g.add(win);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.06), materials.concrete);
      sill.position.set(wx, h * 0.62 - 0.45, d / 2 + 0.03);
      g.add(sill);
    }
    g.position.set(x, 0, z);
    g.rotation.y = faceRy;
    group.add(g);
    colliders.push(new THREE.Box3().setFromObject(body));
    shootables.push(body);
  }
  house(-21.5, 8, 5, 4, 3.4, Math.PI / 2);   // Long A house, faces the lane
  house(21.5, 8, 5, 4, 3.4, -Math.PI / 2);   // B lane house, faces the lane
  house(-10.5, -18, 4, 3.5, 3.2, 0);         // Site A approach house
  house(10.5, -18, 4, 3.5, 3.2, 0);          // Site B approach house
  house(0, 35, 10, 4, 4.2, Math.PI);         // Assault warehouse (backdrop)
  house(0, -35, 10, 4, 4.2, 0);              // Defender warehouse (backdrop)

  // ---- Tiered architecture: bridge, pillars, railings, lamps, cargo,
  // drums, open steel-and-glass roof frame. High structures are visual
  // only (no colliders); ground pieces use box() so they block movement
  // and shots like real cover. All kept off the bot lanes. ----
  function deco(geo, matName, x, y, z, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(geo, materials[matName]);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  }
  // Mid overpass bridge (deck + edge rails + support pillars).
  deco(new THREE.BoxGeometry(17, 0.5, 2.6), 'steel', 0, 4.45, 0);
  deco(new THREE.BoxGeometry(17, 0.08, 0.08), 'steel', 0, 5.35, -1.25);
  deco(new THREE.BoxGeometry(17, 0.08, 0.08), 'steel', 0, 5.35, 1.25);
  deco(new THREE.BoxGeometry(17, 0.08, 0.08), 'steel', 0, 4.95, -1.25);
  deco(new THREE.BoxGeometry(17, 0.08, 0.08), 'steel', 0, 4.95, 1.25);
  for (const px of [-8, -4, 0, 4, 8]) {
    deco(new THREE.BoxGeometry(0.08, 0.7, 0.08), 'steel', px, 5.0, -1.25);
    deco(new THREE.BoxGeometry(0.08, 0.7, 0.08), 'steel', px, 5.0, 1.25);
  }
  box(0.9, 4.2, 0.9, -6, 0, 0, 'concrete', 1.5);
  box(0.9, 4.2, 0.9, 6, 0, 0, 'concrete', 1.5);
  // Concrete pillars along both outer walls, every 6m.
  for (let z = -30; z <= 30; z += 6) {
    box(1, 5, 1, -28.8, 0, z, 'concrete', 1.5);
    box(1, 5, 1, 28.8, 0, z, 'concrete', 1.5);
  }
  // Railing fences flanking mid (thin colliders + bar visuals).
  for (const fx of [-3.5, 3.5]) {
    box(0.15, 1.1, 8, fx, 0, 8, 'steel');
    for (let z = 4.5; z <= 11.5; z += 1.75) deco(new THREE.BoxGeometry(0.12, 1.1, 0.12), 'steel', fx, 0.55, z);
    deco(new THREE.BoxGeometry(0.08, 0.08, 8), 'steel', fx, 1.05, 8);
    deco(new THREE.BoxGeometry(0.08, 0.08, 8), 'steel', fx, 0.6, 8);
  }
  // Hanging floodlight posts.
  function lampPost(x, z) {
    deco(new THREE.CylinderGeometry(0.09, 0.12, 5, 8), 'steel', x, 2.5, z);
    deco(new THREE.BoxGeometry(0.7, 0.12, 0.3), 'steel', x, 5.0, z);
    deco(new THREE.BoxGeometry(0.55, 0.22, 0.28), 'hairline', x, 4.85, z);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.2), materials.lampGlow);
    glow.position.set(x, 4.73, z);
    glow.rotation.x = Math.PI / 2;
    group.add(glow);
  }
  lampPost(-8, -6); lampPost(8, -6); lampPost(-8, 14); lampPost(8, 14);
  const floodA = new THREE.PointLight(0xffd9a0, 9, 20, 2);
  floodA.position.set(-8, 4.6, 14);
  scene.add(floodA);
  const floodB = new THREE.PointLight(0xffd9a0, 9, 20, 2);
  floodB.position.set(8, 4.6, 14);
  scene.add(floodB);
  // Corrugated cargo crates (industrial blue + orange).
  box(2.2, 2.2, 2.2, -5, 0, -14, 'crateBlue', 1.2);
  box(2.2, 2.2, 2.2, 5, 0, -14, 'crateOrange', 1.2);
  box(2.2, 2.2, 2.2, -19, 0, -6, 'crateOrange', 1.2);
  box(2.2, 2.2, 2.2, 19, 0, -6, 'crateBlue', 1.2);
  box(2.2, 2.2, 2.2, -4, 0, 18, 'crateOrange', 1.2);
  box(2.2, 2.2, 2.2, 4, 0, 18, 'crateBlue', 1.2);
  // Steel drums.
  barrel(-6.5, -13, 'steel');
  barrel(6.5, -13, 'steel');
  barrel(-20, -8, 'steel');
  barrel(20, -8, 'steel');
  // Open steel-and-glass roof frame high above the arena.
  for (const bz of [-20, -5, 10, 25]) deco(new THREE.BoxGeometry(52, 0.4, 0.5), 'steel', 0, 7, bz);
  for (const bx of [-13, 13]) deco(new THREE.BoxGeometry(0.5, 0.4, 76), 'steel', bx, 7.2, 0);
  for (const gz of [-12.5, 2.5, 17.5]) {
    const glass = deco(new THREE.PlaneGeometry(24, 12), 'glassRoof', 0, 7.1, gz, -Math.PI / 2);
    glass.castShadow = false;
    glass.receiveShadow = false;
  }

  // B Tunnel: covered passage on the east lane (bots + players pass under).
  box(0.8, 3, 4, 12.5, 0, 8, 'brick', 2);
  box(0.8, 3, 4, 17.5, 0, 8, 'brick', 2);
  box(5.8, 0.4, 4, 15, 3, 8, 'concrete', 1.5);

  // ---- Open horizon: desert plain, mountain ring, mesas, dunes, and a
  // giant comms tower outside the arena. No colliders, no shadows. ----
  function horizon(geo, matName, x, y, z, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(geo, materials[matName]);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = false;
    m.receiveShadow = false;
    group.add(m);
    return m;
  }
  horizon(new THREE.PlaneGeometry(420, 420), 'desert', 0, -0.06, 0, -Math.PI / 2);
  const peaks = [
    [-120, 95, 34, 46], [-70, 130, 30, 38], [0, 145, 38, 52], [75, 130, 32, 42],
    [125, 90, 30, 40], [150, 10, 36, 48], [140, -80, 30, 38], [80, -135, 34, 44],
    [0, -150, 40, 54], [-80, -135, 32, 42], [-145, -75, 34, 46], [-150, 5, 38, 50],
  ];
  peaks.forEach(([x, z, r, h], i) => {
    horizon(new THREE.ConeGeometry(r, h, 5), i % 2 ? 'mountainNear' : 'mountainFar', x, h / 2 - 1, z, 0, i * 0.7, 0);
  });
  horizon(new THREE.BoxGeometry(46, 14, 22), 'mesa', -95, 7, -105, 0, 0.3, 0);
  horizon(new THREE.BoxGeometry(38, 10, 18), 'mesa', 105, 5, -95, 0, -0.4, 0);
  horizon(new THREE.BoxGeometry(40, 12, 20), 'mesa', 115, 6, 75, 0, 0.5, 0);
  [[-55, 42], [52, 48], [-48, -52], [60, -44], [0, 62]].forEach(([x, z]) => {
    const dune = horizon(new THREE.SphereGeometry(11, 12, 8), 'desert', x, -1.5, z);
    dune.scale.y = 0.22;
  });
  // Giant comms tower, north-west beyond the walls.
  horizon(new THREE.BoxGeometry(4.5, 20, 4.5), 'steel', -62, 10, -78);
  horizon(new THREE.BoxGeometry(2.8, 15, 2.8), 'steel', -62, 27.5, -78);
  horizon(new THREE.BoxGeometry(1.4, 11, 1.4), 'steel', -62, 40.5, -78);
  horizon(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), 'steel', -62, 49, -78);
  horizon(new THREE.SphereGeometry(0.7, 10, 8), 'towerRed', -62, 53, -78);
  for (const [bx, by, rz] of [[-62, 16, 0.6], [-62, 24, -0.6], [-62, 32, 0.6], [-62, 39, -0.6]]) {
    horizon(new THREE.BoxGeometry(0.18, 9, 0.18), 'steel', bx, by, -78, 0, 0, rz);
  }

  // Guard rail along the lowered outer walls (visual only).
  const railY = 2.62;
  deco(new THREE.BoxGeometry(60, 0.08, 0.08), 'steel', 0, railY, -38);
  deco(new THREE.BoxGeometry(60, 0.08, 0.08), 'steel', 0, railY, 38);
  deco(new THREE.BoxGeometry(0.08, 0.08, 76), 'steel', -30, railY, 0);
  deco(new THREE.BoxGeometry(0.08, 0.08, 76), 'steel', 30, railY, 0);
  for (let x = -28; x <= 28; x += 8) {
    deco(new THREE.BoxGeometry(0.09, 0.5, 0.09), 'steel', x, 2.4, -38);
    deco(new THREE.BoxGeometry(0.09, 0.5, 0.09), 'steel', x, 2.4, 38);
  }
  for (let z = -36; z <= 36; z += 8) {
    deco(new THREE.BoxGeometry(0.09, 0.5, 0.09), 'steel', -30, 2.4, z);
    deco(new THREE.BoxGeometry(0.09, 0.5, 0.09), 'steel', 30, 2.4, z);
  }

  // ---- West balcony (high ground): climbable stairs + railed platform
  // overlooking Site A. The support is a solid box; the stairs are 0.5m
  // steps the player's step-up logic climbs. Clear of the x=-15 lane and
  // the Long A house (x -24..-19, z 6..10). ----
  box(6, 3.0, 10, -25, 0, -9, 'concrete', 2); // support, top at y 3.0
  const stepTops = [3.0, 2.5, 2.0, 1.5, 1.0, 0.5];
  stepTops.forEach((top, i) => {
    box(2.4, top, 0.9, -25, 0, -14.45 - i * 0.9, 'concrete', 1);
  });
  // Platform edge trim + railing (the stair opening on the north edge stays clear).
  deco(new THREE.BoxGeometry(6.6, 0.12, 0.12), 'steel', -25, 3.06, -14);
  deco(new THREE.BoxGeometry(6.6, 0.12, 0.12), 'steel', -25, 3.06, -4);
  deco(new THREE.BoxGeometry(0.12, 0.12, 10.6), 'steel', -28, 3.06, -9);
  deco(new THREE.BoxGeometry(0.12, 0.12, 10.6), 'steel', -22, 3.06, -9);
  function platRail(x1, z1, x2, z2) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    const ry = Math.atan2(x2 - x1, z2 - z1);
    deco(new THREE.BoxGeometry(0.08, 0.08, len), 'steel', cx, 3.95, cz, 0, ry, 0);
    deco(new THREE.BoxGeometry(0.08, 0.08, len), 'steel', cx, 3.55, cz, 0, ry, 0);
    const n = Math.max(2, Math.round(len / 2));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      deco(new THREE.BoxGeometry(0.09, 0.95, 0.09), 'steel', x1 + (x2 - x1) * t, 3.48, z1 + (z2 - z1) * t);
    }
  }
  platRail(-28, -4, -22, -4);   // south edge
  platRail(-28, -14, -28, -4);  // west edge
  platRail(-22, -14, -22, -4);  // east edge (overlooks the arena)
  platRail(-28, -14, -26.2, -14); // north edge, west of the stairs
  platRail(-23.8, -14, -22, -14); // north edge, east of the stairs
  // Sloped handrails flanking the stairs (rise toward the south).
  for (const sx of [-26.2, -23.8]) {
    deco(new THREE.BoxGeometry(0.08, 0.08, 6.4), 'steel', sx, 2.45, -16.7, -0.51, 0, 0);
  }
  // Dressing on the deck: crate + sandbag row.
  box(1.2, 1.2, 1.2, -27.2, 3, -12.5, 'crateBlue', 1);
  box(1.6, 0.7, 0.6, -26.5, 3, -6.5, 'concrete', 1);

  // Lane signposts: painted text panels on steel posts.
  function textSign(text, colorHex, w, h, x, y, z, ry) {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 128;
    const c2 = cv.getContext('2d');
    c2.fillStyle = '#141820';
    c2.fillRect(0, 0, 512, 128);
    c2.strokeStyle = colorHex;
    c2.lineWidth = 10;
    c2.strokeRect(8, 8, 496, 112);
    c2.fillStyle = colorHex;
    c2.font = 'bold 64px sans-serif';
    c2.textAlign = 'center';
    c2.textBaseline = 'middle';
    c2.fillText(text, 256, 66);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    group.add(m);
  }
  function signPost(text, colorHex, w, x, z, ry) {
    const dx = Math.cos(ry) * (w / 2 + 0.1);
    const dz = -Math.sin(ry) * (w / 2 + 0.1);
    deco(new THREE.BoxGeometry(0.12, 3.4, 0.12), 'steel', x - dx, 1.7, z - dz);
    deco(new THREE.BoxGeometry(0.12, 3.4, 0.12), 'steel', x + dx, 1.7, z + dz);
    textSign(text, colorHex, w, 1.05, x, 3.4, z, ry);
  }
  signPost('A LONG', PALETTE.siteA, 4.2, -29, 10, Math.PI / 2);
  signPost('B TUNNEL', PALETTE.siteB, 4.2, 29, 8, -Math.PI / 2);
  signPost('MID', PALETTE.accent, 2.4, 0, 24, 0);

  // Sky dome & Signage
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(400, 24, 16),
    new THREE.MeshBasicMaterial({ map: getSkyTexture(), side: THREE.BackSide, fog: false, depthWrite: false })
  );
  scene.add(sky);

  function addSign(tex, w, h, x, y, z, ry = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    group.add(m);
  }
  addSign(getSignTexture('A', PALETTE.siteA), 2.4, 2.4, -15, 3.0, -21.55);
  addSign(getSignTexture('B', PALETTE.siteB), 2.4, 2.4, 15, 3.0, -21.55);
  addSign(getTitleSignTexture(), 5.6, 1.4, -7.55, 3.2, 22, Math.PI / 2);

  // Lighting (warm dusk): low sun for long, sharp shadows.
  const sun = new THREE.DirectionalLight(0xffb870, 2.2);
  sun.position.set(38, 14, 26);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 5;
  sun.shadow.camera.far = 130;
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  scene.add(sun);

  const ambient = new THREE.AmbientLight(0x9e7d6e, 1.1);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x8a6085, 0x4a3224, 1.0);
  scene.add(hemi);

  // Site Beacon Lights
  const lightA = new THREE.PointLight(new THREE.Color(PALETTE.siteA), 2.5, 16);
  lightA.position.set(-15, 3.5, -11);
  scene.add(lightA);

  const lightB = new THREE.PointLight(new THREE.Color(PALETTE.siteB), 2.5, 16);
  lightB.position.set(15, 3.5, -11);
  scene.add(lightB);

  // Waypoints for AI navigation: routes from spawns to Mid, Long A, B Hall, and Sites A/B
  const waypoints = {
    assaultSpawns: [
      new THREE.Vector3(0, 0, 30),
      new THREE.Vector3(-4, 0, 30),
      new THREE.Vector3(4, 0, 30),
      new THREE.Vector3(-8, 0, 30),
      new THREE.Vector3(8, 0, 30),
      new THREE.Vector3(-12, 0, 30),
      new THREE.Vector3(12, 0, 30),
    ],
    defenderSpawns: [
      new THREE.Vector3(0, 0, -30),
      new THREE.Vector3(-4, 0, -30),
      new THREE.Vector3(4, 0, -30),
      new THREE.Vector3(-8, 0, -30),
      new THREE.Vector3(8, 0, -30),
      new THREE.Vector3(-12, 0, -30),
      new THREE.Vector3(12, 0, -30),
    ],
    siteA: new THREE.Vector3(-15, 0, -11),
    siteB: new THREE.Vector3(15, 0, -11),
    routesToA: [
      [new THREE.Vector3(-15, 0, 22), new THREE.Vector3(-15, 0, 8), new THREE.Vector3(-15, 0, -2), new THREE.Vector3(-15, 0, -11)],
      [new THREE.Vector3(0, 0, 16), new THREE.Vector3(-4, 0, 4), new THREE.Vector3(-11, 0, -4), new THREE.Vector3(-15, 0, -11)],
    ],
    routesToB: [
      [new THREE.Vector3(15, 0, 22), new THREE.Vector3(15, 0, 8), new THREE.Vector3(15, 0, -2), new THREE.Vector3(15, 0, -11)],
      [new THREE.Vector3(0, 0, 16), new THREE.Vector3(4, 0, 4), new THREE.Vector3(11, 0, -4), new THREE.Vector3(15, 0, -11)],
    ],
    routesMid: [
      [new THREE.Vector3(0, 0, 20), new THREE.Vector3(0, 0, 8), new THREE.Vector3(0, 0, -2), new THREE.Vector3(0, 0, -12)],
    ],
    defenderPatrolA: [
      new THREE.Vector3(-12, 0, -26), new THREE.Vector3(-15, 0, -16), new THREE.Vector3(-15, 0, -11),
    ],
    defenderPatrolB: [
      new THREE.Vector3(12, 0, -26), new THREE.Vector3(15, 0, -16), new THREE.Vector3(15, 0, -11),
    ],
  };

  return { group, colliders, shootables, waypoints };
}
