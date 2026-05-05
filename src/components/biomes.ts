export interface BiomeConfig {
  key: string;
  name: string;
  description: string;
  treeColor: number;
  leafColor: number;
  lRule: string;
  lAxiom: string;
  maxIter: number;
  branchLimit: number;
  spread: number;
}

export const BIOMES: Record<number, BiomeConfig> = {
  10: {
    key: 'volcanic',
    name: 'Volcanic Rift',
    description: 'Brimstone and obsidian. Life forged in fire.',
    treeColor: 0x222222,
    leafColor: 0xff4400,
    lRule: 'F -> F[+F][-F]F',
    lAxiom: 'F',
    maxIter: 2,
    branchLimit: 12,
    spread: 0.8
  },
  9: {
    key: 'autumn',
    name: 'Eternal Autumn',
    description: 'The golden decay. Rust-colored foliage and crisp air.',
    treeColor: 0x5a3d2b,
    leafColor: 0xd35400,
    lRule: 'F -> FF[+F][-F]',
    lAxiom: 'F',
    maxIter: 3,
    branchLimit: 15,
    spread: 0.5
  },
  8: {
    key: 'cyber',
    name: 'Cyber Grid',
    description: 'Neon pulses through chrome structures.',
    treeColor: 0xaaaaaa,
    leafColor: 0x00ffff,
    lRule: 'F -> F+F-F+F',
    lAxiom: 'F',
    maxIter: 2,
    branchLimit: 10,
    spread: 0.4
  },
  7: {
    key: 'meadow',
    name: 'Sylvan Meadow',
    description: 'Gentle swaying grasses and wild blooms.',
    treeColor: 0x27ae60,
    leafColor: 0xffffff,
    lRule: 'F -> F[+F]F',
    lAxiom: 'F',
    maxIter: 3,
    branchLimit: 20,
    spread: 0.3
  },
  6: {
    key: 'fungal',
    name: 'Mycelium Depth',
    description: 'The hidden network. Bioluminescent spore clusters.',
    treeColor: 0x4b0082,
    leafColor: 0xff00ff,
    lRule: 'F -> F[-F]F[+F]',
    lAxiom: 'F',
    maxIter: 2,
    branchLimit: 25,
    spread: 0.7
  },
  5: {
    key: 'rainforest',
    name: 'Jade Canopy',
    description: 'Thick vines and emerald monstera leaves.',
    treeColor: 0x013220,
    leafColor: 0x2ecc71,
    lRule: 'F -> F[+F-F]-F[+F]',
    lAxiom: 'F',
    maxIter: 2,
    branchLimit: 18,
    spread: 0.6
  },
  4: {
    key: 'desert',
    name: 'Glass Desert',
    description: 'Resilient cacti and sundrenched succulents.',
    treeColor: 0xc2b280,
    leafColor: 0xf1948a,
    lRule: 'F -> FF+[+F-F]',
    lAxiom: 'F',
    maxIter: 2,
    branchLimit: 8,
    spread: 0.4
  },
  3: {
    key: 'deepsea',
    name: 'Azure Abyss',
    description: 'Phosphorescent polyps and waving giant kelp.',
    treeColor: 0x000080,
    leafColor: 0xadd8e6,
    lRule: 'F -> F[-F][+F]',
    lAxiom: 'F',
    maxIter: 3,
    branchLimit: 30,
    spread: 0.9
  },
  2: {
    key: 'tundra',
    name: 'Glacial Bloom',
    description: 'Frost-tipped moss and crystalline geometry.',
    treeColor: 0xdcdde1,
    leafColor: 0xffffff,
    lRule: 'F -> F[+F]F[-F]',
    lAxiom: 'F',
    maxIter: 2,
    branchLimit: 12,
    spread: 0.5
  },
  1: {
    key: 'zenith',
    name: 'Golden Zenith',
    description: 'The apex. Liquid gold and ethereal radiance.',
    treeColor: 0xffd700,
    leafColor: 0xffffff,
    lRule: 'F -> F[+F][-F]F[+F][-F]',
    lAxiom: 'F',
    maxIter: 2,
    branchLimit: 40,
    spread: 1.0
  }
};
