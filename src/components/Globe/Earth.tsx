import { useRef, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { useTrackingStore } from "@/store/useTrackingStore";

export function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const auroraRef = useRef<THREE.Mesh>(null);
  const nightRef = useRef<THREE.Mesh>(null);
  const overlayRef = useRef<THREE.Mesh>(null);
  const graticuleRef = useRef<THREE.Mesh>(null);

  const activeLayers = useTrackingStore((s) => s.activeLayers);

  const [dayMap, nightMap, bumpMap, specMap] = useLoader(THREE.TextureLoader, [
    "/textures/earth-day.jpg",
    "/textures/earth-night.jpg",
    "/textures/earth-bump.png",
    "/textures/earth-specular.png",
  ]);

  // False-color overlay shader (infrared / vegetation / sea temp / water vapor / precipitation / terrain)
  const overlayMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        void main() {
          vUv = uv;
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uDayMap;
        uniform int uMode; // 0=infrared, 1=vegetation, 2=seaTemp, 3=waterVapor, 4=precipitation, 5=terrain
        uniform float uOpacity;
        varying vec2 vUv;
        varying vec3 vWorldNormal;

        vec3 infraredPalette(float t) {
          // Black -> purple -> red -> orange -> yellow -> white
          if (t < 0.2) return mix(vec3(0.0, 0.0, 0.1), vec3(0.3, 0.0, 0.5), t / 0.2);
          if (t < 0.4) return mix(vec3(0.3, 0.0, 0.5), vec3(0.8, 0.1, 0.1), (t - 0.2) / 0.2);
          if (t < 0.6) return mix(vec3(0.8, 0.1, 0.1), vec3(1.0, 0.5, 0.0), (t - 0.4) / 0.2);
          if (t < 0.8) return mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 1.0, 0.2), (t - 0.6) / 0.2);
          return mix(vec3(1.0, 1.0, 0.2), vec3(1.0, 1.0, 1.0), (t - 0.8) / 0.2);
        }

        vec3 vegetationPalette(float t) {
          // Brown -> yellow-green -> dark green
          if (t < 0.3) return mix(vec3(0.4, 0.25, 0.1), vec3(0.6, 0.5, 0.15), t / 0.3);
          if (t < 0.6) return mix(vec3(0.6, 0.5, 0.15), vec3(0.2, 0.6, 0.1), (t - 0.3) / 0.3);
          return mix(vec3(0.2, 0.6, 0.1), vec3(0.0, 0.3, 0.05), (t - 0.6) / 0.4);
        }

        vec3 seaTempPalette(float t) {
          // Deep blue -> cyan -> yellow -> red
          if (t < 0.25) return mix(vec3(0.0, 0.0, 0.3), vec3(0.0, 0.2, 0.6), t / 0.25);
          if (t < 0.5) return mix(vec3(0.0, 0.2, 0.6), vec3(0.0, 0.8, 0.7), (t - 0.25) / 0.25);
          if (t < 0.75) return mix(vec3(0.0, 0.8, 0.7), vec3(1.0, 0.8, 0.0), (t - 0.5) / 0.25);
          return mix(vec3(1.0, 0.8, 0.0), vec3(0.8, 0.0, 0.0), (t - 0.75) / 0.25);
        }

        vec3 waterVaporPalette(float t) {
          // Transparent blue -> white
          return mix(vec3(0.1, 0.15, 0.3), vec3(0.8, 0.9, 1.0), t);
        }

        vec3 precipitationPalette(float t) {
          // Light blue -> blue -> green -> yellow -> red
          if (t < 0.25) return mix(vec3(0.5, 0.7, 1.0), vec3(0.0, 0.3, 0.9), t / 0.25);
          if (t < 0.5) return mix(vec3(0.0, 0.3, 0.9), vec3(0.1, 0.7, 0.2), (t - 0.25) / 0.25);
          if (t < 0.75) return mix(vec3(0.1, 0.7, 0.2), vec3(1.0, 0.9, 0.0), (t - 0.5) / 0.25);
          return mix(vec3(1.0, 0.9, 0.0), vec3(0.9, 0.1, 0.1), (t - 0.75) / 0.25);
        }

        vec3 terrainPalette(float t) {
          // Ocean blue -> green -> brown -> gray -> white
          if (t < 0.15) return mix(vec3(0.0, 0.1, 0.3), vec3(0.0, 0.2, 0.5), t / 0.15);
          if (t < 0.3) return mix(vec3(0.0, 0.2, 0.5), vec3(0.2, 0.5, 0.2), (t - 0.15) / 0.15);
          if (t < 0.6) return mix(vec3(0.2, 0.5, 0.2), vec3(0.5, 0.35, 0.15), (t - 0.3) / 0.3);
          if (t < 0.85) return mix(vec3(0.5, 0.35, 0.15), vec3(0.6, 0.6, 0.6), (t - 0.6) / 0.25);
          return mix(vec3(0.6, 0.6, 0.6), vec3(1.0, 1.0, 1.0), (t - 0.85) / 0.15);
        }

        void main() {
          vec4 texel = texture2D(uDayMap, vUv);
          float lum = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
          
          vec3 color;
          if (uMode == 0) color = infraredPalette(lum);
          else if (uMode == 1) color = vegetationPalette(texel.g * 1.2);
          else if (uMode == 2) color = seaTempPalette(lum);
          else if (uMode == 3) color = waterVaporPalette(lum * 0.8 + 0.1);
          else if (uMode == 4) color = precipitationPalette(lum);
          else color = terrainPalette(lum);

          gl_FragColor = vec4(color, uOpacity);
        }
      `,
      uniforms: {
        uDayMap: { value: dayMap },
        uMode: { value: 0 },
        uOpacity: { value: 0.75 },
      },
      transparent: true,
      depthWrite: false,
    });
  }, [dayMap]);

  // Night lights shader
  const nightMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        void main() {
          vUv = uv;
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uNightMap;
        uniform vec3 uSunDir;
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        void main() {
          float sunDot = dot(vWorldNormal, uSunDir);
          float nightFactor = smoothstep(0.05, -0.2, sunDot);
          vec3 night = texture2D(uNightMap, vUv).rgb;
          vec3 warmLight = night * vec3(1.2, 0.9, 0.6) * 2.0;
          gl_FragColor = vec4(warmLight, nightFactor * length(night) * 1.5);
        }
      `,
      uniforms: {
        uNightMap: { value: nightMap },
        uSunDir: { value: new THREE.Vector3(1, 0.3, 0.5).normalize() },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [nightMap]);

  // Atmosphere shader
  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-worldPos.xyz);
          gl_Position = projectionMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        uniform float uTime;
        void main() {
          float rim = 1.0 - max(dot(vNormal, vViewDir), 0.0);
          float intensity = pow(rim, 3.0);
          vec3 innerColor = vec3(0.3, 0.6, 1.0);
          vec3 outerColor = vec3(0.05, 0.2, 0.8);
          vec3 color = mix(innerColor, outerColor, smoothstep(0.4, 1.0, rim));
          float breath = sin(uTime * 0.5) * 0.03 + 1.0;
          gl_FragColor = vec4(color * breath, intensity * 0.7);
        }
      `,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  // Aurora shader
  const auroraMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
        }
        void main() {
          float polar = 1.0 - smoothstep(0.0, 0.15, vUv.y) + smoothstep(0.85, 1.0, vUv.y);
          if (polar < 0.01) discard;
          float n = noise(vec2(vUv.x * 8.0 + uTime * 0.3, vUv.y * 4.0 + uTime * 0.1));
          float n2 = noise(vec2(vUv.x * 12.0 - uTime * 0.2, vUv.y * 6.0));
          float curtain = pow(n * n2 * polar, 1.5);
          vec3 color = mix(vec3(0.1, 0.9, 0.4), vec3(0.1, 0.7, 0.9), n);
          color = mix(color, vec3(0.5, 0.1, 0.8), n2 * 0.3);
          gl_FragColor = vec4(color, curtain * 0.2);
        }
      `,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  // Graticule shader
  const graticuleMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          float lat = vUv.y * 180.0 - 90.0;
          float lon = vUv.x * 360.0 - 180.0;
          // Grid lines every 15 degrees
          float latLine = 1.0 - smoothstep(0.3, 0.5, abs(mod(lat + 7.5, 15.0) - 7.5));
          float lonLine = 1.0 - smoothstep(0.3, 0.5, abs(mod(lon + 7.5, 15.0) - 7.5));
          // Equator and prime meridian slightly brighter
          float equator = 1.0 - smoothstep(0.2, 0.4, abs(lat));
          float prime = 1.0 - smoothstep(0.2, 0.4, abs(lon));
          float grid = max(latLine, lonLine) * 0.3;
          grid += max(equator, prime) * 0.2;
          if (grid < 0.01) discard;
          gl_FragColor = vec4(0.2, 0.7, 1.0, grid);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  // Country borders shader (approximated with noise-based continental edges)
  const bordersMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uDayMap;
        varying vec2 vUv;
        void main() {
          // Edge detection on day texture to approximate landmass outlines
          float step_x = 1.0 / 2048.0;
          float step_y = 1.0 / 1024.0;
          vec3 c = texture2D(uDayMap, vUv).rgb;
          vec3 r = texture2D(uDayMap, vUv + vec2(step_x * 2.0, 0.0)).rgb;
          vec3 u = texture2D(uDayMap, vUv + vec2(0.0, step_y * 2.0)).rgb;
          float edge = length(c - r) + length(c - u);
          edge = smoothstep(0.08, 0.2, edge);
          if (edge < 0.01) discard;
          gl_FragColor = vec4(0.0, 0.9, 0.7, edge * 0.4);
        }
      `,
      uniforms: { uDayMap: { value: dayMap } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [dayMap]);

  // Procedural cloud texture
  const cloudTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 1024, 512);
    const bands = [
      { y: 80, density: 0.12 },
      { y: 180, density: 0.08 },
      { y: 280, density: 0.06 },
      { y: 380, density: 0.1 },
      { y: 430, density: 0.07 },
    ];
    bands.forEach((band) => {
      for (let i = 0; i < 25; i++) {
        const x = Math.random() * 1024;
        const y = band.y + (Math.random() - 0.5) * 60;
        const w = 40 + Math.random() * 80;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, w);
        grad.addColorStop(0, `rgba(255,255,255,${band.density})`);
        grad.addColorStop(0.4, `rgba(255,255,255,${band.density * 0.5})`);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(x - w, y - w, w * 2, w * 2);
      }
    });
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  // Determine overlay mode from active layers
  const getOverlayMode = (): number | null => {
    if (activeLayers.has("infrared")) return 0;
    if (activeLayers.has("vegetation")) return 1;
    if (activeLayers.has("seaTemp")) return 2;
    if (activeLayers.has("waterVapor")) return 3;
    if (activeLayers.has("precipitation")) return 4;
    if (activeLayers.has("terrain")) return 5;
    return null;
  };

  const overlayMode = getOverlayMode();

  useFrame((_, delta) => {
    const t = performance.now() * 0.001;
    // Removed base map rotation.
    // OrbitControls autoRotate already rotates the camera around the scene.
    // By keeping the meshes' rotation at 0, lat/lon coords match the texture statically.
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.004; // Clouds move slightly relative to Earth

    // Aurora has no texture mapping requirements, keeping a small visual shift
    if (auroraRef.current) auroraRef.current.rotation.y += delta * 0.002;

    atmosphereMaterial.uniforms.uTime.value = t;
    auroraMaterial.uniforms.uTime.value = t;

    const sunAngle = t * 0.015;
    nightMaterial.uniforms.uSunDir.value
      .set(Math.cos(sunAngle), 0.3, Math.sin(sunAngle))
      .normalize();

    // Update overlay mode
    if (overlayMode !== null) {
      overlayMaterial.uniforms.uMode.value = overlayMode;
      overlayMaterial.uniforms.uOpacity.value = 0.75;
    }
  });

  const showNight = activeLayers.has("nightLights");
  const showClouds = activeLayers.has("clouds");
  const showAurora = activeLayers.has("aurora");
  const showAtmosphere = activeLayers.has("atmosphere");
  const showGraticule = activeLayers.has("graticule");
  const showBorders = activeLayers.has("countryBorders");

  return (
    <group>
      {/* Main Earth */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 128, 128]} />
        <meshStandardMaterial
          map={dayMap}
          bumpMap={bumpMap}
          bumpScale={0.04}
          roughnessMap={specMap}
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>

      {/* False-color overlay */}
      {overlayMode !== null && (
        <mesh ref={overlayRef} scale={[1.001, 1.001, 1.001]}>
          <sphereGeometry args={[2, 64, 64]} />
          <primitive object={overlayMaterial} attach="material" />
        </mesh>
      )}

      {/* Night city lights */}
      {showNight && (
        <mesh ref={nightRef} scale={[1.0015, 1.0015, 1.0015]}>
          <sphereGeometry args={[2, 64, 64]} />
          <primitive object={nightMaterial} attach="material" />
        </mesh>
      )}

      {/* Cloud layer */}
      {showClouds && (
        <mesh ref={cloudsRef} scale={[1.005, 1.005, 1.005]}>
          <sphereGeometry args={[2, 48, 48]} />
          <meshBasicMaterial
            map={cloudTexture}
            transparent
            opacity={0.45}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Graticule grid */}
      {showGraticule && (
        <mesh ref={graticuleRef} scale={[1.002, 1.002, 1.002]}>
          <sphereGeometry args={[2, 64, 64]} />
          <primitive object={graticuleMaterial} attach="material" />
        </mesh>
      )}

      {/* Country borders */}
      {showBorders && (
        <mesh scale={[1.003, 1.003, 1.003]}>
          <sphereGeometry args={[2, 64, 64]} />
          <primitive object={bordersMaterial} attach="material" />
        </mesh>
      )}

      {/* Aurora */}
      {showAurora && (
        <mesh ref={auroraRef} scale={[1.02, 1.02, 1.02]}>
          <sphereGeometry args={[2, 64, 64]} />
          <primitive object={auroraMaterial} attach="material" />
        </mesh>
      )}

      {/* Atmosphere glow */}
      {showAtmosphere && (
        <>
          <mesh scale={[1.05, 1.05, 1.05]} material={atmosphereMaterial}>
            <sphereGeometry args={[2, 64, 64]} />
          </mesh>
          <mesh scale={[1.12, 1.12, 1.12]}>
            <sphereGeometry args={[2, 32, 32]} />
            <meshBasicMaterial
              color="#1a5a90"
              transparent
              opacity={0.02}
              side={THREE.BackSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </>
      )}
    </group>
  );
}
