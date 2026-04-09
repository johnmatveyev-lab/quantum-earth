

# Add FPS Counter Overlay

Add a real-time FPS counter to the globe scene using Three.js's built-in clock delta timing, displayed as a small HUD element.

## Implementation

**New file: `src/components/ui/FPSCounter.tsx`**
- Use `useFrame` from `@react-three/fiber` to calculate FPS from delta time each frame
- Render as an HTML overlay (not a 3D element) using `useEffect` + state updates throttled to ~4 updates/sec to avoid re-render overhead
- Style as a small monospace badge in the top-right corner matching the existing HUD aesthetic (glass-panel style)
- Replace the hardcoded "60 FPS" in `StatsBar.tsx` with the actual live FPS value

**Changes to `src/components/Globe/GlobeScene.tsx`**
- Add a small `<FPSCounter />` component inside the Canvas that uses `useFrame` to track delta, and communicates the value out via a zustand store atom or a simple ref + external component

**Changes to `src/components/ui/StatsBar.tsx`**
- Wire the live FPS value into the existing FPS display (currently hardcoded to `60`)

