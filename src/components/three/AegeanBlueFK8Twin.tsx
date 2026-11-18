import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import * as THREE from 'three';
import { useTelemetryStore } from '../../core/store/useTelemetryStore';
import { Eye, Flame, Disc, ShieldAlert, Layers } from 'lucide-react-native';

interface CameraPreset {
  name: string;
  pos: [number, number, number];
  target: [number, number, number];
}

const CAMERA_PRESETS: CameraPreset[] = [
  { name: '3/4 Showroom', pos: [4.2, 2.2, 4.8], target: [0, 0.4, 0] },
  { name: 'K20C1 Engine Bay', pos: [0, 2.5, 2.8], target: [0, 0.5, 1.4] },
  { name: 'Brembo 20" Corner', pos: [2.2, 0.7, 1.8], target: [1.0, 0.35, 1.3] },
  { name: 'Aero Wing & Exhaust', pos: [0, 1.8, -4.5], target: [0, 0.6, -1.8] },
  { name: 'Chase Cam', pos: [0, 2.8, -5.8], target: [0, 0.8, 0] }
];

export const AegeanBlueFK8Twin: React.FC = () => {
  const containerRef = useRef<any>(null);
  const currentFrame = useTelemetryStore((s) => s.currentFrame);
  const setManualOverride = useTelemetryStore((s) => s.setManualOverride);

  const [activePreset, setActivePreset] = useState<string>('3/4 Showroom');
  const [showCallouts, setShowCallouts] = useState<boolean>(true);
  const [isBrakingTest, setIsBrakingTest] = useState<boolean>(false);

  // Screen-projected 2D coordinates for 3D floating badges
  const [projectedPoints, setProjectedPoints] = useState({
    hood: { x: 0, y: 0, visible: false },
    frontBrake: { x: 0, y: 0, visible: false },
    intercooler: { x: 0, y: 0, visible: false },
    rearWing: { x: 0, y: 0, visible: false }
  });

  // Three.js mutable refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const chassisGroupRef = useRef<THREE.Group | null>(null);
  const wheelsRef = useRef<THREE.Mesh[]>([]);
  const brakeRotorsRef = useRef<THREE.Mesh[]>([]);
  const exhaustTipsRef = useRef<THREE.Mesh[]>([]);
  const exhaustGlowLightRef = useRef<THREE.PointLight | null>(null);

  // Camera animation interpolation targets
  const targetCamPos = useRef<THREE.Vector3>(new THREE.Vector3(4.2, 2.2, 4.8));
  const targetCamLook = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.4, 0));
  const currentCamLook = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.4, 0));

  // Orbit dragging state
  const isDragging = useRef(false);
  const prevPointer = useRef({ x: 0, y: 0 });
  const orbitAngle = useRef({ theta: 0.8, phi: 0.4, radius: 6.8 });

  useEffect(() => {
    if (Platform.OS !== 'web' || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 640;
    const height = containerRef.current.clientHeight || 360;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(4.2, 2.2, 4.8);
    camera.lookAt(0, 0.4, 0);
    cameraRef.current = camera;

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    const container = containerRef.current;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(6, 9, 6);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x0046ad, 1.4);
    rimLight.position.set(-6, 4, -6);
    scene.add(rimLight);

    const underglowLight = new THREE.PointLight(0x0046ad, 0.8, 6);
    underglowLight.position.set(0, 0.1, 0);
    scene.add(underglowLight);

    const exhaustGlow = new THREE.PointLight(0xff3300, 0, 4);
    exhaustGlow.position.set(0, 0.35, -2.1);
    scene.add(exhaustGlow);
    exhaustGlowLightRef.current = exhaustGlow;

    // 4. Studio Ground Reflection Grid
    const gridHelper = new THREE.GridHelper(18, 36, 0x0046ad, 0x1a2639);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // 5. Build FK8 Chassis Group
    const carRoot = new THREE.Group();
    scene.add(carRoot);
    chassisGroupRef.current = carRoot;

    buildFK8CivicTypeR(carRoot, wheelsRef, brakeRotorsRef, exhaustTipsRef);

    // 6. Mouse/Touch Orbit Listeners
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging.current = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevPointer.current = { x: clientX, y: clientY };
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - prevPointer.current.x;
      const dy = clientY - prevPointer.current.y;
      prevPointer.current = { x: clientX, y: clientY };

      orbitAngle.current.theta -= dx * 0.007;
      orbitAngle.current.phi = Math.max(0.1, Math.min(1.4, orbitAngle.current.phi + dy * 0.007));

      // Update camera pos directly
      const r = orbitAngle.current.radius;
      targetCamPos.current.x = r * Math.sin(orbitAngle.current.phi) * Math.sin(orbitAngle.current.theta);
      targetCamPos.current.y = r * Math.cos(orbitAngle.current.phi);
      targetCamPos.current.z = r * Math.sin(orbitAngle.current.phi) * Math.cos(orbitAngle.current.theta);
    };

    const onPointerUp = () => {
      isDragging.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      orbitAngle.current.radius = Math.max(3.0, Math.min(10.0, orbitAngle.current.radius + e.deltaY * 0.005));
      const r = orbitAngle.current.radius;
      targetCamPos.current.x = r * Math.sin(orbitAngle.current.phi) * Math.sin(orbitAngle.current.theta);
      targetCamPos.current.y = r * Math.cos(orbitAngle.current.phi);
      targetCamPos.current.z = r * Math.sin(orbitAngle.current.phi) * Math.cos(orbitAngle.current.theta);
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onPointerDown);
    dom.addEventListener('touchstart', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchend', onPointerUp);
    dom.addEventListener('wheel', onWheel);

    // 7. Resize Observer
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 8. Animation & Render Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Smooth camera lerp
      camera.position.lerp(targetCamPos.current, 0.08);
      currentCamLook.current.lerp(targetCamLook.current, 0.08);
      camera.lookAt(currentCamLook.current);

      // Project 3D points to 2D screen overlay
      projectAnchorPoints(camera, width, height, setProjectedPoints);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', onPointerDown);
      dom.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchend', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Update Three.js physics & materials based on 25Hz telemetry stream
  useEffect(() => {
    if (!chassisGroupRef.current) return;

    // 1. Dynamic Chassis Pitch & Roll from G-Forces
    // Pitch: lonG > 0 (accel) -> squat (-pitch); lonG < 0 (braking) -> dive (+pitch)
    const targetPitch = -currentFrame.lonG * 0.06;
    // Roll: latG > 0 (right turn) -> roll left (-roll)
    const targetRoll = -currentFrame.latG * 0.07;

    chassisGroupRef.current.rotation.x = THREE.MathUtils.lerp(chassisGroupRef.current.rotation.x, targetPitch, 0.15);
    chassisGroupRef.current.rotation.z = THREE.MathUtils.lerp(chassisGroupRef.current.rotation.z, targetRoll, 0.15);

    // 2. Real-time Wheel Spin matching Speed (MPH)
    // Speed to angular velocity: v = omega * r
    const wheelRotSpeed = (currentFrame.speedMph * 1.60934 * 1000) / (3600 * 0.34); // rad/s
    const dt = 0.04;
    wheelsRef.current.forEach((wheel) => {
      wheel.rotation.x += (wheelRotSpeed * dt) % (Math.PI * 2);
    });

    // 3. Glowing Brembo Brake Rotors (orange-red thermal emission as rotor temp climbs above 480°F)
    const brakeTemp = currentFrame.brakeRotorTempF;
    const isHotBrakes = brakeTemp > 450;
    const hotRatio = Math.min(1.0, Math.max(0, (brakeTemp - 450) / 400)); // 0 to 1

    brakeRotorsRef.current.forEach((rotor) => {
      const mat = rotor.material as THREE.MeshStandardMaterial;
      if (isHotBrakes) {
        mat.emissive.setHex(0xff3300);
        mat.emissiveIntensity = hotRatio * 2.8;
      } else {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    });

    // 4. Exhaust Thermal Glow (spikes above 5,500 RPM or high boost)
    const isExhaustGlowing = currentFrame.rpm > 5500 || currentFrame.boostPsi > 18;
    const exhaustIntensity = isExhaustGlowing ? Math.min(2.5, ((currentFrame.rpm - 5500) / 1500) * 2.2 + 0.5) : 0;

    exhaustTipsRef.current.forEach((tip) => {
      const mat = tip.material as THREE.MeshStandardMaterial;
      if (isExhaustGlowing) {
        mat.emissive.setHex(0xff4500);
        mat.emissiveIntensity = exhaustIntensity;
      } else {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    });

    if (exhaustGlowLightRef.current) {
      exhaustGlowLightRef.current.intensity = exhaustIntensity * 1.5;
    }
  }, [currentFrame]);

  // Switch Camera Presets
  const applyPreset = (preset: CameraPreset) => {
    setActivePreset(preset.name);
    targetCamPos.current.set(...preset.pos);
    targetCamLook.current.set(...preset.target);
    const r = Math.sqrt(preset.pos[0] ** 2 + preset.pos[1] ** 2 + preset.pos[2] ** 2);
    orbitAngle.current.radius = r;
    orbitAngle.current.phi = Math.acos(preset.pos[1] / r);
    orbitAngle.current.theta = Math.atan2(preset.pos[0], preset.pos[2]);
  };

  // Test Heavy Brembo Brake Button action
  const handleHeavyBraking = () => {
    setIsBrakingTest(true);
    setManualOverride(0, 3, true);
    setTimeout(() => {
      setManualOverride(40, 4, false);
      setIsBrakingTest(false);
    }, 1800);
  };

  return (
    <View style={styles.outerContainer}>
      {/* 3D Canvas Viewport */}
      <View style={styles.canvasContainer} ref={containerRef}>
        {Platform.OS !== 'web' && (
          <View style={styles.nativeFallback}>
            <Text style={styles.fallbackText}>FK8 3D Digital Twin (Hardware Accelerated WebGL)</Text>
          </View>
        )}
      </View>

      {/* Floating 3D Telemetry Badges */}
      {showCallouts && Platform.OS === 'web' && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {projectedPoints.hood.visible && (
            <View style={[styles.floatingBadge, { left: projectedPoints.hood.x - 70, top: projectedPoints.hood.y - 45 }]}>
              <Text style={styles.badgeLabel}>K20C1 VTEC TURBO</Text>
              <Text style={styles.badgeValue}>
                OIL: {Math.round(currentFrame.oilTempF)}°F | CLT: {Math.round(currentFrame.coolantTempF)}°F
              </Text>
            </View>
          )}

          {projectedPoints.intercooler.visible && (
            <View style={[styles.floatingBadge, { left: projectedPoints.intercooler.x - 65, top: projectedPoints.intercooler.y + 10 }]}>
              <Text style={styles.badgeLabel}>FRONT INTERCOOLER</Text>
              <Text style={styles.badgeValue}>
                {currentFrame.boostPsi >= 0 ? `+${currentFrame.boostPsi.toFixed(1)} PSI` : `${currentFrame.manifoldPressureInHg.toFixed(1)} inHg`} | IAT {currentFrame.iatF}°F
              </Text>
            </View>
          )}

          {projectedPoints.frontBrake.visible && (
            <View style={[styles.floatingBadge, { left: projectedPoints.frontBrake.x + 10, top: projectedPoints.frontBrake.y - 30 }]}>
              <Text style={styles.badgeLabel}>BREMBO 4-POT 350MM</Text>
              <Text style={[styles.badgeValue, currentFrame.brakeRotorTempF > 500 && { color: '#FF4500' }]}>
                {Math.round(currentFrame.brakeRotorTempF)}°F | {currentFrame.tpms.fl.psi} PSI
              </Text>
            </View>
          )}

          {projectedPoints.rearWing.visible && (
            <View style={[styles.floatingBadge, { left: projectedPoints.rearWing.x - 75, top: projectedPoints.rearWing.y - 45 }]}>
              <Text style={styles.badgeLabel}>TYPE R AERO WING</Text>
              <Text style={styles.badgeValue}>
                DOWNFORCE: 45 kg @ 100mph | 3-EXHAUST
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Overlay Toolbar: Camera Presets & Interactive Actions */}
      <View style={styles.toolbarOverlay}>
        <View style={styles.presetGroup}>
          <Eye size={13} color="#0046AD" style={{ marginRight: 6 }} />
          {CAMERA_PRESETS.map((p) => {
            const isActive = activePreset === p.name;
            return (
              <TouchableOpacity
                key={p.name}
                style={[styles.presetButton, isActive && styles.presetButtonActive]}
                onPress={() => applyPreset(p)}
              >
                <Text style={[styles.presetButtonText, isActive && styles.presetButtonTextActive]}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.actionsGroup}>
          {/* Toggle Floating Badges */}
          <TouchableOpacity
            style={[styles.actionButton, showCallouts && styles.actionButtonActive]}
            onPress={() => setShowCallouts(!showCallouts)}
          >
            <Layers size={13} color={showCallouts ? '#3B82F6' : '#94A3B8'} style={{ marginRight: 5 }} />
            <Text style={[styles.actionButtonText, showCallouts && { color: '#3B82F6' }]}>
              {showCallouts ? 'Badges ON' : 'Badges OFF'}
            </Text>
          </TouchableOpacity>

          {/* Heavy Brembo Brake Test */}
          <TouchableOpacity
            style={[styles.actionButtonBrake, isBrakingTest && styles.actionButtonBrakeActive]}
            onPress={handleHeavyBraking}
          >
            <Disc size={13} color={isBrakingTest ? '#FFFFFF' : '#E40521'} style={{ marginRight: 5 }} />
            <Text style={[styles.actionButtonBrakeText, isBrakingTest && { color: '#FFFFFF' }]}>
              {isBrakingTest ? 'BREMBO BRAKING -1.15G!' : 'Test Brembo Brake'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Procedural 3D Model Generator for 2019 FK8 Civic Type R in Aegean Blue Metallic
function buildFK8CivicTypeR(
  root: THREE.Group,
  wheelsRef: React.MutableRefObject<THREE.Mesh[]>,
  brakeRotorsRef: React.MutableRefObject<THREE.Mesh[]>,
  exhaustTipsRef: React.MutableRefObject<THREE.Mesh[]>
) {
  wheelsRef.current = [];
  brakeRotorsRef.current = [];
  exhaustTipsRef.current = [];

  // Honda Aegean Blue Metallic (Paint Code B-593M: #0046AD)
  const aegeanBluePaint = new THREE.MeshStandardMaterial({
    color: 0x0046ad,
    metalness: 0.85,
    roughness: 0.22,
    envMapIntensity: 1.5
  });

  // Carbon Fiber Material with subtle weave finish
  const carbonFiberMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.45,
    metalness: 0.2
  });

  // Type R Red Pinstripe Material (#E40521)
  const typeRRedMat = new THREE.MeshStandardMaterial({
    color: 0xe40521,
    roughness: 0.3,
    metalness: 0.1
  });

  // Berlina Black Wheel Material
  const berlinaBlackMat = new THREE.MeshStandardMaterial({
    color: 0x0c0d0e,
    metalness: 0.9,
    roughness: 0.25
  });

  // Cross-Drilled Steel Brake Rotor Material
  const steelRotorMat = new THREE.MeshStandardMaterial({
    color: 0x71717a,
    metalness: 0.95,
    roughness: 0.18
  });

  // Glass Material
  const tintedGlassMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.1,
    metalness: 0.8,
    transparent: true,
    opacity: 0.85
  });

  // Polished Chrome Exhaust Tip Material
  const polishedChromeMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    metalness: 0.95,
    roughness: 0.12
  });

  // 1. Lower Main Body / Fenders
  const lowerBodyGeom = new THREE.BoxGeometry(1.84, 0.46, 4.3);
  const lowerBody = new THREE.Mesh(lowerBodyGeom, aegeanBluePaint);
  lowerBody.position.set(0, 0.42, 0);
  lowerBody.castShadow = true;
  root.add(lowerBody);

  // 2. Widebody Wheel Arch Flares (FK8 Iconic Flared Fenders)
  const frontFlareGeom = new THREE.BoxGeometry(1.92, 0.38, 1.1);
  const frontFlare = new THREE.Mesh(frontFlareGeom, aegeanBluePaint);
  frontFlare.position.set(0, 0.42, 1.35);
  root.add(frontFlare);

  const rearFlareGeom = new THREE.BoxGeometry(1.9, 0.38, 1.1);
  const rearFlare = new THREE.Mesh(rearFlareGeom, aegeanBluePaint);
  rearFlare.position.set(0, 0.42, -1.35);
  root.add(rearFlare);

  // 3. Cabin / Greenhouse (Black Roof & Tinted Glass)
  const cabinGeom = new THREE.BoxGeometry(1.45, 0.48, 2.3);
  const cabin = new THREE.Mesh(cabinGeom, tintedGlassMat);
  cabin.position.set(0, 0.84, -0.15);
  root.add(cabin);

  // Gloss Black Roof with Shark-Fin Antenna
  const roofGeom = new THREE.BoxGeometry(1.4, 0.04, 2.2);
  const blackRoof = new THREE.Mesh(roofGeom, carbonFiberMat);
  blackRoof.position.set(0, 1.09, -0.15);
  root.add(blackRoof);

  // Shark Fin Antenna
  const antennaGeom = new THREE.ConeGeometry(0.04, 0.12, 4);
  const antenna = new THREE.Mesh(antennaGeom, carbonFiberMat);
  antenna.position.set(0, 1.16, -1.05);
  antenna.rotation.x = -0.3;
  root.add(antenna);

  // 4. FK8 Functional Aluminum Hood Scoop
  const hoodScoopGeom = new THREE.BoxGeometry(0.48, 0.05, 0.4);
  const hoodScoop = new THREE.Mesh(hoodScoopGeom, carbonFiberMat);
  hoodScoop.position.set(0, 0.66, 1.25);
  root.add(hoodScoop);

  // 5. Front Carbon Fiber Splitter with Type R Red Pinstripe
  const frontSplitterGeom = new THREE.BoxGeometry(1.88, 0.04, 0.35);
  const frontSplitter = new THREE.Mesh(frontSplitterGeom, carbonFiberMat);
  frontSplitter.position.set(0, 0.18, 2.25);
  root.add(frontSplitter);

  const redPinstripeGeom = new THREE.BoxGeometry(1.9, 0.015, 0.02);
  const redPinstripe = new THREE.Mesh(redPinstripeGeom, typeRRedMat);
  redPinstripe.position.set(0, 0.165, 2.43);
  root.add(redPinstripe);

  // Front Red Honda Type R Badge
  const badgeGeom = new THREE.BoxGeometry(0.12, 0.08, 0.02);
  const frontBadge = new THREE.Mesh(badgeGeom, typeRRedMat);
  frontBadge.position.set(0, 0.48, 2.16);
  root.add(frontBadge);

  // 6. Side Skirts with Red Accent Lines
  [-0.94, 0.94].forEach((xSide) => {
    const sideSkirtGeom = new THREE.BoxGeometry(0.05, 0.04, 2.5);
    const sideSkirt = new THREE.Mesh(sideSkirtGeom, carbonFiberMat);
    sideSkirt.position.set(xSide, 0.18, 0);
    root.add(sideSkirt);

    const sideRedStrip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 2.5), typeRRedMat);
    sideRedStrip.position.set(xSide * 1.02, 0.165, 0);
    root.add(sideRedStrip);
  });

  // 7. Iconic FK8 Dual-Plane High-Mount Rear Aerodynamic Wing
  // Upright Stanchions
  [-0.6, 0.6].forEach((x) => {
    const stanchionGeom = new THREE.BoxGeometry(0.04, 0.38, 0.25);
    const stanchion = new THREE.Mesh(stanchionGeom, carbonFiberMat);
    stanchion.position.set(x, 0.88, -1.95);
    stanchion.rotation.x = -0.15;
    root.add(stanchion);
  });

  // Main Carbon Wing Blade
  const wingBladeGeom = new THREE.BoxGeometry(1.68, 0.04, 0.38);
  const wingBlade = new THREE.Mesh(wingBladeGeom, carbonFiberMat);
  wingBlade.position.set(0, 1.08, -1.98);
  wingBlade.rotation.x = -0.06;
  root.add(wingBlade);

  // Wing Angled Endplates
  [-0.84, 0.84].forEach((x) => {
    const endplateGeom = new THREE.BoxGeometry(0.03, 0.22, 0.42);
    const endplate = new THREE.Mesh(endplateGeom, carbonFiberMat);
    endplate.position.set(x, 1.08, -1.98);
    root.add(endplate);
  });

  // 8. Rear Carbon Diffuser & Signature Center Triple Exhaust Tips
  const rearDiffuserGeom = new THREE.BoxGeometry(1.82, 0.18, 0.3);
  const rearDiffuser = new THREE.Mesh(rearDiffuserGeom, carbonFiberMat);
  rearDiffuser.position.set(0, 0.25, -2.15);
  root.add(rearDiffuser);

  // Triple Center Exhaust: 2 Large Outer Tips (0.07m radius) + 1 Smaller Center Resonator Tip (0.05m radius)
  const exhaustOuterGeom = new THREE.CylinderGeometry(0.07, 0.07, 0.2, 16);
  const exhaustCenterGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 16);

  const leftTip = new THREE.Mesh(exhaustOuterGeom, polishedChromeMat.clone());
  leftTip.rotation.x = Math.PI / 2;
  leftTip.position.set(-0.16, 0.24, -2.28);
  root.add(leftTip);
  exhaustTipsRef.current.push(leftTip);

  const centerTip = new THREE.Mesh(exhaustCenterGeom, polishedChromeMat.clone());
  centerTip.rotation.x = Math.PI / 2;
  centerTip.position.set(0, 0.24, -2.28);
  root.add(centerTip);
  exhaustTipsRef.current.push(centerTip);

  const rightTip = new THREE.Mesh(exhaustOuterGeom, polishedChromeMat.clone());
  rightTip.rotation.x = Math.PI / 2;
  rightTip.position.set(0.16, 0.24, -2.28);
  root.add(rightTip);
  exhaustTipsRef.current.push(rightTip);

  // 9. 20-inch Berlina Black Multi-Spoke Wheels + Red Flange + Brembo 4-Piston Calipers & Rotors
  const wheelPositions = [
    { x: 0.94, z: 1.35, isFront: true }, // Front-Right
    { x: -0.94, z: 1.35, isFront: true }, // Front-Left
    { x: 0.94, z: -1.35, isFront: false }, // Rear-Right
    { x: -0.94, z: -1.35, isFront: false } // Rear-Left
  ];

  const wheelTireGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.24, 24);
  const wheelFlangeGeom = new THREE.TorusGeometry(0.34, 0.012, 8, 24);
  const brakeRotorGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.03, 24);
  const bremboCaliperGeom = new THREE.BoxGeometry(0.08, 0.16, 0.12);

  wheelPositions.forEach((pos) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(pos.x, 0.35, pos.z);

    // Tire & Berlina Black Rim
    const tire = new THREE.Mesh(wheelTireGeom, berlinaBlackMat);
    tire.rotation.z = Math.PI / 2;
    wheelGroup.add(tire);
    wheelsRef.current.push(tire);

    // Type R Red Rim Flange Ring
    const redFlange = new THREE.Mesh(wheelFlangeGeom, typeRRedMat);
    redFlange.position.set(pos.x > 0 ? 0.12 : -0.12, 0, 0);
    redFlange.rotation.y = Math.PI / 2;
    wheelGroup.add(redFlange);

    // Steel Cross-Drilled Brake Rotor (Rotates with wheel or sits inboard)
    const rotor = new THREE.Mesh(brakeRotorGeom, steelRotorMat.clone());
    rotor.rotation.z = Math.PI / 2;
    rotor.position.set(pos.x > 0 ? 0.04 : -0.04, 0, 0);
    wheelGroup.add(rotor);
    brakeRotorsRef.current.push(rotor);

    // Fixed Red Brembo Caliper (Static, mounted to knuckle)
    const caliper = new THREE.Mesh(bremboCaliperGeom, typeRRedMat);
    caliper.position.set(pos.x, 0.42, pos.z + 0.1);
    root.add(caliper);

    root.add(wheelGroup);
  });
}

// Coordinate projection helper from 3D scene to 2D UI screen
function projectAnchorPoints(
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
  setProjectedPoints: React.Dispatch<React.SetStateAction<any>>
) {
  const points = {
    hood: new THREE.Vector3(0, 0.72, 1.25),
    frontBrake: new THREE.Vector3(0.96, 0.35, 1.35),
    intercooler: new THREE.Vector3(0, 0.28, 2.2),
    rearWing: new THREE.Vector3(0, 1.15, -1.98)
  };

  const project = (v: THREE.Vector3) => {
    const clone = v.clone();
    clone.project(camera);
    // clone.z < 1 means in front of camera
    const isVisible = clone.z < 1;
    const x = ((clone.x + 1) * width) / 2;
    const y = ((-clone.y + 1) * height) / 2;
    return { x, y, visible: isVisible && x > 20 && x < width - 20 && y > 20 && y < height - 20 };
  };

  setProjectedPoints({
    hood: project(points.hood),
    frontBrake: project(points.frontBrake),
    intercooler: project(points.intercooler),
    rearWing: project(points.rearWing)
  });
}

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    height: 380,
    backgroundColor: '#090C10',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    position: 'relative'
  },
  canvasContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0
  },
  nativeFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#090C10'
  },
  fallbackText: {
    color: '#3B82F6',
    fontSize: 14,
    fontFamily: 'monospace'
  },
  floatingBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(9, 12, 16, 0.88)',
    borderColor: 'rgba(0, 70, 173, 0.6)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    pointerEvents: 'none'
  },
  badgeLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 0.5
  },
  badgeValue: {
    color: '#38BDF8',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '800'
  },
  toolbarOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    pointerEvents: 'box-none'
  },
  presetGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 16, 27, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4
  },
  presetButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  presetButtonActive: {
    backgroundColor: '#0046AD'
  },
  presetButtonText: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '600'
  },
  presetButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 16, 27, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  actionButtonActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)'
  },
  actionButtonText: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '600'
  },
  actionButtonBrake: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(228, 5, 33, 0.15)',
    borderWidth: 1,
    borderColor: '#E40521',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  actionButtonBrakeActive: {
    backgroundColor: '#E40521'
  },
  actionButtonBrakeText: {
    color: '#E40521',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700'
  }
});
