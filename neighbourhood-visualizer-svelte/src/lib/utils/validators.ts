export interface InputConfig {
  lotWidth: number;
  lotDepth: number;
  frontYardPercent: number;
  sideYardPercent: number;
  backYardPercent: number;
  storeys: number;
  averageUnitSizeInSqM: number;
  roadWidthInM: number;
  sidewalkWidthInM: number;
  lanewayWidthInM: number;
  maxBlockLengthInM: number;
  includeParks: boolean;
  oneParkPerThisManyHousingBlocks: number;
}

export const DefaultInputConfig: InputConfig = {
  lotWidth: 10.1,
  lotDepth: 37.2,
  frontYardPercent: 20,
  sideYardPercent: 10,
  backYardPercent: 45,
  storeys: 3,
  averageUnitSizeInSqM: 100,
  roadWidthInM: 11,
  sidewalkWidthInM: 8,
  lanewayWidthInM: 6,
  maxBlockLengthInM: 100,
  includeParks: false,
  oneParkPerThisManyHousingBlocks: 4
};

export function validateNumberInput(value: string): boolean {
  return /^[0-9]+[.]?[0-9]*$/.test(value);
}

export function validateBlockLength(blockLength: number, lotWidth: number): boolean {
  return blockLength >= lotWidth;
}
