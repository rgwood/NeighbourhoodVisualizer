import type { VisualizerParameters } from '../models/VisualizerParameters';

export interface CalculatedStatistics {
  bldgArea: number;
  yardRatio: number;
  parkRatio: number;
  sidewalkRatio: number;
  roadRatio: number;
  buildingRatio: number;
  floorSpaceIn1SqKm: number;
  lotsIn1SqKm: number;
}

export function calculateStatistics(params: VisualizerParameters): CalculatedStatistics {
  const maxNumOfAdjacentLots = getMaxNumOfAdjacentLots(params);
  const singleBlockAreaByLandUse = calculateBlockAreaByLandUse(params);

  const totalFloorSpaceInBlockInSqM = singleBlockAreaByLandUse.builtLandAreaInSqm * params.storeys;

  // look at X blocks, one of which might be a park
  let numOfBlocks = params.oneParkPerThisManyHousingBlocks;
  let numOfParkBlocks = params.includeParks ? 1 : 0;
  let numOfHousingBlocks = numOfBlocks - numOfParkBlocks;

  let floorSpaceInSqM = totalFloorSpaceInBlockInSqM * numOfHousingBlocks;
  let roadAreaInSqM = singleBlockAreaByLandUse.roadAreaInSqM * numOfHousingBlocks;
  let yardAreaInSqM = singleBlockAreaByLandUse.yardAreaInSqm * numOfHousingBlocks;
  let buildingAreaInSqM = singleBlockAreaByLandUse.builtLandAreaInSqm * numOfHousingBlocks;
  let sidewalkAreaInSqM = singleBlockAreaByLandUse.sidewalkAreaInSqM * numOfBlocks;

  let lotsInBlock = getNumberOfLotsPerBlock(params);
  let blockWidthInM = calculateBlockWidthInM(params);
  let blockDepthInM = calculateBlockDepthInM(params);

  let parkWidthInM = maxNumOfAdjacentLots * params.lotWidthInM;
  let parkDepthInM = params.lotDepthInM + params.lanewayWidthInM + params.lotDepthInM;
  let parkAreaInSqM = parkWidthInM * parkDepthInM * numOfParkBlocks;
  // add roads next to park
  roadAreaInSqM += numOfParkBlocks * ((blockDepthInM * params.roadWidthInM) + ((2 * params.sidewalkWidthInM + maxNumOfAdjacentLots * params.lotWidthInM) * params.roadWidthInM));

  let expectedTotalAreaInSqM = numOfBlocks * blockDepthInM * blockWidthInM;
  let calculatedTotalAreaInSqM = roadAreaInSqM + yardAreaInSqM + buildingAreaInSqM + parkAreaInSqM + sidewalkAreaInSqM;

  // Validate calculation
  if (Math.abs(expectedTotalAreaInSqM - calculatedTotalAreaInSqM) > 0.01) {
    throw new Error(`ALERT ALERT. expectedArea=${expectedTotalAreaInSqM}, calculatedArea=${calculatedTotalAreaInSqM}`);
  }

  const bldgArea = calculateLandAreaUnder1BuildingInSqM(params);

  const yardRatio = yardAreaInSqM / calculatedTotalAreaInSqM;
  const roadRatio = roadAreaInSqM / calculatedTotalAreaInSqM;
  const parkRatio = parkAreaInSqM / calculatedTotalAreaInSqM;
  const sidewalkRatio = sidewalkAreaInSqM / calculatedTotalAreaInSqM;
  const buildingRatio = buildingAreaInSqM / calculatedTotalAreaInSqM;

  // scale block to 1km
  const floorSpaceIn1SqKm = (1000000 / calculatedTotalAreaInSqM) * floorSpaceInSqM;
  const lotsIn1SqKm = (1000000 / calculatedTotalAreaInSqM) * lotsInBlock * (numOfBlocks - numOfParkBlocks);

  return {
    bldgArea,
    yardRatio,
    parkRatio,
    sidewalkRatio,
    roadRatio,
    buildingRatio,
    floorSpaceIn1SqKm,
    lotsIn1SqKm
  };
}

function getNumberOfLotsPerBlock(params: VisualizerParameters) {
  let maxNumOfAdjacentLots = getMaxNumOfAdjacentLots(params);
  return 2 * maxNumOfAdjacentLots; // a row of houses on each side of the laneway
}

function getMaxNumOfAdjacentLots(params: VisualizerParameters) {
  return Math.floor(params.maxBlockLengthInM / params.lotWidthInM);
}

function calculateBlockAreaByLandUse(params: VisualizerParameters) {
  const lotsPerBlock = getNumberOfLotsPerBlock(params);
  const blockAreaRoadsOnlyInSqM = calculateBlockAreaRoadsOnlyInSqM(params);
  const blockAreaPrivateLandOnlyInSqM = lotsPerBlock * params.lotDepthInM * params.lotWidthInM;
  const blockAreaSidewalkOnlyInSqM = calculateBlockAreaSidewalkOnlyInSqM(params, blockAreaPrivateLandOnlyInSqM);
  const blockAreaLandWithBuildingsOnItInSqM = lotsPerBlock * calculateLandAreaUnder1BuildingInSqM(params);
  const blockAreaYardsOnlyInSqM = blockAreaPrivateLandOnlyInSqM - blockAreaLandWithBuildingsOnItInSqM;

  return {
    roadAreaInSqM: blockAreaRoadsOnlyInSqM,
    yardAreaInSqm: blockAreaYardsOnlyInSqM,
    builtLandAreaInSqm: blockAreaLandWithBuildingsOnItInSqM,
    sidewalkAreaInSqM: blockAreaSidewalkOnlyInSqM
  };
}

function calculateLandAreaUnder1BuildingInSqM(params: VisualizerParameters) {
  const bldgDepthInM = calculateBldgDepth(params.lotDepthInM, params.frontYardPercent, params.backYardPercent);
  const bldgWidthInM = calculateBldgWidth(params.lotWidthInM, params.sideYardPercent);
  return bldgDepthInM * bldgWidthInM;
}

function calculateBlockAreaSidewalkOnlyInSqM(params: VisualizerParameters, blockAreaPrivateLandOnlyInSqM: number) {
  let maxNumOfAdjacentLots = getMaxNumOfAdjacentLots(params);
  const blockWidth = (params.sidewalkWidthInM + maxNumOfAdjacentLots * params.lotWidthInM + params.sidewalkWidthInM);
  const blockHeight = (2 * params.sidewalkWidthInM + 2 * params.lotDepthInM + params.lanewayWidthInM);
  const totalBlockArea = blockWidth * blockHeight; // whole block from sidewalks inward
  const lanewayArea = (maxNumOfAdjacentLots * params.lotWidthInM) * params.lanewayWidthInM;
  return totalBlockArea - blockAreaPrivateLandOnlyInSqM - lanewayArea;
}

function calculateBlockAreaRoadsOnlyInSqM(params: VisualizerParameters) {
  let maxNumOfAdjacentLots = getMaxNumOfAdjacentLots(params);
  return (calculateBlockDepthInM(params) * params.roadWidthInM) +
    (maxNumOfAdjacentLots * params.lotWidthInM + 2 * params.sidewalkWidthInM) * params.roadWidthInM +
    (maxNumOfAdjacentLots * params.lotWidthInM) * params.lanewayWidthInM;
}

function calculateBlockDepthInM(params: VisualizerParameters) {
  let result = params.roadWidthInM;
  result += params.lotDepthInM + params.lanewayWidthInM + params.lotDepthInM + 2 * params.sidewalkWidthInM;
  return result;
}

function calculateBlockWidthInM(params: VisualizerParameters) {
  let result = params.roadWidthInM;
  result += getMaxNumOfAdjacentLots(params) * params.lotWidthInM;
  result += 2 * params.sidewalkWidthInM;
  return result;
}

export function calculateBldgDepth(lotDepth: number, frontYardPercent: number, backYardPercent: number): number {
  return Math.max(0, lotDepth * (100 - frontYardPercent - backYardPercent) / 100);
}

export function calculateBldgWidth(lotWidth: number, sideYardPercent: number): number {
  return Math.max(0, lotWidth * (100 - 2 * sideYardPercent) / 100);
}
