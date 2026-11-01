import type { ElementType, Rarity, Stage } from '../types';

export interface ElementInfo {
  id: ElementType;
  name: string;
  /** habitat gradient for cards and profile backdrops */
  sky: [string, string];
  color: string;
  glow: string;
  particle: string;
}

export const ELEMENTS: Record<ElementType, ElementInfo> = {
  fire:     { id: 'fire',     name: 'Fire',     sky: ['#ffd9a8', '#ff8a5c'], color: '#f2542d', glow: '#ffb347', particle: '#ffcf4a' },
  water:    { id: 'water',    name: 'Water',    sky: ['#c4ecff', '#5ab8f0'], color: '#2b8fd6', glow: '#7fd6ff', particle: '#bdf0ff' },
  nature:   { id: 'nature',   name: 'Nature',   sky: ['#dcf7c4', '#7fcf6a'], color: '#3e9d3a', glow: '#a8f07a', particle: '#e3ff9e' },
  electric: { id: 'electric', name: 'Electric', sky: ['#fff4b0', '#ffd23f'], color: '#e0a400', glow: '#fff36b', particle: '#fffbcc' },
  ice:      { id: 'ice',      name: 'Ice',      sky: ['#eefbff', '#a9def5'], color: '#3fa7c9', glow: '#d6f6ff', particle: '#ffffff' },
  earth:    { id: 'earth',    name: 'Earth',    sky: ['#f4e3c8', '#c99a66'], color: '#9a6431', glow: '#e9c48c', particle: '#f2d6a2' },
  shadow:   { id: 'shadow',   name: 'Shadow',   sky: ['#b9a6e8', '#4b3a86'], color: '#5b3fa8', glow: '#b48bff', particle: '#d9c4ff' },
  light:    { id: 'light',    name: 'Light',    sky: ['#fffbe8', '#ffe7a3'], color: '#e8a91c', glow: '#fff6c4', particle: '#fffdf0' },
  cosmic:   { id: 'cosmic',   name: 'Cosmic',   sky: ['#5a3f9e', '#1d1b4f'], color: '#7d5cff', glow: '#ff8ef5', particle: '#ffffff' },
  air:      { id: 'air',      name: 'Air',      sky: ['#f0fbff', '#bfe3f7'], color: '#56a9c9', glow: '#e4f7ff', particle: '#ffffff' },
};

export const ELEMENT_ORDER: ElementType[] = ['fire', 'water', 'nature', 'electric', 'ice', 'earth', 'shadow', 'light', 'cosmic', 'air'];

export interface RarityInfo { id: Rarity; name: string; color: string; stars: number }

export const RARITIES: Record<Rarity, RarityInfo> = {
  common:    { id: 'common',    name: 'Common',    color: '#8a94a6', stars: 1 },
  uncommon:  { id: 'uncommon',  name: 'Uncommon',  color: '#36b37e', stars: 2 },
  rare:      { id: 'rare',      name: 'Rare',      color: '#2f80ed', stars: 3 },
  epic:      { id: 'epic',      name: 'Epic',      color: '#9b51e0', stars: 4 },
  legendary: { id: 'legendary', name: 'Legendary', color: '#f2a20c', stars: 5 },
};

export const STAGE_NAMES: Record<Stage, string> = {
  1: 'Baby',
  2: 'Young',
  3: 'Evolved',
  4: 'Advanced',
  5: 'Legendary Form',
};
