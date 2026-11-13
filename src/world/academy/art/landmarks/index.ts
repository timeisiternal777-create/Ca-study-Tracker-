import { countingHouse } from './countingHouse';
import { foundry } from './foundry';
import { mapTower } from './mapTower';
import { marketBridge } from './marketBridge';
import { orreryDome } from './orreryDome';
import { statuteHall } from './statuteHall';
import { titheBarn } from './titheBarn';
import { tollGate } from './tollGate';
import { vault } from './vault';
import { watchtower } from './watchtower';
import type { LandmarkDef, LandmarkId } from './types';

export type { Box, LandmarkDef, LandmarkId } from './types';
export const LANDMARKS: Record<LandmarkId, LandmarkDef> = {
  counting: countingHouse, statute: statuteHall, orrery: orreryDome, market: marketBridge, tithe: titheBarn,
  toll: tollGate, foundry, watch: watchtower, vault, maptower: mapTower,
};
