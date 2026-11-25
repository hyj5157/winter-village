import * as THREE from "three";

export const CHARACTER_META = {
  rabbit: { emoji: "🐰", label: "토끼" },
  bear: { emoji: "🐻", label: "곰" },
  penguin: { emoji: "🐧", label: "펭귄" },
  cat: { emoji: "🐱", label: "고양이" },
};

export function createCharacter(type = "rabbit") {
  const root = new THREE.Group();
  const visual = new THREE.Group();
  root.add(visual);

  const palettes = {
    rabbit: { body: 0xffffff, belly: 0xfbe2ea, scarf: 0xf47c8a, nose: 0xf48fb1 },
    bear: { body: 0x9c6b49, belly: 0xd9b394, scarf: 0x5ca4d6, nose: 0x3b271c },
    penguin: { body: 0x2f3b52, belly: 0xffffff, scarf: 0xe95d5d, nose: 0xf7a440 },
    cat: { body: 0xf9dcb4, belly: 0xfff5e4, scarf: 0x55bfa8, nose: 0xf28b9c },
  };
  const pal = palettes[type] || palettes.rabbit;

  const bodyMat = new THREE.MeshStandardMaterial({ color: pal.body, roughness: 0.65 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: pal.belly, roughness: 0.7 });
  const scarfMat = new THREE.MeshStandardMaterial({ color: pal.scarf, roughness: 0.6 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1d222b, roughness: 0.3 });
  const cheekMat = new THREE.MeshStandardMaterial({ color: 0xffa6b8, roughness: 0.7 });
  const noseMat = new THREE.MeshStandardMaterial({ color: pal.nose, roughness: 0.5 });

  // Torso
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), bodyMat);
  torso.scale.set(1, 1.08, 0.92);
  torso.position.y = 0.52;
  torso.castShadow = true;
  visual.add(torso);

  // Belly patch
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 14), bellyMat);
  belly.scale.set(0.95, 1.0, 0.55);
  belly.position.set(0, 0.48, 0.25);
  visual.add(belly);

  // Scarf
  const scarfRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.085, 12, 24), scarfMat);
  scarfRing.rotation.x = Math.PI / 2;
  scarfRing.position.y = 0.88;
  scarfRing.castShadow = true;
  visual.add(scarfRing);

  const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.08), scarfMat);
  scarfTail.position.set(0.24, 0.72, 0.22);
  scarfTail.rotation.z = -0.35;
  scarfTail.rotation.x = -0.25;
  visual.add(scarfTail);

  // Head
  const head = new THREE.Group();
  head.position.set(0, 1.24, 0);
  visual.add(head);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), bodyMat);
  headMesh.scale.set(1.04, 0.96, 0.98);
  headMesh.castShadow = true;
  head.add(headMesh);

  // Penguin white face mask
  if (type === "penguin") {
    const faceMask = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), bellyMat);
    faceMask.scale.set(1.02, 0.88, 0.6);
    faceMask.position.set(0, -0.02, 0.22);
    head.add(faceMask);
  }

  // Eyes + white highlight
  [-0.15, 0.15].forEach((xPos) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 12), eyeMat);
    eye.position.set(xPos, 0.04, 0.38);
    head.add(eye);

    const glint = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    glint.position.set(xPos + 0.016, 0.06, 0.42);
    head.add(glint);
  });

  // Cheeks
  [-0.25, 0.25].forEach((xPos) => {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), cheekMat);
    cheek.scale.set(1.2, 0.75, 0.4);
    cheek.position.set(xPos, -0.06, 0.34);
    head.add(cheek);
  });

  // Nose / Snout
  if (type === "penguin") {
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 12), noseMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, -0.04, 0.45);
    head.add(beak);
  } else {
    if (type === "bear") {
      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), bellyMat);
      snout.scale.set(1.15, 0.85, 0.8);
      snout.position.set(0, -0.07, 0.36);
      head.add(snout);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), noseMat);
    nose.scale.set(1.2, 0.85, 0.8);
    nose.position.set(0, -0.03, type === "bear" ? 0.46 : 0.41);
    head.add(nose);
  }

  // Ears
  if (type === "rabbit") {
    [-0.16, 0.16].forEach((xPos, idx) => {
      const earGroup = new THREE.Group();
      earGroup.position.set(xPos, 0.36, -0.02);
      earGroup.rotation.z = idx === 0 ? 0.12 : -0.12;
      const outer = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.34, 8, 12), bodyMat);
      outer.position.y = 0.22;
      outer.castShadow = true;
      const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.25, 6, 10), bellyMat);
      inner.position.set(0, 0.21, 0.045);
      earGroup.add(outer, inner);
      head.add(earGroup);
    });
  } else if (type === "bear") {
    [-0.28, 0.28].forEach((xPos) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), bodyMat);
      ear.position.set(xPos, 0.33, 0);
      ear.castShadow = true;
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), bellyMat);
      inner.position.set(xPos, 0.33, 0.06);
      head.add(ear, inner);
    });
  } else if (type === "cat") {
    [-0.25, 0.25].forEach((xPos, idx) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 4), bodyMat);
      ear.position.set(xPos, 0.38, 0);
      ear.rotation.y = Math.PI / 4;
      ear.rotation.z = idx === 0 ? 0.25 : -0.25;
      ear.castShadow = true;
      head.add(ear);
    });
  }

  // Arms
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.4, 0.72, 0);
  const leftArmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.22, 8, 10), bodyMat);
  leftArmMesh.position.y = -0.12;
  leftArmMesh.castShadow = true;
  leftArm.add(leftArmMesh);
  visual.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.4, 0.72, 0);
  const rightArmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.22, 8, 10), bodyMat);
  rightArmMesh.position.y = -0.12;
  rightArmMesh.castShadow = true;
  rightArm.add(rightArmMesh);
  visual.add(rightArm);

  // Marshmallow roasting stick attached to right hand (points along -Y of arm)
  const stickGroup = new THREE.Group();
  stickGroup.position.set(0, -0.24, 0);
  stickGroup.visible = false;
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 1.9, 8),
    new THREE.MeshStandardMaterial({ color: 0x7c5338, roughness: 0.85 })
  );
  stick.position.y = -0.95;
  stickGroup.add(stick);

  const marshmallowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 });
  const marshmallow = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.16, 14), marshmallowMat);
  marshmallow.position.y = -1.9;
  stickGroup.add(marshmallow);
  rightArm.add(stickGroup);

  // Fishing rod attached to right hand
  const rodGroup = new THREE.Group();
  rodGroup.position.set(0, -0.22, 0);
  rodGroup.visible = false;
  const rodShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.024, 1.85, 8),
    new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 })
  );
  rodShaft.position.y = -0.92;
  rodGroup.add(rodShaft);

  const rodLine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 1.15, 6),
    new THREE.MeshBasicMaterial({ color: 0xeaf4ff })
  );
  rodLine.position.set(0, -1.85, 0.52);
  rodLine.rotation.x = -1.1;
  rodGroup.add(rodLine);

  const bobber = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xff4d4d, roughness: 0.4 })
  );
  bobber.position.set(0, -1.78, 1.02);
  rodGroup.add(bobber);

  // Caught 3D creature dangling from the fishing line
  const catchGroup = new THREE.Group();
  catchGroup.position.set(0, -1.95, 1.02);
  catchGroup.visible = false;
  const catchMat = new THREE.MeshStandardMaterial({ color: 0xf5b041, roughness: 0.4 });
  const catchBody = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), catchMat);
  catchBody.scale.set(0.75, 1.25, 0.85);
  const catchTail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.22, 8), catchMat);
  catchTail.position.y = 0.24;
  catchTail.rotation.x = Math.PI;
  const catchEyeL = new THREE.Mesh(
    new THREE.SphereGeometry(0.032, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x111111 })
  );
  catchEyeL.position.set(-0.08, -0.08, 0.12);
  const catchEyeR = catchEyeL.clone();
  catchEyeR.position.x = 0.08;
  catchGroup.add(catchBody, catchTail, catchEyeL, catchEyeR);
  rodGroup.add(catchGroup);

  rightArm.add(rodGroup);

  // Hot cocoa mug attached to right hand
  const mugGroup = new THREE.Group();
  mugGroup.position.set(0, -0.26, 0.12);
  mugGroup.visible = false;
  const mugBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.1, 0.18, 14),
    new THREE.MeshStandardMaterial({ color: 0xf26b5b, roughness: 0.45 })
  );
  const mugHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.055, 0.018, 8, 14),
    new THREE.MeshStandardMaterial({ color: 0xf26b5b, roughness: 0.45 })
  );
  mugHandle.position.set(0.11, 0, 0);
  const cocoaTop = new THREE.Mesh(
    new THREE.CircleGeometry(0.095, 14),
    new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.3 })
  );
  cocoaTop.rotation.x = -Math.PI / 2;
  cocoaTop.position.y = 0.092;
  mugGroup.add(mugBody, mugHandle, cocoaTop);
  rightArm.add(mugGroup);

  // Feet
  const footMat = type === "penguin" ? noseMat : bodyMat;
  const leftFoot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), footMat);
  leftFoot.scale.set(0.9, 0.65, 1.3);
  leftFoot.position.set(-0.17, 0.1, 0.05);
  leftFoot.castShadow = true;
  visual.add(leftFoot);

  const rightFoot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), footMat);
  rightFoot.scale.set(0.9, 0.65, 1.3);
  rightFoot.position.set(0.17, 0.1, 0.05);
  rightFoot.castShadow = true;
  visual.add(rightFoot);

  // Tail
  if (type === "rabbit" || type === "bear") {
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), bodyMat);
    tail.position.set(0, 0.34, -0.38);
    visual.add(tail);
  } else if (type === "cat") {
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.36, 6, 8), bodyMat);
    tail.position.set(0, 0.4, -0.42);
    tail.rotation.x = -0.8;
    visual.add(tail);
  }

  return {
    root,
    visual,
    stickGroup,
    marshmallowMat,
    bobber,
    setRoasting(active, toasted = false) {
      stickGroup.visible = active;
      marshmallowMat.color.setHex(toasted ? 0xe6a85c : 0xffffff);
    },
    setFishing(active) {
      rodGroup.visible = active;
      if (!active) catchGroup.visible = false;
    },
    setCaughtCreature(colorHex = null, shape = "fish") {
      if (!colorHex) {
        catchGroup.visible = false;
        return;
      }
      catchMat.color.setHex(colorHex);
      if (shape === "round") {
        catchBody.scale.set(1.15, 1.05, 1.15);
        catchTail.visible = false;
      } else if (shape === "wide") {
        catchBody.scale.set(1.35, 0.75, 1.1);
        catchTail.visible = false;
      } else {
        catchBody.scale.set(0.75, 1.35, 0.85);
        catchTail.visible = true;
      }
      catchGroup.visible = true;
    },
    setCocoa(active) {
      mugGroup.visible = active;
    },
    updatePose(mode, timeSec) {
      // Reset defaults
      visual.position.set(0, 0, 0);
      visual.rotation.set(0, 0, 0);
      leftArm.rotation.set(0, 0, 0.22);
      rightArm.rotation.set(0, 0, -0.22);
      leftFoot.position.set(-0.17, 0.1, 0.05);
      rightFoot.position.set(0.17, 0.1, 0.05);

      if (mode === "walk") {
        const bob = Math.abs(Math.sin(timeSec * 12));
        visual.position.y = bob * 0.12;
        visual.rotation.z = Math.sin(timeSec * 12) * 0.06;
        leftArm.rotation.x = Math.sin(timeSec * 12) * 0.55;
        rightArm.rotation.x = -Math.sin(timeSec * 12) * 0.55;
        leftFoot.position.z = 0.05 + Math.sin(timeSec * 12) * 0.14;
        rightFoot.position.z = 0.05 - Math.sin(timeSec * 12) * 0.14;
      } else if (mode === "sit") {
        visual.position.y = -0.14;
        leftFoot.position.set(-0.18, 0.2, 0.32);
        rightFoot.position.set(0.18, 0.2, 0.32);
        leftArm.rotation.x = -0.2;
        rightArm.rotation.x = -0.2;
      } else if (mode === "roast") {
        visual.position.y = -0.14;
        visual.rotation.x = 0.12;
        leftFoot.position.set(-0.18, 0.2, 0.32);
        rightFoot.position.set(0.18, 0.2, 0.32);
        rightArm.rotation.x = -1.42 + Math.sin(timeSec * 3.2) * 0.03;
        rightArm.rotation.y = -0.15;
        rightArm.rotation.z = -0.05;
        stickGroup.rotation.y = Math.sin(timeSec * 2.5) * 0.25;
      } else if (mode === "fishing") {
        visual.position.y = -0.14;
        leftFoot.position.set(-0.18, 0.2, 0.32);
        rightFoot.position.set(0.18, 0.2, 0.32);
        rightArm.rotation.x = -1.15 + Math.sin(timeSec * 2.2) * 0.04;
        rightArm.rotation.z = -0.05;
      } else if (mode === "fish_catch") {
        visual.position.y = -0.08 + Math.sin(timeSec * 8) * 0.03;
        leftFoot.position.set(-0.18, 0.2, 0.32);
        rightFoot.position.set(0.18, 0.2, 0.32);
        rightArm.rotation.x = -2.2; // Lift fishing rod high to show the catch!
        rightArm.rotation.z = -0.1;
        leftArm.rotation.z = 0.65;
        catchGroup.rotation.z = Math.sin(timeSec * 14) * 0.22;
      } else if (mode === "cocoa") {
        visual.position.y = -0.02;
        leftFoot.position.set(-0.18, 0.2, 0.32);
        rightFoot.position.set(0.18, 0.2, 0.32);
        const armAngle = -0.95 + Math.sin(timeSec * 3.0) * 0.12;
        rightArm.rotation.x = armAngle;
        rightArm.rotation.y = -0.32;
        mugGroup.rotation.x = -armAngle; // Keep mug upright!
      } else if (mode === "sleep") {
        visual.rotation.x = -Math.PI / 2;
        visual.position.y = 0.36 + Math.sin(timeSec * 2.2) * 0.015;
        visual.position.z = 0.18;
        leftArm.rotation.z = 0.32;
        rightArm.rotation.z = -0.32;
      } else if (mode === "wave") {
        visual.position.y = Math.sin(timeSec * 4) * 0.04;
        rightArm.rotation.z = -2.3 + Math.sin(timeSec * 9) * 0.25;
        leftArm.rotation.z = 0.35;
      } else if (mode === "sled") {
        visual.position.y = -0.1;
        leftFoot.position.set(-0.16, 0.2, 0.3);
        rightFoot.position.set(0.16, 0.2, 0.3);
        leftArm.rotation.x = -0.7;
        rightArm.rotation.x = -0.7;
      } else {
        // idle
        visual.position.y = Math.sin(timeSec * 2.5) * 0.025;
      }
    },
  };
}
