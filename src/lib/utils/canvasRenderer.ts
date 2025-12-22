import type { VisualizerParameters } from '../models/VisualizerParameters';
import { getBuildingColour, getYardColour, getRoadColour, getParkColour, getSidewalkColour, MaxBuildingsToDraw } from '../constants';
import { calculateBldgDepth, calculateBldgWidth } from './statisticsCalculator';

export function drawCanvas(canvas: HTMLCanvasElement, params: VisualizerParameters): void {
  const ctx = canvas.getContext('2d')!;
  let buildingsPerBlockOnSingleStreet = getMaxNumOfAdjacentLots(params);
  let blockLengthInM = buildingsPerBlockOnSingleStreet * params.lotWidthInM;

  ctx.save();

  clearCanvas(canvas);

  drawBackground(ctx, canvas);

  let ctxPerspectiveCanvasHeight, ctxPerspectiveCanvasWidth;

  ctxPerspectiveCanvasHeight = canvas.height;
  ctxPerspectiveCanvasWidth = canvas.width;

  let lotDrawDepth = scaleRealUnitForCanvas(params.lotDepthInM, ctxPerspectiveCanvasHeight);
  let lotDrawWidth = scaleRealUnitForCanvas(params.lotWidthInM, ctxPerspectiveCanvasHeight);
  let roadDrawWidth = scaleRealUnitForCanvas(params.roadWidthInM, ctxPerspectiveCanvasHeight);
  let lanewayDrawWidth = scaleRealUnitForCanvas(params.lanewayWidthInM, ctxPerspectiveCanvasHeight);
  let sidewalkDrawWidth = scaleRealUnitForCanvas(params.sidewalkWidthInM, ctxPerspectiveCanvasHeight);
  let blockDrawLength = scaleRealUnitForCanvas(blockLengthInM, ctxPerspectiveCanvasHeight);

  let blockDrawHeight = lotDrawDepth + lanewayDrawWidth + lotDrawDepth;
  let blocksThatFitVerticallyInCanvas = Math.ceil(ctxPerspectiveCanvasHeight / (blockDrawHeight + roadDrawWidth));
  // doesn't include road width but that's OK, we just need a loose upper bound to avoid doing tooo much work
  let blocksThatFitHorizontallyIntoCanvas = Math.ceil(ctxPerspectiveCanvasWidth / (blockDrawLength));

  throwErrorIfAboutToDrawTooManyBuildings(blocksThatFitVerticallyInCanvas, blocksThatFitHorizontallyIntoCanvas, buildingsPerBlockOnSingleStreet);

  for (let i = 0; i < blocksThatFitVerticallyInCanvas; i++) {
    ctx.translate(0, roadDrawWidth);

    ctx.save();
    for (let currentBlock = 1; currentBlock <= blocksThatFitHorizontallyIntoCanvas; currentBlock++) {
      ctx.translate(roadDrawWidth, 0);

      ctx.save();

      drawSidewalks(ctx, sidewalkDrawWidth, blockDrawLength, blockDrawHeight);

      ctx.translate(sidewalkDrawWidth, sidewalkDrawWidth);

      if (params.includeParks && (currentBlock + i) % params.oneParkPerThisManyHousingBlocks === 0) {
        drawParkBlock(ctx, blockDrawLength, blockDrawHeight);
      } else {
        drawBlockOfBuildings(ctx, params, roadDrawWidth, buildingsPerBlockOnSingleStreet, lotDrawWidth, lotDrawDepth, lanewayDrawWidth);
      }

      ctx.restore();

      ctx.translate(blockDrawLength + sidewalkDrawWidth * 2, 0);

    }
    ctx.restore();

    ctx.translate(0, blockDrawHeight + 2 * sidewalkDrawWidth);
  }

  // clean up
  ctx.restore();
}

function clearCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawSidewalks(ctx: CanvasRenderingContext2D, sidewalkDrawWidth: number, blockDrawLength: number, blockDrawHeight: number) {
  ctx.fillStyle = getSidewalkColour();
  ctx.fillRect(0, 0, 2 * sidewalkDrawWidth + blockDrawLength, 2 * sidewalkDrawWidth + blockDrawHeight);
}

function drawParkBlock(ctx: CanvasRenderingContext2D, blockDrawLength: number, blockDrawHeight: number) {
  ctx.fillStyle = getParkColour();
  ctx.fillRect(0, 0, blockDrawLength, blockDrawHeight);
}

function throwErrorIfAboutToDrawTooManyBuildings(blocksThatFitVerticallyInCanvas: number, blocksThatFitHorizontallyIntoCanvas: number, buildingsPerBlockOnSingleStreet: number) {
  let expectedBuildingsToDraw = blocksThatFitVerticallyInCanvas * blocksThatFitHorizontallyIntoCanvas * buildingsPerBlockOnSingleStreet * 2;
  if (expectedBuildingsToDraw > MaxBuildingsToDraw) {
    throw new Error(`Not drawing canvas, too many buildings. Would draw ${expectedBuildingsToDraw}, the max is ${MaxBuildingsToDraw}. Params are probably bad`);
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  ctx.fillStyle = getRoadColour();
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawBlockOfBuildings(ctx: CanvasRenderingContext2D, params: VisualizerParameters, roadDrawWidth: number, buildingsPerBlockOnSingleStreet: number, lotDrawWidth: number,
  lotDrawDepth: number, lanewayDrawWidth: number) {
  ctx.save();
  drawRowOfBuildings(ctx, params, roadDrawWidth, buildingsPerBlockOnSingleStreet, lotDrawWidth, lotDrawDepth, true);
  ctx.restore();

  drawLaneway(ctx, lotDrawDepth, lotDrawWidth, buildingsPerBlockOnSingleStreet, lanewayDrawWidth);

  ctx.save();

  ctx.translate(0, lotDrawDepth + lanewayDrawWidth);
  drawRowOfBuildings(ctx, params, roadDrawWidth, buildingsPerBlockOnSingleStreet, lotDrawWidth, lotDrawDepth, false);
  ctx.restore();
}

function drawLaneway(ctx: CanvasRenderingContext2D, lotDrawDepth: number, lotDrawWidth: number, buildingsPerBlockOnSingleStreet: number, lanewayDrawWidth: number) {
  ctx.save();
  ctx.fillStyle = getRoadColour();
  ctx.translate(0, lotDrawDepth);
  ctx.fillRect(0, 0, lotDrawWidth * buildingsPerBlockOnSingleStreet, lanewayDrawWidth);
  ctx.restore();
}

function drawRowOfBuildings(ctx: CanvasRenderingContext2D, params: VisualizerParameters, roadDrawWidth: number, buildingsPerBlockOnSingleStreet: number, lotDrawWidth: number,
  lotDrawDepth: number, ctxIsAtRoad: boolean) {
  // draw a row of buildings
  for (let j = 0; j < buildingsPerBlockOnSingleStreet; j++) {
    drawBuilding(ctx, params, lotDrawWidth, lotDrawDepth, !ctxIsAtRoad);
    ctx.translate(lotDrawWidth, 0);
  }
}

function drawBuilding(ctx: CanvasRenderingContext2D, params: VisualizerParameters, lotDrawWidth: number, lotDrawDepth: number, flipVertically: boolean): void {
  ctx.save();

  if (flipVertically) {
    ctx.translate(lotDrawWidth, lotDrawDepth);
    ctx.rotate(degreesToRadians(180));
  }

  ctx.strokeRect(0, 0, lotDrawWidth, lotDrawDepth);

  ctx.fillStyle = getYardColour();
  ctx.fillRect(1, 1, lotDrawWidth - 2, lotDrawDepth - 2);

  const bldgDrawDepth = calculateBldgDepth(lotDrawDepth, params.frontYardPercent, params.backYardPercent);
  const bldgDrawWidth = calculateBldgWidth(lotDrawWidth, params.sideYardPercent);

  const frontYardDrawDepth = lotDrawDepth * params.frontYardPercent / 100;
  const sideyardDrawDepth = lotDrawWidth * params.sideYardPercent / 100;

  ctx.fillStyle = getBuildingColour();
  ctx.fillRect(sideyardDrawDepth,
    frontYardDrawDepth,
    bldgDrawWidth,
    bldgDrawDepth);

  ctx.restore();
}

function degreesToRadians(degrees: number) {
  return degrees * Math.PI / 180;
}

// Scale things so the defaults look good. Someday maybe we could determine this dynamically
function scaleRealUnitForCanvas(metres: number, currContextCanvasHeight: number): number {
  return metres * 2.07;
}

function getMaxNumOfAdjacentLots(params: VisualizerParameters) {
  return Math.floor(params.maxBlockLengthInM / params.lotWidthInM);
}
