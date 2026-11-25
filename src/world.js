import * as THREE from "three";

// Smooth heightmap: flat village plaza + sledding hill on +X side (x > 15)
export function getTerrainHeight(x, z) {
  if (z > 80) return 0; // Cozy indoor cabin zone
  if (x <= 15) return 0;
  // Hill centered around z = 2, width ~22
  const dz = Math.abs(z - 2);
  const lateralFalloff = Math.max(0, 1 - Math.pow(dz / 18, 2));
  const t = Math.min(1, (x - 15) / 26);
  // Smooth S-curve rise
  const slope = t * t * (3 - 2 * t) * 9.5;
  return slope * lateralFalloff;
}

export function buildWinterWorld(scene) {
  // Sky & Fog
  const skyColor = new THREE.Color(0x9fbce0);
  scene.background = skyColor;
  scene.fog = new THREE.FogExp2(0xa8c3e3, 0.0085);

  // Lights
  const hemi = new THREE.HemisphereLight(0xddeeff, 0x8ea4c4, 0.85);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xfff6e8, 1.15);
  dirLight.position.set(18, 32, 22);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.near = 2;
  dirLight.shadow.camera.far = 110;
  const d = 42;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  // Terrain Mesh
  const groundGeo = new THREE.PlaneGeometry(140, 140, 96, 96);
  groundGeo.rotateX(-Math.PI / 2);
  const posAttr = groundGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    posAttr.setY(i, getTerrainHeight(vx, vz));
  }
  groundGeo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xf0f6ff,
    roughness: 0.92,
    metalness: 0.02,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  scene.add(ground);

  const colliders = []; // { x, z, r }

  // 1. Central Christmas Tree
  const treeCenter = { x: 0, z: -12 };
  const xmasTree = createChristmasTree();
  xmasTree.group.position.set(treeCenter.x, 0, treeCenter.z);
  scene.add(xmasTree.group);
  colliders.push({ x: treeCenter.x, z: treeCenter.z, r: 2.8 });

  // 2. Cozy Cabins
  const cabinPositions = [
    { x: -12, z: -15, rot: 0.45 },
    { x: 10, z: -16, rot: -0.5 },
    { x: -19, z: 7, rot: 1.2 },
  ];
  cabinPositions.forEach((c) => {
    const cabin = createCabin();
    cabin.position.set(c.x, getTerrainHeight(c.x, c.z), c.z);
    cabin.rotation.y = c.rot;
    scene.add(cabin);
    colliders.push({ x: c.x, z: c.z, r: 3.6 });
  });

  // 3. Street Lamps
  const lampPositions = [
    { x: -5, z: -6 },
    { x: 6, z: -7 },
    { x: -4, z: 7 },
    { x: 9, z: 7 },
    { x: -16, z: -3 },
  ];
  lampPositions.forEach((lp) => {
    const lamp = createStreetLamp();
    lamp.position.set(lp.x, getTerrainHeight(lp.x, lp.z), lp.z);
    scene.add(lamp);
    colliders.push({ x: lp.x, z: lp.z, r: 0.55 });
  });

  // 4. Pine Trees around village
  const pineCoords = [
    [-24, -22], [-18, -26], [-8, -28], [2, -29], [14, -27], [22, -22],
    [-27, -10], [-29, 2], [-27, 16], [-18, 22], [-6, 24], [6, 23],
    [18, 19], [28, 16], [34, 15], [32, -11], [24, -13], [40, -8],
    [42, 12], [-12, 18], [13, 15],
  ];
  pineCoords.forEach(([px, pz], idx) => {
    const scale = 0.85 + (idx % 4) * 0.22;
    const pine = createPineTree(scale);
    pine.position.set(px, getTerrainHeight(px, pz), pz);
    scene.add(pine);
    colliders.push({ x: px, z: pz, r: 1.2 * scale });
  });

  // 5. Campfire & 5 Logs
  const fireCenter = new THREE.Vector3(-10, 0, -2);
  const campfire = createCampfire();
  campfire.group.position.copy(fireCenter);
  scene.add(campfire.group);
  colliders.push({ x: fireCenter.x, z: fireCenter.z, r: 1.3 });

  const logs = [];
  const logRadius = 2.65;
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + 0.3;
    const lx = fireCenter.x + Math.cos(angle) * logRadius;
    const lz = fireCenter.z + Math.sin(angle) * logRadius;
    const log = createLogSeat();
    log.position.set(lx, 0, lz);
    // Orient tangent to campfire circle
    log.rotation.y = -angle + Math.PI / 2;
    scene.add(log);
    logs.push({
      mesh: log,
      seatPos: new THREE.Vector3(lx, 0.36, lz),
      faceTarget: fireCenter.clone(),
    });
  }

  // 6. Sledding Hill Signpost & Sled
  const signPos = new THREE.Vector3(12.5, getTerrainHeight(12.5, -1.5), -1.5);
  const signpost = createSignpost();
  signpost.position.copy(signPos);
  signpost.rotation.y = -0.35;
  scene.add(signpost);

  const sledHome = new THREE.Vector3(12.5, getTerrainHeight(12.5, 2), 2);
  const sled = createSled();
  sled.position.copy(sledHome);
  sled.rotation.y = Math.PI / 2;
  scene.add(sled);

  // 6b. Ice Fishing Pond & Signpost (spacious open spot at south-center plaza)
  const pondCenter = new THREE.Vector3(-2, 0, 17);
  const { pondGroup, fishingSpots } = createFishingPond(pondCenter);
  scene.add(pondGroup);

  const fishingSignPos = new THREE.Vector3(3.8, 0, 13.5);
  const fishingSign = createSignpost();
  fishingSign.position.copy(fishingSignPos);
  fishingSign.rotation.y = -0.5;
  scene.add(fishingSign);

  // 6c. Cabin Door Triggers (all 3 cabins, placed right outside collider radius)
  const cabinDoors = cabinPositions.map((c) => {
    const doorPos = new THREE.Vector3(
      c.x + Math.sin(c.rot) * 4.15,
      getTerrainHeight(c.x, c.z),
      c.z + Math.cos(c.rot) * 4.15
    );
    const matMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.06, 1.0),
      new THREE.MeshStandardMaterial({ color: 0xd96b52, roughness: 0.8 })
    );
    matMesh.position.set(doorPos.x, doorPos.y + 0.03, doorPos.z);
    matMesh.rotation.y = c.rot;
    scene.add(matMesh);
    return doorPos;
  });
  const cabinDoorPos = cabinDoors[0];

  // 6d. Cozy Cabin Interior (at z = 120)
  const indoor = createCabinInterior();
  scene.add(indoor.group);

  // 7. Falling Snow Particles
  const snowCount = 900;
  const snowGeo = new THREE.BufferGeometry();
  const snowPos = new Float32Array(snowCount * 3);
  for (let i = 0; i < snowCount; i++) {
    snowPos[i * 3] = (Math.random() - 0.5) * 90;
    snowPos[i * 3 + 1] = Math.random() * 26;
    snowPos[i * 3 + 2] = (Math.random() - 0.5) * 90;
  }
  snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));
  const snowMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.24,
    transparent: true,
    opacity: 0.85,
  });
  const snowPoints = new THREE.Points(snowGeo, snowMat);
  scene.add(snowPoints);

  // 8. Ground Trail / Footprint Pool (circular buffer of decals)
  const trailMax = 220;
  const trailMeshes = [];
  const trailGeo = new THREE.CircleGeometry(0.18, 10);
  trailGeo.rotateX(-Math.PI / 2);
  for (let i = 0; i < trailMax; i++) {
    const m = new THREE.Mesh(
      trailGeo,
      new THREE.MeshBasicMaterial({
        color: 0xc8daf0,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
    );
    m.visible = false;
    scene.add(m);
    trailMeshes.push(m);
  }
  let trailIdx = 0;

  function addSnowMark(x, z, scale = 1, color = 0xc5d8ef) {
    const m = trailMeshes[trailIdx];
    trailIdx = (trailIdx + 1) % trailMax;
    m.position.set(x, getTerrainHeight(x, z) + 0.03, z);
    m.scale.set(scale, 1, scale);
    m.material.color.setHex(color);
    m.material.opacity = 0.65;
    m.visible = true;
  }

  // Tap target ripple ring
  const ringGeo = new THREE.RingGeometry(0.32, 0.48, 28);
  ringGeo.rotateX(-Math.PI / 2);
  const tapRing = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({
      color: 0xf27d63,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    })
  );
  tapRing.visible = false;
  scene.add(tapRing);

  let tapRingLife = 0;
  function showTapRing(x, z) {
    tapRing.position.set(x, getTerrainHeight(x, z) + 0.05, z);
    tapRing.scale.set(0.6, 0.6, 0.6);
    tapRing.visible = true;
    tapRingLife = 1.0;
  }

  function update(dt, timeSec) {
    // Animate snow
    const arr = snowGeo.attributes.position.array;
    for (let i = 0; i < snowCount; i++) {
      arr[i * 3 + 1] -= dt * 2.2;
      arr[i * 3] += Math.sin(timeSec + i) * dt * 0.35;
      if (arr[i * 3 + 1] < 0) {
        arr[i * 3 + 1] = 24 + Math.random() * 4;
        arr[i * 3] = (Math.random() - 0.5) * 90;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 90;
      }
    }
    snowGeo.attributes.position.needsUpdate = true;

    // Animate campfire flames
    campfire.flames.forEach((f, idx) => {
      const s = 0.85 + Math.sin(timeSec * 10 + idx * 2) * 0.22;
      f.scale.set(1, s, 1);
      f.position.y = 0.42 + s * 0.14;
    });
    campfire.light.intensity = 2.6 + Math.sin(timeSec * 14) * 0.45;

    // Animate indoor fireplace flames
    indoor.flames.forEach((f, idx) => {
      const s = 0.85 + Math.cos(timeSec * 9 + idx * 2) * 0.2;
      f.scale.set(1, s, 1);
      f.position.y = 0.52 + s * 0.14;
    });
    indoor.light.intensity = 2.4 + Math.sin(timeSec * 12) * 0.35;

    // Animate Christmas star glow
    xmasTree.star.rotation.y = timeSec * 1.1;

    // Fade tap ring
    if (tapRingLife > 0) {
      tapRingLife -= dt * 2.1;
      if (tapRingLife <= 0) {
        tapRing.visible = false;
      } else {
        const s = 0.7 + (1 - tapRingLife) * 0.8;
        tapRing.scale.set(s, s, s);
        tapRing.material.opacity = tapRingLife * 0.85;
      }
    }
  }

  return {
    ground,
    indoorFloor: indoor.floor,
    colliders,
    logs,
    fireCenter,
    sled,
    sledHome,
    signPos,
    treeCenter,
    fishingSpots,
    fishingSignPos,
    cabinDoors,
    cabinDoorPos,
    indoorSpawnPos: indoor.spawnPos,
    indoorDoorPos: indoor.doorPos,
    indoorSofaPos: indoor.sofaPos,
    indoorBedPos: indoor.bedPos,
    indoorFirePos: indoor.firePos,
    addSnowMark,
    showTapRing,
    update,
  };
}

function createChristmasTree() {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.6, 1.8, 10),
    new THREE.MeshStandardMaterial({ color: 0x6c462f, roughness: 0.9 })
  );
  trunk.position.y = 0.9;
  trunk.castShadow = true;
  group.add(trunk);

  const greenMat = new THREE.MeshStandardMaterial({ color: 0x256947, roughness: 0.8 });
  const tiers = [
    { r: 2.8, h: 2.6, y: 2.4 },
    { r: 2.2, h: 2.3, y: 4.1 },
    { r: 1.55, h: 2.0, y: 5.6 },
    { r: 0.95, h: 1.5, y: 6.9 },
  ];
  const ornamentColors = [0xf25f5c, 0xffe066, 0x5dade2, 0xf78fb3, 0x70c1b3];

  tiers.forEach((t, ti) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 12), greenMat);
    cone.position.y = t.y;
    cone.castShadow = true;
    cone.receiveShadow = true;
    group.add(cone);

    // Ornaments around each tier
    const count = 8 - ti;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + ti * 0.4;
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 10, 10),
        new THREE.MeshStandardMaterial({
          color: ornamentColors[(i + ti) % ornamentColors.length],
          emissive: ornamentColors[(i + ti) % ornamentColors.length],
          emissiveIntensity: 0.25,
          roughness: 0.3,
        })
      );
      orb.position.set(
        Math.cos(ang) * (t.r * 0.78),
        t.y - t.h * 0.3,
        Math.sin(ang) * (t.r * 0.78)
      );
      group.add(orb);
    }
  });

  // Star on top
  const star = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.42, 0),
    new THREE.MeshStandardMaterial({
      color: 0xffe066,
      emissive: 0xffc300,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    })
  );
  star.position.y = 7.95;
  group.add(star);

  const starLight = new THREE.PointLight(0xffe07d, 1.5, 14);
  starLight.position.y = 8.1;
  group.add(starLight);

  // Gift boxes under tree
  const gifts = [
    { x: -1.4, z: 1.4, c: 0xf25f5c, s: 0.65 },
    { x: 1.3, z: 1.5, c: 0x5dade2, s: 0.75 },
    { x: 0.1, z: 1.9, c: 0xffe066, s: 0.55 },
  ];
  gifts.forEach((g) => {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(g.s, g.s, g.s),
      new THREE.MeshStandardMaterial({ color: g.c, roughness: 0.6 })
    );
    box.position.set(g.x, g.s / 2, g.z);
    box.castShadow = true;
    group.add(box);
  });

  return { group, star };
}

function createCabin() {
  const group = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x87583a, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 0.9 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x5c3823, roughness: 0.85 });
  const winMat = new THREE.MeshStandardMaterial({
    color: 0xffdf80,
    emissive: 0xffb833,
    emissiveIntensity: 0.85,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.0, 4.2), wallMat);
  body.position.y = 1.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Pitched roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.85, 2.2, 4), roofMat);
  roof.position.y = 4.05;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  // Door
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.7, 0.14), trimMat);
  door.position.set(0, 0.85, 2.12);
  group.add(door);

  // Glowing windows
  [-1.35, 1.35].forEach((wx) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.14), winMat);
    win.position.set(wx, 1.75, 2.12);
    group.add(win);
  });

  const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.95, 1.0), winMat);
  sideWin.position.set(2.42, 1.75, 0);
  group.add(sideWin);

  return group;
}

function createStreetLamp() {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 3.8, 8),
    new THREE.MeshStandardMaterial({ color: 0x353b48, roughness: 0.6 })
  );
  pole.position.y = 1.9;
  pole.castShadow = true;
  group.add(pole);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0xfff3b0,
      emissive: 0xffd166,
      emissiveIntensity: 0.95,
    })
  );
  bulb.position.y = 3.9;
  group.add(bulb);

  const light = new THREE.PointLight(0xffd98a, 1.1, 11);
  light.position.y = 3.8;
  group.add(light);

  return group;
}

function createPineTree(scale = 1) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.3, 1.1, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b472f, roughness: 0.9 })
  );
  trunk.position.y = 0.55;
  trunk.castShadow = true;
  group.add(trunk);

  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2c6e49, roughness: 0.85 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf4f9ff, roughness: 0.9 });

  [
    { r: 1.5, h: 1.7, y: 1.65 },
    { r: 1.15, h: 1.5, y: 2.75 },
    { r: 0.78, h: 1.2, y: 3.7 },
  ].forEach((t) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 9), leafMat);
    c.position.y = t.y;
    c.castShadow = true;
    group.add(c);
  });

  const snowCap = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.7, 9), snowMat);
  snowCap.position.y = 4.05;
  group.add(snowCap);

  group.scale.setScalar(scale);
  return group;
}

function createCampfire() {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8d99ae, roughness: 0.9 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), stoneMat);
    stone.position.set(Math.cos(a) * 0.95, 0.14, Math.sin(a) * 0.95);
    stone.castShadow = true;
    group.add(stone);
  }

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.1, 8), woodMat);
    w.rotation.z = Math.PI / 2;
    w.rotation.y = (i / 3) * Math.PI;
    w.position.y = 0.14;
    group.add(w);
  }

  const flames = [];
  const flameColors = [0xff6b35, 0xffa62b, 0xffe066];
  flameColors.forEach((fc, idx) => {
    const f = new THREE.Mesh(
      new THREE.ConeGeometry(0.32 - idx * 0.07, 0.8 - idx * 0.12, 8),
      new THREE.MeshBasicMaterial({ color: fc, transparent: true, opacity: 0.9 })
    );
    f.position.set((idx - 1) * 0.12, 0.5, 0);
    group.add(f);
    flames.push(f);
  });

  const light = new THREE.PointLight(0xff9f43, 2.6, 13);
  light.position.y = 1.1;
  group.add(light);

  return { group, flames, light };
}

function createLogSeat() {
  const group = new THREE.Group();
  const log = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 1.65, 12),
    new THREE.MeshStandardMaterial({ color: 0x7b4f32, roughness: 0.88 })
  );
  log.rotation.z = Math.PI / 2;
  log.position.y = 0.24;
  log.castShadow = true;
  log.receiveShadow = true;
  group.add(log);

  // Snow strip on top
  const snow = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.08, 0.26),
    new THREE.MeshStandardMaterial({ color: 0xf4f9ff, roughness: 0.9 })
  );
  snow.position.y = 0.5;
  group.add(snow);
  return group;
}

function createSignpost() {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a4e2d, roughness: 0.85 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.8, 8), woodMat);
  post.position.y = 0.9;
  post.castShadow = true;
  group.add(post);

  const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.52, 0.12), woodMat);
  board.position.y = 1.55;
  board.castShadow = true;
  group.add(board);
  return group;
}

function createSled() {
  const group = new THREE.Group();
  const runnerMat = new THREE.MeshStandardMaterial({ color: 0x5c3823, roughness: 0.7 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xd94f4f, roughness: 0.55 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0xf7e3c6, roughness: 0.7 });

  [-0.36, 0.36].forEach((x) => {
    const runner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 1.45), runnerMat);
    runner.position.set(x, 0.08, 0);
    runner.castShadow = true;
    group.add(runner);
  });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.08, 1.3), deckMat);
  deck.position.y = 0.2;
  deck.castShadow = true;
  group.add(deck);

  const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.85), seatMat);
  cushion.position.set(0, 0.26, -0.05);
  group.add(cushion);

  return group;
}

export function createSnowmanMesh(
  deco = { scarf: "#f26b5b", buttons: "#2b2d42", hat: "#f48fb1", hatStyle: "beanie" }
) {
  const group = new THREE.Group();
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });

  // Bottom body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.95, 24, 18), snowMat);
  body.position.y = 0.85;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.66, 24, 18), snowMat);
  head.position.y = 2.15;
  head.castShadow = true;
  group.add(head);

  // Eyes
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1d222b, roughness: 0.4 });
  [-0.2, 0.2].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), eyeMat);
    eye.position.set(ex, 2.25, 0.6);
    group.add(eye);
  });

  // Carrot nose
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.075, 0.34, 10),
    new THREE.MeshStandardMaterial({ color: 0xf77f00, roughness: 0.6 })
  );
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 2.13, 0.74);
  group.add(nose);

  // Stick arms
  const armMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 });
  [-1, 1].forEach((dir) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.15, 6), armMat);
    arm.position.set(dir * 1.15, 1.38, 0);
    arm.rotation.z = dir * -1.1;
    arm.castShadow = true;
    group.add(arm);
  });

  // Customizable Scarf
  const scarfMat = new THREE.MeshStandardMaterial({ color: deco.scarf, roughness: 0.6 });
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.13, 12, 24), scarfMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.62;
  group.add(scarf);

  // Customizable Buttons
  const btnMat = new THREE.MeshStandardMaterial({ color: deco.buttons, roughness: 0.5 });
  const btnMeshes = [];
  [1.2, 0.95, 0.7].forEach((by) => {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), btnMat);
    btn.position.set(0, by, 0.92 - Math.abs(by - 0.95) * 0.25);
    group.add(btn);
    btnMeshes.push(btn);
  });

  // Customizable Hats (4 styles sharing hatMat)
  const hatMat = new THREE.MeshStandardMaterial({ color: deco.hat, roughness: 0.65 });
  const hatContainer = new THREE.Group();
  hatContainer.position.y = 2.55;
  group.add(hatContainer);

  const hatModels = {};

  // 1. Beanie
  const beanie = new THREE.Group();
  const beanieDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.54, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hatMat
  );
  beanieDome.position.y = -0.03;
  beanieDome.castShadow = true;
  const beanieBrim = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.09, 10, 24), snowMat);
  beanieBrim.rotation.x = Math.PI / 2;
  const beaniePom = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), snowMat);
  beaniePom.position.y = 0.55;
  beanie.add(beanieDome, beanieBrim, beaniePom);
  hatContainer.add(beanie);
  hatModels.beanie = beanie;

  // 2. Top Hat
  const tophat = new THREE.Group();
  const topBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.07, 24), hatMat);
  topBrim.position.y = 0.02;
  topBrim.castShadow = true;
  const topCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.62, 24), hatMat);
  topCrown.position.y = 0.34;
  topCrown.castShadow = true;
  const topRibbon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.46, 0.12, 24),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
  );
  topRibbon.position.y = 0.12;
  tophat.add(topBrim, topCrown, topRibbon);
  hatContainer.add(tophat);
  hatModels.tophat = tophat;

  // 3. Santa Hat
  const santa = new THREE.Group();
  const santaBrim = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.1, 10, 24), snowMat);
  santaBrim.rotation.x = Math.PI / 2;
  const santaCone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.85, 20), hatMat);
  santaCone.position.set(0.08, 0.38, -0.04);
  santaCone.rotation.z = -0.24;
  santaCone.castShadow = true;
  const santaPom = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), snowMat);
  santaPom.position.set(0.19, 0.8, -0.04);
  santa.add(santaBrim, santaCone, santaPom);
  hatContainer.add(santa);
  hatModels.santa = santa;

  // 4. Beret
  const beret = new THREE.Group();
  const beretCap = new THREE.Mesh(new THREE.SphereGeometry(0.58, 22, 14), hatMat);
  beretCap.scale.set(1.08, 0.42, 1.08);
  beretCap.position.set(-0.05, 0.16, 0);
  beretCap.rotation.z = 0.18;
  beretCap.castShadow = true;
  const beretStem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8), hatMat);
  beretStem.position.set(-0.08, 0.41, 0);
  beretStem.rotation.z = 0.18;
  beret.add(beretCap, beretStem);
  hatContainer.add(beret);
  hatModels.beret = beret;

  function applyHatStyle(style) {
    const active = hatModels[style] ? style : "beanie";
    Object.entries(hatModels).forEach(([k, m]) => {
      m.visible = k === active;
    });
  }
  applyHatStyle(deco.hatStyle || "beanie");

  return {
    group,
    updateColors(nextDeco) {
      scarfMat.color.set(nextDeco.scarf);
      btnMat.color.set(nextDeco.buttons);
      hatMat.color.set(nextDeco.hat);
      if (nextDeco.hatStyle) {
        applyHatStyle(nextDeco.hatStyle);
      }
    },
  };
}

function createFishingPond(center) {
  const pondGroup = new THREE.Group();
  pondGroup.position.copy(center);

  // Ice sheet
  const ice = new THREE.Mesh(
    new THREE.CircleGeometry(5.6, 36),
    new THREE.MeshStandardMaterial({
      color: 0xaee2ff,
      roughness: 0.18,
      metalness: 0.15,
    })
  );
  ice.rotation.x = -Math.PI / 2;
  ice.position.y = 0.03;
  ice.receiveShadow = true;
  pondGroup.add(ice);

  // Snow rim
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(5.65, 0.35, 10, 36),
    new THREE.MeshStandardMaterial({ color: 0xf4f9ff, roughness: 0.9 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.05;
  pondGroup.add(rim);

  const holeOffsets = [
    { hx: -1.6, hz: -0.6, sx: -1.6, sz: 1.3 },
    { hx: 1.7, hz: 0.5, sx: 1.7, sz: 2.4 },
  ];
  const fishingSpots = [];
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7b4f32, roughness: 0.85 });

  holeOffsets.forEach(({ hx, hz, sx, sz }) => {
    // Dark water hole
    const hole = new THREE.Mesh(
      new THREE.CircleGeometry(0.65, 20),
      new THREE.MeshStandardMaterial({ color: 0x1b4965, roughness: 0.25 })
    );
    hole.rotation.x = -Math.PI / 2;
    hole.position.set(hx, 0.05, hz);
    pondGroup.add(hole);

    // Wooden fishing stool
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.32, 12), woodMat);
    stool.position.set(sx, 0.16, sz);
    stool.castShadow = true;
    pondGroup.add(stool);

    fishingSpots.push({
      seatPos: new THREE.Vector3(center.x + sx, 0.32, center.z + sz),
      holePos: new THREE.Vector3(center.x + hx, 0.05, center.z + hz),
    });
  });

  // Wooden bucket near pond
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.45, 12), woodMat);
  bucket.position.set(0, 0.24, 2.7);
  bucket.castShadow = true;
  pondGroup.add(bucket);

  return { pondGroup, fishingSpots };
}

function createCabinInterior() {
  const group = new THREE.Group();
  const baseZ = 120;
  group.position.set(0, 0, baseZ);

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x9b6b43, roughness: 0.82 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x7c4e2d, roughness: 0.86 });

  // Wooden floor (raycastable for indoor tap-to-move!)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.02;
  floor.receiveShadow = true;
  group.add(floor);

  // Cozy rug
  const rug = new THREE.Mesh(
    new THREE.CircleGeometry(3.1, 32),
    new THREE.MeshStandardMaterial({ color: 0xd96b52, roughness: 0.92 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.035, 0.3);
  rug.receiveShadow = true;
  group.add(rug);

  // Back & side walls
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(14, 5.2, 0.4), wallMat);
  backWall.position.set(0, 2.6, -5.8);
  group.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.2, 12), wallMat);
  leftWall.position.set(-6.8, 2.6, 0);
  group.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.2, 12), wallMat);
  rightWall.position.set(6.8, 2.6, 0);
  group.add(rightWall);

  // Glowing winter window on back wall
  const winFrame = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 2.0, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x4e301b, roughness: 0.8 })
  );
  winFrame.position.set(-3.4, 2.6, -5.55);
  const winGlass = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.6, 0.14),
    new THREE.MeshBasicMaterial({ color: 0xb7d8f7 })
  );
  winGlass.position.set(-3.4, 2.6, -5.53);
  group.add(winFrame, winGlass);

  // Stone Fireplace on back wall
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7b8698, roughness: 0.9 });
  const fpMantel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.7, 1.1), stoneMat);
  fpMantel.position.set(2.2, 1.35, -5.15);
  fpMantel.castShadow = true;
  group.add(fpMantel);

  const fpHearth = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.3, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x262322, roughness: 0.95 })
  );
  fpHearth.position.set(2.2, 0.65, -4.9);
  group.add(fpHearth);

  const flames = [];
  [0xff6b35, 0xffa62b, 0xffe066].forEach((fc, idx) => {
    const f = new THREE.Mesh(
      new THREE.ConeGeometry(0.28 - idx * 0.06, 0.72 - idx * 0.1, 8),
      new THREE.MeshBasicMaterial({ color: fc, transparent: true, opacity: 0.92 })
    );
    f.position.set(2.2 + (idx - 1) * 0.14, 0.55, -4.75);
    group.add(f);
    flames.push(f);
  });

  const light = new THREE.PointLight(0xffb26b, 2.4, 16);
  light.position.set(2.2, 2.2, -3.5);
  group.add(light);

  const roomLight = new THREE.PointLight(0xffe8c8, 1.4, 20);
  roomLight.position.set(0, 4.4, 0);
  group.add(roomLight);

  // Plush Sofa
  const sofaMat = new THREE.MeshStandardMaterial({ color: 0xc94e4e, roughness: 0.75 });
  const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.65, 1.3), sofaMat);
  sofaBase.position.set(-2.2, 0.33, -1.6);
  sofaBase.castShadow = true;
  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.95, 0.35), sofaMat);
  sofaBack.position.set(-2.2, 0.9, -2.1);
  sofaBack.castShadow = true;
  group.add(sofaBase, sofaBack);

  // Coffee Table with Hot Cocoa Mugs
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8 });
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 1.1), tableMat);
  tableTop.position.set(-2.2, 0.55, 0.15);
  tableTop.castShadow = true;
  group.add(tableTop);

  [-2.6, -1.8].forEach((mx) => {
    const mug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.1, 0.18, 12),
      new THREE.MeshStandardMaterial({ color: 0xfff5e4, roughness: 0.4 })
    );
    mug.position.set(mx, 0.7, 0.15);
    group.add(mug);
  });

  // Cozy Bed on the right side
  const bedFrame = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.35, 3.1),
    new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.85 })
  );
  bedFrame.position.set(4.0, 0.18, 0.5);
  bedFrame.castShadow = true;
  const bedHead = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.95, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x5c3823, roughness: 0.85 })
  );
  bedHead.position.set(4.0, 0.65, -0.95);
  const mattress = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.24, 2.85),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
  );
  mattress.position.set(4.0, 0.44, 0.5);
  const blanket = new THREE.Mesh(
    new THREE.BoxGeometry(1.95, 0.28, 1.9),
    new THREE.MeshStandardMaterial({ color: 0x6fa8dc, roughness: 0.75 })
  );
  blanket.position.set(4.0, 0.46, 0.95);
  const pillow = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 0.18, 0.55),
    new THREE.MeshStandardMaterial({ color: 0xfff4e6, roughness: 0.7 })
  );
  pillow.position.set(4.0, 0.62, -0.2);
  group.add(bedFrame, bedHead, mattress, blanket, pillow);

  // Exit doormat
  const doorMat = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.06, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x48c9b0, roughness: 0.8 })
  );
  doorMat.position.set(0, 0.04, 4.7);
  group.add(doorMat);

  return {
    group,
    floor,
    flames,
    light,
    spawnPos: new THREE.Vector3(0, 0, baseZ + 3.1),
    doorPos: new THREE.Vector3(0, 0, baseZ + 4.7),
    sofaPos: new THREE.Vector3(-2.2, 0.78, baseZ - 1.45),
    bedPos: new THREE.Vector3(4.0, 0.50, baseZ + 1.35),
    firePos: new THREE.Vector3(2.2, 0, baseZ - 3.3),
  };
}
