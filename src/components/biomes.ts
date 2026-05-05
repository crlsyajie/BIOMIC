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
    key: 'sakura',
    name: 'Hanami Sakura',
    description: 'Delicate pink petals and dark cherry wood. A transient spring bloom.',
    treeColor: 0x3d2b1f,
    leafColor: 0xffb7c5,
    lRule: 'F -> F[+F][-F]F',
    lAxiom: 'F',
    maxIter: 2,
    branchLimit: 15,
    spread: 0.6
  },
  9: {
    key: 'monsoon',
    name: 'Emerald Monsoon',
    description: 'Deep rainforest greens and broad, rain-slicked foliage.',
    treeColor: 0x1a2e1a,
    leafColor: 0x27ae60,
    lRule: 'F -> F[+F-F]-F[+F]',
    lAxiom: 'F',
    maxIter: 2,
    branchLimit: 12,
    spread: 0.7
  },
  8: {
    key: 'autumn',
    name: 'Autumn Foliage',
    description: 'Fiery maples and golden oaks. The season of transition.',
    treeColor: 0x5a3d2b,
    leafColor: 0xd35400,
    lRule: 'F -> FF[+F][-F]',
    lAxiom: 'F',
    maxIter: 3,
    branchLimit: 18,
    spread: 0.5
  },
  7: {
    key: 'cactus',
    name: 'Sonoran Bloom',
    description: 'Resilient desert giants and vivid succulent blossoms.',
    treeColor: 0x2e8b57,
    leafColor: 0xff69b4,
    lRule: 'F -> FF+[+F-F]',
    lAxiom: 'F',
    maxIter: 2,
    branchLimit: 8,
    spread: 0.3
  },
  6: {
    key: 'meadow',
    name: 'Alpine Meadow',
    description: 'Swaying daisies and mountain lupines under a spring sun.',
    treeColor: 0x228b22,
    leafColor: 0xffffff,
    lRule: 'F -> F[+F]F',
    lAxiom: 'F',
    maxIter: 3,
    branchLimit: 25,
    spread: 0.4
  },
  5: {
    key: 'winter',
    name: 'Winter Frost',
    description: 'Crystalline structures and hardy arctic mosses.',
    treeColor: 0x8a9597,
    leafColor: 0xffffff,
    lRule: 'F -> F[+F]F[-F]',
    lAxiom: 'F',
    maxIter: 2,
    branchLimit: 15,
    spread: 0.5
  },
  4: {
    key: 'lavender',
    name: 'Provence Lavender',
    description: 'Scented purple stalks and dancing summer butterflies.',
    treeColor: 0x483d8b,
    leafColor: 0x9370db,
    lRule: 'F -> F[-F][+F]F',
    lAxiom: 'F',
    maxIter: 3,
    branchLimit: 20,
    spread: 0.3
  },
  3: {
    key: 'deepsea',
    name: 'Bioluminescent Kelp',
    description: 'Glow-tipped corals and rhythmic underwater currents.',
    treeColor: 0x000080,
    leafColor: 0x00ffff,
    lRule: 'F -> F[-F][+F]',
    lAxiom: 'F',
    maxIter: 3,
    branchLimit: 30,
    spread: 0.9
  },
  2: {
    key: 'mushroom',
    name: 'Black Forest Fungi',
    description: 'Glowing caps and ancient wood-texture growth.',
    treeColor: 0x3d2b1f,
    leafColor: 0xff0000,
    lRule: 'F -> F[-F]F[+F]',
    lAxiom: 'F',
    maxIter: 2,
    branchLimit: 20,
    spread: 0.7
  },
  1: {
    key: 'zenith',
    name: 'Supernova Finale',
    description: 'The golden zenith. Ethereal light and cosmic stardust.',
    treeColor: 0xffd700,
    leafColor: 0xffe066,
    lRule: 'F -> F[+F][-F]F[+F][-F]',
    lAxiom: 'F',
    maxIter: 2,
    branchLimit: 40,
    spread: 1.0
  }
};
