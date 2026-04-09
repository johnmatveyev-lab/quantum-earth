import { Bloom, EffectComposer } from '@react-three/postprocessing';

export function BloomEffect() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={0.4}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.4}
        mipmapBlur
        radius={0.65}
      />
    </EffectComposer>
  );
}
