import * as THREE from "three";
import QRCode from "qrcode";
import { winterAudio } from "./audio.js";
import { CHARACTER_META, createCharacter } from "./characters.js";
import { buildWinterWorld, createSnowmanMesh, getTerrainHeight } from "./world.js";

// Prevent long-press right-click / context menu on electronic whiteboards
window.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("dragstart", (e) => e.preventDefault());
document.addEventListener("selectstart", (e) => {
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
  e.preventDefault();
});

// --- DOM References ---
const canvas = document.getElementById("game-canvas");
const startOverlay = document.getElementById("start-overlay");
const charGrid = document.getElementById("char-grid");
const nicknameInput = document.getElementById("nickname-input");
const quickNames = document.getElementById("quick-names");
const enterBtn = document.getElementById("enter-village-btn");
const startShareBtn = document.getElementById("start-share-btn");

const hud = document.getElementById("hud");
const playerBadgeEmoji = document.getElementById("player-badge-emoji");
const playerBadgeName = document.getElementById("player-badge-name");
const playerCountLabel = document.getElementById("player-count-label");
const snowmanCountLabel = document.getElementById("snowman-count-label");
const fishCountLabel = document.getElementById("fish-count-label");
const shareQrBtn = document.getElementById("share-qr-btn");
const chatToggleBtn = document.getElementById("chat-toggle-btn");
const chatPanel = document.getElementById("chat-panel");
const chatMessagesEl = document.getElementById("chat-messages");
const chatQuickRow = document.getElementById("chat-quick-row");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const joystickToggleBtn = document.getElementById("joystick-toggle-btn");
const soundToggleBtn = document.getElementById("sound-toggle-btn");
const fullscreenBtn = document.getElementById("fullscreen-btn");
const joystickZone = document.getElementById("joystick-zone");
const joystickBase = document.getElementById("joystick-base");
const joystickKnob = document.getElementById("joystick-knob");

const shareModal = document.getElementById("share-modal");
const shareQrCanvas = document.getElementById("share-qr-canvas");
const shareUrlText = document.getElementById("share-url-text");
const shareCopyBtn = document.getElementById("share-copy-btn");
const shareCloseBtn = document.getElementById("share-close-btn");

const camZoomInBtn = document.getElementById("cam-zoom-in");
const camZoomOutBtn = document.getElementById("cam-zoom-out");
const camResetBtn = document.getElementById("cam-reset");

const toastBanner = document.getElementById("toast-banner");
const labelsLayer = document.getElementById("labels-layer");

const actionExplore = document.getElementById("action-explore");
const makeSnowmanBtn = document.getElementById("make-snowman-btn");
const contextualBtn = document.getElementById("contextual-btn");
const contextualIcon = document.getElementById("contextual-icon");
const contextualLabel = document.getElementById("contextual-label");

const actionSitting = document.getElementById("action-sitting");
const standUpBtn = document.getElementById("stand-up-btn");
const roastBtn = document.getElementById("roast-btn");
const eatBtn = document.getElementById("eat-btn");

const actionRolling = document.getElementById("action-rolling");
const rollingTip = document.getElementById("rolling-tip");
const rollingProgress = document.getElementById("rolling-progress");
const cancelRollingBtn = document.getElementById("cancel-rolling-btn");
const placeSnowballBtn = document.getElementById("place-snowball-btn");

const actionDecorate = document.getElementById("action-decorate");
const decoTabs = document.querySelectorAll(".deco-tab");
const hatStylesRow = document.getElementById("hat-styles");
const hatStyleBtns = document.querySelectorAll(".hat-style-btn");
const colorSwatches = document.querySelectorAll(".swatch");
const finishDecoBtn = document.getElementById("finish-deco-btn");

const actionSnowmanNear = document.getElementById("action-snowman-near");
const redecorateBtn = document.getElementById("redecorate-btn");
const photoBtn = document.getElementById("photo-btn");

const actionFishing = document.getElementById("action-fishing");
const stopFishingBtn = document.getElementById("stop-fishing-btn");
const pullFishBtn = document.getElementById("pull-fish-btn");
const pullFishLabel = document.getElementById("pull-fish-label");

const actionIndoor = document.getElementById("action-indoor");
const exitCabinBtn = document.getElementById("exit-cabin-btn");
const sofaSitBtn = document.getElementById("sofa-sit-btn");
const bedLieBtn = document.getElementById("bed-lie-btn");
const cocoaBtn = document.getElementById("cocoa-btn");

const sledSteerUI = document.getElementById("sled-steer-ui");
const sledLeftBtn = document.getElementById("sled-left-btn");
const sledRightBtn = document.getElementById("sled-right-btn");

const photoFlash = document.getElementById("photo-flash");
const photoModal = document.getElementById("photo-modal");
const photoPreviewImg = document.getElementById("photo-preview-img");
const photoDownloadBtn = document.getElementById("photo-download-btn");
const photoCloseBtn = document.getElementById("photo-close-btn");

// --- Three.js Setup ---
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 180);

const world = buildWinterWorld(scene);

// --- Game State ---
let selectedCharType = "rabbit";
let playerNickname = "버니";
let player = createCharacter(selectedCharType);
player.root.position.set(0, 0, 5);
scene.add(player.root);

let gameState = "SELECT";
let activeLog = null;
let roastTimer = 0;
let roastDone = false;

let camYaw = 0;
let camPitch = 0.42;
let camDist = 11.5;

let moveTarget = null;
const joyVec = new THREE.Vector2(0, 0);
const keysDown = new Set();
let stepMarkAccum = 0;

let rollingBall = null;
let rollingAmount = 0;
let placedBodyPos = null;
let placedBodyMesh = null;
const snowmen = [];
let activeSnowman = null;
let activeDecoPart = "scarf";

let sledSteerInput = 0;
let sledSpeed = 0;
let sledLateralVel = 0;

let fishCount = 0;
let fishBiteTimer = 0;
let fishBiting = false;
let fishCatchTimer = 0;
let activeFishSpot = null;
let isIndoors = false;
let indoorPose = "idle"; // idle | sit | cocoa | sleep
let activeCabinDoor = world.cabinDoorPos;

let toastTimeout = null;
function showToast(msg, durationMs = 2400) {
  toastBanner.textContent = msg;
  toastBanner.classList.remove("hidden");
  clearTimeout(toastTimeout);
  if (durationMs > 0) {
    toastTimeout = setTimeout(() => toastBanner.classList.add("hidden"), durationMs);
  }
}

// --- World Labels ---
const playerLabelEl = document.createElement("div");
playerLabelEl.className = "world-label hidden";
playerLabelEl.textContent = playerNickname;
labelsLayer.appendChild(playerLabelEl);

const signLabelEl = document.createElement("div");
signLabelEl.className = "world-label signpost";
signLabelEl.textContent = "🛷 썰매 언덕";
labelsLayer.appendChild(signLabelEl);

const fishingSignLabelEl = document.createElement("div");
fishingSignLabelEl.className = "world-label signpost";
fishingSignLabelEl.textContent = "🎣 얼음 낚시터";
labelsLayer.appendChild(fishingSignLabelEl);

const cabinDoorLabelEl = document.createElement("div");
cabinDoorLabelEl.className = "world-label signpost";
cabinDoorLabelEl.textContent = "🚪 오두막 집";
labelsLayer.appendChild(cabinDoorLabelEl);

// --- Multiplayer & Chat State ---
let ws = null;
let myPlayerId = null;
let currentLocalPose = "idle";
let netSendTimer = 0;
const remotePlayers = new Map();

const localBubbleEl = document.createElement("div");
localBubbleEl.className = "speech-bubble hidden";
labelsLayer.appendChild(localBubbleEl);
let localBubbleUntil = 0;

function showSpeechBubble(id, text) {
  const expire = performance.now() + 4200;
  if (id === myPlayerId || id === "local") {
    localBubbleEl.textContent = text;
    localBubbleEl.classList.remove("hidden");
    localBubbleUntil = expire;
  } else {
    const rp = remotePlayers.get(id);
    if (rp) {
      rp.bubbleEl.textContent = text;
      rp.bubbleEl.classList.remove("hidden");
      rp.bubbleUntil = expire;
    }
  }
}

function appendChatMessage(author, text, isSystem = false) {
  const item = document.createElement("div");
  item.className = isSystem ? "chat-msg-item system" : "chat-msg-item";
  if (isSystem) {
    item.textContent = text;
  } else {
    const span = document.createElement("span");
    span.className = "chat-msg-author";
    span.textContent = author;
    item.appendChild(span);
    item.appendChild(document.createTextNode(text));
  }
  chatMessagesEl.appendChild(item);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function addRemotePlayer(p) {
  if (remotePlayers.has(p.id)) return;
  const charObj = createCharacter(p.charType || "rabbit");
  charObj.root.position.set(p.x || 0, p.y || 0, p.z || 5);
  charObj.root.rotation.y = p.ry || 0;
  scene.add(charObj.root);

  const labelEl = document.createElement("div");
  labelEl.className = "world-label";
  labelEl.textContent = p.name || "친구";
  labelsLayer.appendChild(labelEl);

  const bubbleEl = document.createElement("div");
  bubbleEl.className = "speech-bubble hidden";
  labelsLayer.appendChild(bubbleEl);

  remotePlayers.set(p.id, {
    charObj,
    labelEl,
    bubbleEl,
    bubbleUntil: 0,
    targetPos: new THREE.Vector3(p.x || 0, p.y || 0, p.z || 5),
    targetRy: p.ry || 0,
    pose: p.pose || "idle",
    name: p.name || "친구",
  });
}

function removeRemotePlayer(id) {
  const rp = remotePlayers.get(id);
  if (!rp) return;
  scene.remove(rp.charObj.root);
  rp.labelEl.remove();
  rp.bubbleEl.remove();
  remotePlayers.delete(id);
}

function spawnSharedSnowman(smData, isLocal = false) {
  if (snowmen.some((s) => s.id === smData.id)) return;
  const smMesh = createSnowmanMesh(smData.deco);
  const pos = new THREE.Vector3(smData.x, smData.y, smData.z);
  smMesh.group.position.copy(pos);
  smMesh.group.rotation.y = smData.ry || 0;
  scene.add(smMesh.group);

  const labelEl = document.createElement("div");
  labelEl.className = "world-label";
  labelEl.textContent = `${smData.ownerName}의 눈사람`;
  labelsLayer.appendChild(labelEl);

  const obj = {
    id: smData.id,
    meshObj: smMesh,
    pos,
    ownerName: smData.ownerName,
    deco: smData.deco,
    labelEl,
  };
  snowmen.push(obj);
  snowmanCountLabel.textContent = `눈사람 ${snowmen.length}`;
  if (isLocal) activeSnowman = obj;
}

function connectMultiplayer() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  try {
    ws = new WebSocket(`${proto}//${location.host}/ws`);
  } catch {
    return;
  }

  ws.addEventListener("open", () => {
    ws.send(
      JSON.stringify({
        type: "join",
        name: playerNickname,
        charType: selectedCharType,
        x: player.root.position.x,
        y: player.root.position.y,
        z: player.root.position.z,
        ry: player.root.rotation.y,
      })
    );
  });

  ws.addEventListener("message", (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    if (msg.type === "welcome") {
      myPlayerId = msg.id;
      playerCountLabel.textContent = `${msg.count}명`;
      (msg.players || []).forEach(addRemotePlayer);
      (msg.snowmen || []).forEach((s) => spawnSharedSnowman(s, false));
      appendChatMessage("", `겨울 마을에 입장했어요! (현재 ${msg.count}명)`, true);
    } else if (msg.type === "player_join") {
      playerCountLabel.textContent = `${msg.count}명`;
      addRemotePlayer(msg.player);
      appendChatMessage("", `${msg.player.name}님이 마을에 들어왔어요!`, true);
    } else if (msg.type === "player_leave") {
      playerCountLabel.textContent = `${msg.count}명`;
      removeRemotePlayer(msg.id);
      appendChatMessage("", `${msg.name}님이 마을을 떠났어요.`, true);
    } else if (msg.type === "player_state") {
      const rp = remotePlayers.get(msg.player.id);
      if (rp) {
        rp.targetPos.set(msg.player.x, msg.player.y, msg.player.z);
        rp.targetRy = msg.player.ry;
        rp.pose = msg.player.pose;
        rp.charObj.setRoasting(msg.player.roasting, msg.player.toasted);
      }
    } else if (msg.type === "chat") {
      winterAudio.playTap();
      appendChatMessage(msg.name, msg.text, false);
      showSpeechBubble(msg.id, msg.text);
    } else if (msg.type === "snowman_add") {
      spawnSharedSnowman(msg.snowman, false);
    } else if (msg.type === "snowman_update") {
      const sm = snowmen.find((s) => s.id === msg.id);
      if (sm) {
        sm.deco = msg.deco;
        sm.meshObj.updateColors(sm.deco);
      }
    }
  });
}

function sendChat(text) {
  const clean = text.trim();
  if (!clean) return;
  winterAudio.playTap();
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: "chat", text: clean }));
  } else {
    appendChatMessage(playerNickname, clean, false);
    showSpeechBubble("local", clean);
  }
}

let currentShareUrl = location.origin;

function isLocalHostOrLan(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

async function openShareModal() {
  winterAudio.playTap();
  shareModal.classList.remove("hidden");
  shareUrlText.textContent = "주소 확인 중...";

  const host = location.hostname;
  if (!isLocalHostOrLan(host)) {
    // Opened via external/tunnel URL -> share this exact external URL
    currentShareUrl = location.origin;
  } else if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
    try {
      const res = await fetch("/api/share-info");
      if (res.ok) {
        const data = await res.json();
        currentShareUrl = data.primaryUrl || location.origin;
      } else {
        currentShareUrl = location.origin;
      }
    } catch {
      currentShareUrl = location.origin;
    }
  } else {
    currentShareUrl = location.origin;
  }

  shareUrlText.textContent = currentShareUrl;
  QRCode.toCanvas(shareQrCanvas, currentShareUrl, {
    width: 240,
    margin: 2,
    color: { dark: "#223044", light: "#ffffff" },
  }).catch(() => {});
}

shareQrBtn.addEventListener("click", openShareModal);
startShareBtn.addEventListener("click", openShareModal);

shareCopyBtn.addEventListener("click", async () => {
  winterAudio.playTap();
  try {
    await navigator.clipboard.writeText(currentShareUrl);
    shareCopyBtn.textContent = "✅ 복사 완료!";
    setTimeout(() => {
      shareCopyBtn.textContent = "📋 주소 복사";
    }, 1800);
  } catch {
    showToast(currentShareUrl, 3000);
  }
});

shareCloseBtn.addEventListener("click", () => {
  winterAudio.playTap();
  shareModal.classList.add("hidden");
});

chatToggleBtn.addEventListener("click", () => {
  winterAudio.playTap();
  const isOpen = chatToggleBtn.classList.toggle("active");
  chatPanel.classList.toggle("hidden", !isOpen);
});

chatQuickRow.addEventListener("click", (e) => {
  const chip = e.target.closest(".chat-quick-chip");
  if (!chip) return;
  sendChat(chip.textContent);
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  sendChat(chatInput.value);
  chatInput.value = "";
});

function projectLabel(el, worldPos) {
  const v = worldPos.clone().project(camera);
  if (v.z > 1 || v.z < -1) {
    el.style.display = "none";
    return;
  }
  const x = (v.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
  el.style.display = "block";
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
}

// --- Start Screen Interactions ---
charGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".char-option");
  if (!btn) return;
  winterAudio.playTap();
  document.querySelectorAll(".char-option").forEach((el) => el.classList.remove("selected"));
  btn.classList.add("selected");
  selectedCharType = btn.dataset.char;

  const oldPos = player.root.position.clone();
  const oldRot = player.root.rotation.y;
  scene.remove(player.root);
  player = createCharacter(selectedCharType);
  player.root.position.copy(oldPos);
  player.root.rotation.y = oldRot;
  scene.add(player.root);
});

quickNames.addEventListener("click", (e) => {
  const chip = e.target.closest(".quick-name-chip");
  if (!chip) return;
  winterAudio.playTap();
  nicknameInput.value = chip.textContent;
});

enterBtn.addEventListener("click", () => {
  winterAudio.init();
  winterAudio.startBGM();
  winterAudio.playChime();

  playerNickname = nicknameInput.value.trim() || "눈송이";
  playerBadgeEmoji.textContent = CHARACTER_META[selectedCharType].emoji;
  playerBadgeName.textContent = playerNickname;
  playerLabelEl.textContent = playerNickname;
  playerLabelEl.classList.remove("hidden");

  startOverlay.classList.add("hidden");
  hud.classList.remove("hidden");
  gameState = "EXPLORE";
  camYaw = 0;
  camPitch = 0.42;
  camDist = 11.5;
  connectMultiplayer();
  showToast("바닥을 터치하거나 조이스틱으로 이동해 보세요!", 3200);
});

// --- Top Right Controls ---
joystickToggleBtn.addEventListener("click", () => {
  winterAudio.playTap();
  const active = joystickToggleBtn.classList.toggle("active");
  joystickZone.classList.toggle("hidden", !active);
});

soundToggleBtn.addEventListener("click", () => {
  winterAudio.init();
  const next = !winterAudio.enabled;
  winterAudio.setEnabled(next);
  soundToggleBtn.textContent = next ? "🔊" : "🔇";
});

fullscreenBtn.addEventListener("click", () => {
  winterAudio.playTap();
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
});

camZoomInBtn.addEventListener("click", () => {
  winterAudio.playTap();
  camDist = Math.max(6, camDist - 2);
});
camZoomOutBtn.addEventListener("click", () => {
  winterAudio.playTap();
  camDist = Math.min(22, camDist + 2);
});
camResetBtn.addEventListener("click", () => {
  winterAudio.playTap();
  camYaw = 0;
  camPitch = 0.42;
  camDist = 11.5;
});

// --- Virtual Touch Joystick ---
let joyPointerId = null;
const joyMaxR = 38;

joystickBase.addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  joyPointerId = e.pointerId;
  joystickBase.setPointerCapture(e.pointerId);
  updateJoystick(e.clientX, e.clientY);
});

joystickBase.addEventListener("pointermove", (e) => {
  if (e.pointerId !== joyPointerId) return;
  updateJoystick(e.clientX, e.clientY);
});

function resetJoystick() {
  joyPointerId = null;
  joyVec.set(0, 0);
  joystickKnob.style.transform = "translate(0px, 0px)";
}
joystickBase.addEventListener("pointerup", resetJoystick);
joystickBase.addEventListener("pointercancel", resetJoystick);

function updateJoystick(clientX, clientY) {
  const rect = joystickBase.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = clientX - cx;
  let dy = clientY - cy;
  const len = Math.hypot(dx, dy);
  if (len > joyMaxR) {
    dx = (dx / len) * joyMaxR;
    dy = (dy / len) * joyMaxR;
  }
  joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  joyVec.set(dx / joyMaxR, dy / joyMaxR);
  if (len > 4) moveTarget = null;
}

// --- Canvas Pointer / Multi-Touch ---
const activePointers = new Map();
let dragStart = null;
let isDragging = false;
let lastPinchDist = null;
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

canvas.addEventListener("pointerdown", (e) => {
  if (gameState === "SELECT") return;
  if (e.button === 2) return;
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (activePointers.size === 1) {
    dragStart = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY };
    isDragging = false;
    lastPinchDist = null;
  } else if (activePointers.size === 2) {
    const pts = [...activePointers.values()];
    lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    isDragging = true;
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (!activePointers.has(e.pointerId)) return;
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (gameState === "SLEDDING_DOWN" && activePointers.size === 1 && dragStart) {
    const dx = e.clientX - dragStart.lastX;
    sledSteerInput = THREE.MathUtils.clamp(dx * 0.08, -1, 1);
    dragStart.lastX = e.clientX;
    return;
  }

  if (activePointers.size === 2 && lastPinchDist !== null) {
    const pts = [...activePointers.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const delta = dist - lastPinchDist;
    camDist = THREE.MathUtils.clamp(camDist - delta * 0.03, 6, 22);
    lastPinchDist = dist;
    return;
  }

  if (activePointers.size === 1 && dragStart) {
    const totalMove = Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y);
    if (totalMove > 10) isDragging = true;
    if (isDragging && gameState !== "PHOTO") {
      const dx = e.clientX - dragStart.lastX;
      const dy = e.clientY - dragStart.lastY;
      camYaw -= dx * 0.0065;
      camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.0045, 0.16, 1.05);
      dragStart.lastX = e.clientX;
      dragStart.lastY = e.clientY;
    }
  }
});

function handlePointerEnd(e) {
  const wasSingleTap =
    activePointers.size === 1 &&
    !isDragging &&
    (gameState === "EXPLORE" ||
      gameState === "ROLLING_BODY" ||
      gameState === "ROLLING_HEAD" ||
      gameState === "INDOOR");

  activePointers.delete(e.pointerId);
  if (activePointers.size < 2) lastPinchDist = null;
  if (activePointers.size === 0) {
    dragStart = null;
    if (gameState === "SLEDDING_DOWN") sledSteerInput = 0;
  }

  if (wasSingleTap) {
    ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const targetMesh = isIndoors ? world.indoorFloor : world.ground;
    const hits = raycaster.intersectObject(targetMesh);
    if (hits.length > 0) {
      const p = hits[0].point;
      const clampedX = isIndoors
        ? THREE.MathUtils.clamp(p.x, -5.8, 5.8)
        : THREE.MathUtils.clamp(p.x, -36, 44);
      const clampedZ = isIndoors
        ? THREE.MathUtils.clamp(p.z, 115.2, 124.8)
        : THREE.MathUtils.clamp(p.z, -32, 32);
      moveTarget = new THREE.Vector3(clampedX, getTerrainHeight(clampedX, clampedZ), clampedZ);
      world.showTapRing(clampedX, clampedZ);
      winterAudio.playTap();
    }
  }
}

canvas.addEventListener("pointerup", handlePointerEnd);
canvas.addEventListener("pointercancel", handlePointerEnd);
canvas.addEventListener(
  "wheel",
  (e) => {
    camDist = THREE.MathUtils.clamp(camDist + e.deltaY * 0.01, 6, 22);
  },
  { passive: true }
);

window.addEventListener("keydown", (e) => keysDown.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e) => keysDown.delete(e.key.toLowerCase()));

// --- Sledding Touch Buttons ---
function bindHoldBtn(btn, val) {
  btn.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    sledSteerInput = val;
  });
  const stop = () => {
    if (sledSteerInput === val) sledSteerInput = 0;
  };
  btn.addEventListener("pointerup", stop);
  btn.addEventListener("pointercancel", stop);
  btn.addEventListener("pointerleave", stop);
}
bindHoldBtn(sledLeftBtn, -1);
bindHoldBtn(sledRightBtn, 1);

// --- Campfire & Marshmallow Actions ---
function enterSitting(log) {
  activeLog = log;
  moveTarget = null;
  gameState = "SITTING";
  player.root.position.copy(log.seatPos);
  player.root.lookAt(log.faceTarget.x, log.seatPos.y, log.faceTarget.z);
  player.setRoasting(false, false);

  actionExplore.classList.add("hidden");
  actionSnowmanNear.classList.add("hidden");
  actionSitting.classList.remove("hidden");
  roastBtn.classList.remove("hidden");
  eatBtn.classList.add("hidden");
  showToast("따뜻해요~ 🔥", 2000);
}

standUpBtn.addEventListener("click", () => {
  winterAudio.playTap();
  player.setRoasting(false, false);
  if (activeLog) {
    const out = activeLog.seatPos.clone().add(
      activeLog.seatPos.clone().sub(world.fireCenter).setY(0).normalize().multiplyScalar(1.1)
    );
    player.root.position.set(out.x, getTerrainHeight(out.x, out.z), out.z);
  }
  activeLog = null;
  gameState = "EXPLORE";
  actionSitting.classList.add("hidden");
  actionExplore.classList.remove("hidden");
});

roastBtn.addEventListener("click", () => {
  winterAudio.playTap();
  gameState = "ROASTING";
  roastTimer = 0;
  roastDone = false;
  player.setRoasting(true, false);
  roastBtn.classList.add("hidden");
  showToast("마시멜로를 노릇노릇 굽는 중...", 2200);
});

eatBtn.addEventListener("click", () => {
  winterAudio.playChime();
  player.setRoasting(false, false);
  gameState = "SITTING";
  eatBtn.classList.add("hidden");
  roastBtn.classList.remove("hidden");
  showToast("냠냠! 달콤하고 따뜻해요 😋", 2200);
});

// --- Snowman Building & Decorating ---
function spawnRollingBall(radius) {
  if (rollingBall) scene.remove(rollingBall);
  rollingBall = new THREE.Mesh(
    new THREE.SphereGeometry(1, 20, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 })
  );
  rollingBall.castShadow = true;
  rollingBall.receiveShadow = true;
  rollingBall.scale.setScalar(radius);
  scene.add(rollingBall);
}

makeSnowmanBtn.addEventListener("click", () => {
  winterAudio.playTap();
  moveTarget = null;
  gameState = "ROLLING_BODY";
  rollingAmount = 0.08;
  spawnRollingBall(0.28);
  actionExplore.classList.add("hidden");
  actionSnowmanNear.classList.add("hidden");
  actionRolling.classList.remove("hidden");
  rollingTip.textContent = "바닥을 터치해 이리저리 굴려요";
  rollingProgress.style.width = "8%";
  placeSnowballBtn.textContent = "여기에 두기";
  placeSnowballBtn.disabled = true;
});

cancelRollingBtn.addEventListener("click", () => {
  winterAudio.playTap();
  if (rollingBall) {
    scene.remove(rollingBall);
    rollingBall = null;
  }
  if (placedBodyMesh) {
    scene.remove(placedBodyMesh);
    placedBodyMesh = null;
    placedBodyPos = null;
  }
  gameState = "EXPLORE";
  actionRolling.classList.add("hidden");
  actionExplore.classList.remove("hidden");
});

placeSnowballBtn.addEventListener("click", () => {
  if (gameState === "ROLLING_HEAD") {
    if (rollingAmount >= 0.65) {
      finishHeadAndOpenDecorate();
    }
    return;
  }
  if (gameState !== "ROLLING_BODY" || rollingAmount < 0.75) return;
  winterAudio.playChime();

  placedBodyPos = rollingBall.position.clone();
  placedBodyPos.y = getTerrainHeight(placedBodyPos.x, placedBodyPos.z) + 0.85;
  placedBodyMesh = rollingBall;
  placedBodyMesh.position.copy(placedBodyPos);
  placedBodyMesh.scale.setScalar(0.95);
  rollingBall = null;

  gameState = "ROLLING_HEAD";
  rollingAmount = 0.1;
  spawnRollingBall(0.26);
  rollingTip.textContent = "몸통 곁으로 머리를 굴려 와요";
  rollingProgress.style.width = "10%";
  placeSnowballBtn.textContent = "머리 올리기";
  placeSnowballBtn.disabled = true;
});

function finishHeadAndOpenDecorate() {
  winterAudio.playChime();
  if (rollingBall) {
    scene.remove(rollingBall);
    rollingBall = null;
  }
  if (placedBodyMesh) {
    scene.remove(placedBodyMesh);
    placedBodyMesh = null;
  }

  const deco = { scarf: "#5d8bf4", buttons: "#2b2d42", hat: "#f48fb1", hatStyle: "beanie" };
  const pos = new THREE.Vector3(placedBodyPos.x, getTerrainHeight(placedBodyPos.x, placedBodyPos.z), placedBodyPos.z);
  const dx = player.root.position.x - pos.x;
  const dz = player.root.position.z - pos.z;
  const ry = Math.atan2(dx, dz);
  const smData = {
    id: `sm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    x: pos.x,
    y: pos.y,
    z: pos.z,
    ry,
    ownerName: playerNickname,
    deco,
  };
  spawnSharedSnowman(smData, true);
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: "snowman_add", snowman: smData }));
  }
  placedBodyPos = null;

  const frontDir = new THREE.Vector3(0, 0, 1).applyQuaternion(activeSnowman.meshObj.group.quaternion);
  const standPos = pos.clone().addScaledVector(frontDir, 3.0);
  player.root.position.set(standPos.x, getTerrainHeight(standPos.x, standPos.z), standPos.z);
  player.root.lookAt(pos.x, player.root.position.y, pos.z);
  moveTarget = null;

  openDecoratePanel();
}

function syncDecorateUI() {
  hatStylesRow.classList.toggle("hidden", activeDecoPart !== "hat");
  if (!activeSnowman) return;
  const currentColor = activeSnowman.deco[activeDecoPart];
  colorSwatches.forEach((s) => {
    s.classList.toggle("selected", s.dataset.color === currentColor);
  });
  hatStyleBtns.forEach((b) => {
    b.classList.toggle("active", b.dataset.hatStyle === (activeSnowman.deco.hatStyle || "beanie"));
  });
}

function openDecoratePanel() {
  gameState = "DECORATING";
  actionRolling.classList.add("hidden");
  actionExplore.classList.add("hidden");
  actionSnowmanNear.classList.add("hidden");
  actionDecorate.classList.remove("hidden");
  syncDecorateUI();
}

decoTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    winterAudio.playTap();
    decoTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    activeDecoPart = tab.dataset.part;
    syncDecorateUI();
  });
});

hatStyleBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    winterAudio.playTap();
    if (activeSnowman) {
      activeSnowman.deco.hatStyle = btn.dataset.hatStyle;
      activeSnowman.meshObj.updateColors(activeSnowman.deco);
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "snowman_update", id: activeSnowman.id, deco: activeSnowman.deco }));
      }
    }
    syncDecorateUI();
  });
});

colorSwatches.forEach((sw) => {
  sw.addEventListener("click", () => {
    winterAudio.playTap();
    if (activeSnowman) {
      activeSnowman.deco[activeDecoPart] = sw.dataset.color;
      activeSnowman.meshObj.updateColors(activeSnowman.deco);
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "snowman_update", id: activeSnowman.id, deco: activeSnowman.deco }));
      }
    }
    syncDecorateUI();
  });
});

finishDecoBtn.addEventListener("click", () => {
  winterAudio.playChime();
  actionDecorate.classList.add("hidden");
  gameState = "EXPLORE";
  showToast("⛄ 눈사람 완성!", 2400);
});

redecorateBtn.addEventListener("click", () => {
  if (!activeSnowman) return;
  winterAudio.playTap();
  openDecoratePanel();
});

// --- Photo Mode ---
photoBtn.addEventListener("click", () => {
  if (!activeSnowman) return;
  gameState = "PHOTO";
  moveTarget = null;
  actionSnowmanNear.classList.add("hidden");

  const smPos = activeSnowman.pos.clone();
  const toTree = world.treeCenter
    ? new THREE.Vector3(world.treeCenter.x - smPos.x, 0, world.treeCenter.z - smPos.z).normalize()
    : new THREE.Vector3(0, 0, -1);
  const camDir = toTree.clone().negate();
  const rightDir = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), camDir).normalize();

  const posePos = smPos.clone().addScaledVector(rightDir, 1.55).addScaledVector(camDir, 0.35);
  player.root.position.set(posePos.x, getTerrainHeight(posePos.x, posePos.z), posePos.z);
  player.root.lookAt(posePos.x + camDir.x * 5, player.root.position.y, posePos.z + camDir.z * 5);
  activeSnowman.meshObj.group.lookAt(smPos.x + camDir.x * 5, smPos.y, smPos.z + camDir.z * 5);
  player.updatePose("wave", 0.5);

  const photoCamPos = smPos.clone().addScaledVector(camDir, 6.2).addScaledVector(rightDir, 0.5);
  photoCamPos.y += 1.65;
  camera.position.copy(photoCamPos);
  camera.lookAt(smPos.x + rightDir.x * 0.5, smPos.y + 1.35, smPos.z + rightDir.z * 0.5);

  labelsLayer.classList.add("hidden");
  renderer.render(scene, camera);

  const outCanvas = document.createElement("canvas");
  outCanvas.width = renderer.domElement.width;
  outCanvas.height = renderer.domElement.height;
  const ctx = outCanvas.getContext("2d");
  ctx.drawImage(renderer.domElement, 0, 0);

  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const watermark = `❄️ 눈 내리는 겨울 마을 · ${dateStr}`;
  const fontSize = Math.max(20, Math.round(outCanvas.width * 0.022));
  ctx.font = `700 ${fontSize}px "Pretendard", "Malgun Gothic", sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "rgba(20, 35, 60, 0.55)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(watermark, outCanvas.width - fontSize * 1.1, outCanvas.height - fontSize * 0.9);

  labelsLayer.classList.remove("hidden");

  winterAudio.playShutter();
  photoFlash.classList.remove("hidden");
  setTimeout(() => photoFlash.classList.add("hidden"), 480);

  photoPreviewImg.src = outCanvas.toDataURL("image/png");
  photoModal.classList.remove("hidden");
});

photoDownloadBtn.addEventListener("click", () => {
  winterAudio.playTap();
  const a = document.createElement("a");
  a.href = photoPreviewImg.src;
  a.download = `winter-village-${Date.now()}.png`;
  a.click();
});

photoCloseBtn.addEventListener("click", () => {
  winterAudio.playTap();
  photoModal.classList.add("hidden");
  gameState = "EXPLORE";
});

// --- Ice Fishing ---
const FISH_CATCHES = [
  { name: "🐟 은빛 빙어", color: 0xaad8ff, shape: "fish" },
  { name: "🐠 황금 잉어", color: 0xffb703, shape: "fish" },
  { name: "🐡 복어", color: 0xf4d35e, shape: "round" },
  { name: "🦈 아기 상어", color: 0x5c8ab8, shape: "fish" },
  { name: "🦀 겨울 꽃게", color: 0xe63946, shape: "wide" },
  { name: "🐙 꼬마 문어", color: 0xf27d8a, shape: "round" },
  { name: "🦐 왕새우", color: 0xf77f00, shape: "fish" },
  { name: "🦑 대왕 오징어", color: 0xffe5d9, shape: "fish" },
];

function resetFishingCast() {
  fishBiting = false;
  fishCatchTimer = 0;
  fishBiteTimer = 1.8 + Math.random() * 2.2;
  player.setCaughtCreature(null);
  pullFishBtn.disabled = true;
  pullFishLabel.textContent = "기다리는 중...";
}

function startFishing(spot) {
  winterAudio.playTap();
  activeFishSpot = spot;
  moveTarget = null;
  gameState = "FISHING";
  player.root.position.copy(spot.seatPos);
  player.root.lookAt(spot.holePos.x, spot.seatPos.y, spot.holePos.z);
  player.setFishing(true);

  actionExplore.classList.add("hidden");
  actionSnowmanNear.classList.add("hidden");
  actionFishing.classList.remove("hidden");
  resetFishingCast();
  showToast("얼음 구멍에 낚싯대를 드리웠어요! 🎣", 2200);
}

pullFishBtn.addEventListener("click", () => {
  if (gameState !== "FISHING" || !fishBiting) return;
  winterAudio.playChime();
  const reward = FISH_CATCHES[Math.floor(Math.random() * FISH_CATCHES.length)];
  fishCount += 1;
  fishCountLabel.textContent = `물고기 ${fishCount}`;
  fishBiting = false;
  fishCatchTimer = 2.1;
  player.setCaughtCreature(reward.color, reward.shape);
  pullFishBtn.disabled = true;
  pullFishLabel.textContent = "와! 잡았다! 🎉";
  showToast(`대박! ${reward.name}를 낚았어요!`, 2400);
  showSpeechBubble("local", `${reward.name} 낚았다!`);
});

stopFishingBtn.addEventListener("click", () => {
  winterAudio.playTap();
  player.setFishing(false);
  if (activeFishSpot) {
    player.root.position.set(activeFishSpot.seatPos.x, 0, activeFishSpot.seatPos.z + 1.4);
  }
  activeFishSpot = null;
  gameState = "EXPLORE";
  actionFishing.classList.add("hidden");
  actionExplore.classList.remove("hidden");
});

// --- Cozy Cabin Interior ---
function enterCabin(doorPos = world.cabinDoorPos) {
  winterAudio.playChime();
  activeCabinDoor = doorPos;
  moveTarget = null;
  isIndoors = true;
  indoorPose = "idle";
  gameState = "INDOOR";
  player.root.position.copy(world.indoorSpawnPos);
  player.root.rotation.y = Math.PI;
  scene.background = new THREE.Color(0x4a3122);
  scene.fog.density = 0.002;
  camYaw = 0;
  camPitch = 0.36;
  camDist = 9.5;

  actionExplore.classList.add("hidden");
  actionSnowmanNear.classList.add("hidden");
  actionIndoor.classList.remove("hidden");
  sofaSitBtn.innerHTML = "<span>🛋️</span><span>소파에 앉기</span>";
  bedLieBtn.innerHTML = "<span>🛏️</span><span>침대에 눕기</span>";
  showToast("아늑한 오두막에 들어왔어요~ 🏠", 2400);
}

exitCabinBtn.addEventListener("click", () => {
  winterAudio.playTap();
  player.setCocoa(false);
  isIndoors = false;
  indoorPose = "idle";
  gameState = "EXPLORE";
  player.root.position.set(activeCabinDoor.x, activeCabinDoor.y, activeCabinDoor.z + 1.1);
  player.root.rotation.y = 0;
  scene.background = new THREE.Color(0x9fbce0);
  scene.fog.density = 0.0085;
  camDist = 11.5;

  actionIndoor.classList.add("hidden");
  actionExplore.classList.remove("hidden");
  showToast("눈 내리는 마을로 나왔어요! ❄️", 2000);
});

sofaSitBtn.addEventListener("click", () => {
  winterAudio.playTap();
  if (indoorPose !== "sit") {
    indoorPose = "sit";
    moveTarget = null;
    player.setCocoa(false);
    player.root.position.copy(world.indoorSofaPos);
    player.root.rotation.y = 0;
    sofaSitBtn.innerHTML = "<span>일어나기</span>";
    bedLieBtn.innerHTML = "<span>🛏️</span><span>침대에 눕기</span>";
    showToast("폭신한 소파에서 쉬는 중~ 🛋️", 2000);
  } else {
    indoorPose = "idle";
    player.setCocoa(false);
    player.root.position.set(-2.2, 0, 121.3);
    sofaSitBtn.innerHTML = "<span>🛋️</span><span>소파에 앉기</span>";
  }
});

bedLieBtn.addEventListener("click", () => {
  winterAudio.playTap();
  if (indoorPose !== "sleep") {
    indoorPose = "sleep";
    moveTarget = null;
    player.setCocoa(false);
    player.root.position.copy(world.indoorBedPos);
    player.root.rotation.y = 0;
    bedLieBtn.innerHTML = "<span>일어나기</span>";
    sofaSitBtn.innerHTML = "<span>🛋️</span><span>소파에 앉기</span>";
    showToast("포근한 침대에서 쿨쿨 쉬는 중~ 💤", 2200);
    showSpeechBubble("local", "쿨쿨~ 💤");
  } else {
    indoorPose = "idle";
    player.root.position.set(2.3, 0, 120.5);
    bedLieBtn.innerHTML = "<span>🛏️</span><span>침대에 눕기</span>";
  }
});

cocoaBtn.addEventListener("click", () => {
  winterAudio.playChime();
  indoorPose = "cocoa";
  moveTarget = null;
  player.root.position.copy(world.indoorSofaPos);
  player.root.rotation.y = 0;
  player.setCocoa(true);
  sofaSitBtn.innerHTML = "<span>일어나기</span>";
  bedLieBtn.innerHTML = "<span>🛏️</span><span>침대에 눕기</span>";
  showToast("달콤하고 따뜻한 핫초코 최고예요~ ☕", 2500);
  showSpeechBubble("local", "핫초코 따뜻해~ ☕");
});

// --- Sledding Hill ---
function startSledding() {
  winterAudio.playTap();
  moveTarget = null;
  gameState = "SLEDDING_UP";
  actionExplore.classList.add("hidden");
  actionSnowmanNear.classList.add("hidden");
  showToast("썰매를 끌고 언덕 위로 올라가요!", 2200);
}

let currentContextualAction = null;
contextualBtn.addEventListener("click", () => {
  if (currentContextualAction) currentContextualAction();
});

// --- Main Loop ---
const clock = new THREE.Clock();
let elapsed = 0;

function resolveCollisions(pos) {
  for (const c of world.colliders) {
    const dx = pos.x - c.x;
    const dz = pos.z - c.z;
    const dist = Math.hypot(dx, dz);
    const minDist = c.r + 0.45;
    if (dist < minDist && dist > 0.0001) {
      pos.x = c.x + (dx / dist) * minDist;
      pos.z = c.z + (dz / dist) * minDist;
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  world.update(dt, elapsed);

  if (gameState === "SELECT") {
    const angle = elapsed * 0.22;
    player.root.position.set(0, 0, 5);
    player.root.rotation.y = 0;
    player.updatePose("idle", elapsed);
    camera.position.set(Math.sin(angle) * 3.8, 2.2, 5 + Math.cos(angle) * 4.5);
    camera.lookAt(0, 1.0, 5);
    renderer.render(scene, camera);
    return;
  }

  let isMoving = false;
  if (
    gameState === "EXPLORE" ||
    gameState === "ROLLING_BODY" ||
    gameState === "ROLLING_HEAD" ||
    (gameState === "INDOOR" && indoorPose === "idle")
  ) {
    const moveDir = new THREE.Vector3();

    let kx = 0;
    let kz = 0;
    if (keysDown.has("w") || keysDown.has("arrowup")) kz -= 1;
    if (keysDown.has("s") || keysDown.has("arrowdown")) kz += 1;
    if (keysDown.has("a") || keysDown.has("arrowleft")) kx -= 1;
    if (keysDown.has("d") || keysDown.has("arrowright")) kx += 1;

    const inputX = kx !== 0 ? kx : joyVec.x;
    const inputY = kz !== 0 ? kz : joyVec.y;

    if (Math.hypot(inputX, inputY) > 0.12) {
      moveTarget = null;
      const forward = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
      const right = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));
      moveDir.addScaledVector(right, inputX).addScaledVector(forward, -inputY).normalize();
    } else if (moveTarget) {
      const toTarget = new THREE.Vector3(
        moveTarget.x - player.root.position.x,
        0,
        moveTarget.z - player.root.position.z
      );
      if (toTarget.length() > 0.22) {
        moveDir.copy(toTarget.normalize());
      } else {
        moveTarget = null;
      }
    }

    if (moveDir.lengthSq() > 0.001) {
      isMoving = true;
      const speed = gameState === "EXPLORE" || gameState === "INDOOR" ? 5.6 : 4.2;
      if (isIndoors) {
        player.root.position.x = THREE.MathUtils.clamp(player.root.position.x + moveDir.x * speed * dt, -5.8, 5.8);
        player.root.position.z = THREE.MathUtils.clamp(player.root.position.z + moveDir.z * speed * dt, 115.2, 124.8);
        player.root.position.y = 0;
      } else {
        player.root.position.x = THREE.MathUtils.clamp(player.root.position.x + moveDir.x * speed * dt, -36, 44);
        player.root.position.z = THREE.MathUtils.clamp(player.root.position.z + moveDir.z * speed * dt, -32, 32);
        resolveCollisions(player.root.position);
        player.root.position.y = getTerrainHeight(player.root.position.x, player.root.position.z);
      }

      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      let diff = targetAngle - player.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      player.root.rotation.y += diff * Math.min(1, dt * 22);

      winterAudio.playFootstep(elapsed);
      if (!isIndoors) {
        stepMarkAccum += speed * dt;
        if (stepMarkAccum > 0.65) {
          stepMarkAccum = 0;
          world.addSnowMark(player.root.position.x, player.root.position.z, 0.85, 0xc8daf0);
        }
      }
    }

    currentLocalPose = isMoving ? "walk" : "idle";
    player.updatePose(currentLocalPose, elapsed);

    if ((gameState === "ROLLING_BODY" || gameState === "ROLLING_HEAD") && rollingBall) {
      const forward = new THREE.Vector3(Math.sin(player.root.rotation.y), 0, Math.cos(player.root.rotation.y));
      const ballRadius = gameState === "ROLLING_BODY" ? 0.28 + rollingAmount * 0.67 : 0.25 + rollingAmount * 0.41;
      const bx = player.root.position.x + forward.x * (0.65 + ballRadius);
      const bz = player.root.position.z + forward.z * (0.65 + ballRadius);
      rollingBall.position.set(bx, getTerrainHeight(bx, bz) + ballRadius * 0.92, bz);
      rollingBall.scale.setScalar(ballRadius);

      if (isMoving) {
        rollingAmount = Math.min(1, rollingAmount + dt * 0.16);
        const pct = Math.round(rollingAmount * 100);
        rollingProgress.style.width = `${pct}%`;
      }

      if (gameState === "ROLLING_BODY") {
        if (rollingAmount >= 0.75) {
          placeSnowballBtn.disabled = false;
          rollingTip.textContent = "몸통 완성! '여기에 두기'를 눌러요";
        } else {
          placeSnowballBtn.disabled = true;
          rollingTip.textContent = "바닥을 터치해 이리저리 굴려요";
        }
      } else if (gameState === "ROLLING_HEAD" && placedBodyPos) {
        const distToBody = Math.hypot(bx - placedBodyPos.x, bz - placedBodyPos.z);
        if (rollingAmount >= 0.65 && distToBody < 3.6) {
          placeSnowballBtn.disabled = false;
          rollingTip.textContent = "좋아요! '머리 올리기'를 눌러요";
        } else if (rollingAmount >= 0.65) {
          placeSnowballBtn.disabled = true;
          rollingTip.textContent = "이제 몸통 곁으로 굴려 가요!";
        } else {
          placeSnowballBtn.disabled = true;
        }
      }
    }
  } else if (gameState === "SITTING") {
    currentLocalPose = "sit";
    player.updatePose("sit", elapsed);
  } else if (gameState === "ROASTING") {
    currentLocalPose = "roast";
    player.updatePose("roast", elapsed);
    if (!roastDone) {
      roastTimer += dt;
      if (roastTimer >= 2.4) {
        roastDone = true;
        player.setRoasting(true, true);
        eatBtn.classList.remove("hidden");
        winterAudio.playChime();
        showToast("노릇노릇 구워졌어요! 먹기를 눌러보세요", 2200);
      }
    }
  } else if (gameState === "SLEDDING_UP") {
    const hillTop = new THREE.Vector3(36, getTerrainHeight(36, 2), 2);
    const toTop = new THREE.Vector3(hillTop.x - player.root.position.x, 0, hillTop.z - player.root.position.z);
    if (toTop.length() > 0.5) {
      toTop.normalize();
      player.root.position.x += toTop.x * 5.2 * dt;
      player.root.position.z += toTop.z * 5.2 * dt;
      player.root.position.y = getTerrainHeight(player.root.position.x, player.root.position.z);
      player.root.rotation.y = Math.atan2(toTop.x, toTop.z);
      currentLocalPose = "walk";
      player.updatePose("walk", elapsed);

      world.sled.position.set(
        player.root.position.x - toTop.x * 1.15,
        player.root.position.y + 0.05,
        player.root.position.z - toTop.z * 1.15
      );
      world.sled.rotation.y = player.root.rotation.y;
      winterAudio.playFootstep(elapsed);
    } else {
      gameState = "SLEDDING_DOWN";
      sledSpeed = 2.5;
      sledLateralVel = 0;
      sledSteerInput = 0;
      sledSteerUI.classList.remove("hidden");
      winterAudio.playSledWhoosh();
      showToast("좌우로 움직여 방향을 바꿔요!", 2600);
    }
  } else if (gameState === "SLEDDING_DOWN") {
    let steer = sledSteerInput;
    if (keysDown.has("a") || keysDown.has("arrowleft")) steer = -1;
    if (keysDown.has("d") || keysDown.has("arrowright")) steer = 1;

    sledSpeed = Math.min(13.5, sledSpeed + dt * 5.5);
    sledLateralVel = THREE.MathUtils.lerp(sledLateralVel, steer * 5.5, dt * 6);

    world.sled.position.x -= sledSpeed * dt;
    world.sled.position.z = THREE.MathUtils.clamp(world.sled.position.z + sledLateralVel * dt, -8, 12);
    world.sled.position.y = getTerrainHeight(world.sled.position.x, world.sled.position.z);
    world.sled.rotation.y = -Math.PI / 2 - sledLateralVel * 0.06;

    player.root.position.copy(world.sled.position);
    player.root.position.y += 0.25;
    player.root.rotation.y = world.sled.rotation.y;
    currentLocalPose = "sled";
    player.updatePose("sled", elapsed);

    stepMarkAccum += sledSpeed * dt;
    if (stepMarkAccum > 0.35) {
      stepMarkAccum = 0;
      world.addSnowMark(world.sled.position.x, world.sled.position.z - 0.32, 0.75, 0xb8d0ec);
      world.addSnowMark(world.sled.position.x, world.sled.position.z + 0.32, 0.75, 0xb8d0ec);
    }

    if (world.sled.position.x <= 12.5) {
      gameState = "EXPLORE";
      sledSteerUI.classList.add("hidden");
      player.root.position.set(11.5, 0, world.sled.position.z + 1.2);
      world.sled.position.copy(world.sledHome);
      world.sled.rotation.y = Math.PI / 2;
      winterAudio.playChime();
      actionExplore.classList.remove("hidden");
      showToast("슈~ 재밌었다! 🛷", 2400);
    }
  } else if (gameState === "DECORATING") {
    currentLocalPose = "idle";
    player.updatePose("idle", elapsed);
  } else if (gameState === "FISHING") {
    if (fishCatchTimer > 0) {
      fishCatchTimer -= dt;
      currentLocalPose = "fish_catch";
      player.updatePose("fish_catch", elapsed);
      if (fishCatchTimer <= 0) {
        resetFishingCast();
      }
    } else {
      currentLocalPose = "fishing";
      player.updatePose("fishing", elapsed);
      if (!fishBiting) {
        fishBiteTimer -= dt;
        player.bobber.position.y = -1.78 + Math.sin(elapsed * 3) * 0.02;
        if (fishBiteTimer <= 0) {
          fishBiting = true;
          pullFishBtn.disabled = false;
          pullFishLabel.textContent = "지금 당기기! 🐟";
          winterAudio.playChime();
          showToast("❗ 입질이 왔어요! 당기기를 누르세요!", 2400);
        }
      } else {
        player.bobber.position.y = -1.78 + Math.sin(elapsed * 22) * 0.09;
      }
    }
  } else if (gameState === "INDOOR") {
    currentLocalPose = indoorPose;
    player.updatePose(indoorPose, elapsed);
  }

  if (gameState === "EXPLORE") {
    const pPos = player.root.position;
    let foundLog = null;
    for (const log of world.logs) {
      if (pPos.distanceTo(log.seatPos) < 2.2) {
        foundLog = log;
        break;
      }
    }

    let foundFishSpot = null;
    for (const spot of world.fishingSpots) {
      if (pPos.distanceTo(spot.seatPos) < 2.4) {
        foundFishSpot = spot;
        break;
      }
    }

    let nearCabinDoor = null;
    for (const door of world.cabinDoors) {
      if (pPos.distanceTo(door) < 2.8) {
        nearCabinDoor = door;
        break;
      }
    }

    let nearSnowman = null;
    for (const sm of snowmen) {
      if (pPos.distanceTo(sm.pos) < 3.6) {
        nearSnowman = sm;
        break;
      }
    }

    const nearSled = pPos.distanceTo(world.sled.position) < 2.7;

    if (nearSnowman) {
      activeSnowman = nearSnowman;
      actionExplore.classList.add("hidden");
      actionSnowmanNear.classList.remove("hidden");
    } else {
      actionSnowmanNear.classList.add("hidden");
      actionExplore.classList.remove("hidden");

      if (foundLog) {
        contextualBtn.classList.remove("hidden");
        contextualIcon.textContent = "🔥";
        contextualLabel.textContent = "불 쬐기";
        currentContextualAction = () => enterSitting(foundLog);
      } else if (foundFishSpot) {
        contextualBtn.classList.remove("hidden");
        contextualIcon.textContent = "🎣";
        contextualLabel.textContent = "얼음 낚시";
        currentContextualAction = () => startFishing(foundFishSpot);
      } else if (nearCabinDoor) {
        contextualBtn.classList.remove("hidden");
        contextualIcon.textContent = "🚪";
        contextualLabel.textContent = "집 안으로";
        currentContextualAction = () => enterCabin(nearCabinDoor);
      } else if (nearSled) {
        contextualBtn.classList.remove("hidden");
        contextualIcon.textContent = "🛷";
        contextualLabel.textContent = "썰매 타기";
        currentContextualAction = startSledding;
      } else {
        contextualBtn.classList.add("hidden");
        currentContextualAction = null;
      }
    }
  }

  if (gameState !== "PHOTO") {
    const target = player.root.position.clone().add(new THREE.Vector3(0, 1.15, 0));
    const offset = new THREE.Vector3(
      Math.sin(camYaw) * Math.cos(camPitch) * camDist,
      Math.sin(camPitch) * camDist,
      Math.cos(camYaw) * Math.cos(camPitch) * camDist
    );
    camera.position.lerp(target.clone().add(offset), Math.min(1, dt * 8));
    camera.lookAt(target);
  }

  netSendTimer += dt;
  if (ws && ws.readyState === 1 && netSendTimer >= 0.065) {
    netSendTimer = 0;
    ws.send(
      JSON.stringify({
        type: "state",
        x: player.root.position.x,
        y: player.root.position.y,
        z: player.root.position.z,
        ry: player.root.rotation.y,
        pose: gameState === "PHOTO" ? "wave" : currentLocalPose,
        roasting: gameState === "ROASTING",
        toasted: roastDone,
      })
    );
  }

  const nowMs = performance.now();
  for (const [, rp] of remotePlayers) {
    rp.charObj.root.position.lerp(rp.targetPos, Math.min(1, dt * 10));
    let diff = rp.targetRy - rp.charObj.root.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    rp.charObj.root.rotation.y += diff * Math.min(1, dt * 10);
    rp.charObj.updatePose(rp.pose, elapsed);

    projectLabel(rp.labelEl, rp.charObj.root.position.clone().add(new THREE.Vector3(0, 2.05, 0)));
    if (nowMs < rp.bubbleUntil) {
      rp.bubbleEl.classList.remove("hidden");
      projectLabel(rp.bubbleEl, rp.charObj.root.position.clone().add(new THREE.Vector3(0, 2.65, 0)));
    } else {
      rp.bubbleEl.classList.add("hidden");
    }
  }

  projectLabel(playerLabelEl, player.root.position.clone().add(new THREE.Vector3(0, 2.05, 0)));
  if (nowMs < localBubbleUntil) {
    localBubbleEl.classList.remove("hidden");
    projectLabel(localBubbleEl, player.root.position.clone().add(new THREE.Vector3(0, 2.65, 0)));
  } else {
    localBubbleEl.classList.add("hidden");
  }
  if (isIndoors) {
    signLabelEl.style.display = "none";
    fishingSignLabelEl.style.display = "none";
    cabinDoorLabelEl.style.display = "none";
  } else {
    projectLabel(signLabelEl, world.signPos.clone().add(new THREE.Vector3(0, 2.2, 0)));
    projectLabel(fishingSignLabelEl, world.fishingSignPos.clone().add(new THREE.Vector3(0, 2.2, 0)));
    projectLabel(cabinDoorLabelEl, world.cabinDoorPos.clone().add(new THREE.Vector3(0, 2.2, 0)));
  }
  for (const sm of snowmen) {
    if (isIndoors) {
      sm.labelEl.style.display = "none";
    } else {
      projectLabel(sm.labelEl, sm.pos.clone().add(new THREE.Vector3(0, 3.45, 0)));
    }
  }

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
