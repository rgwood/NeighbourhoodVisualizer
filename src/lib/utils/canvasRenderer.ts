import type { VisualizerParameters } from '../models/VisualizerParameters';
import {
  getBuildingColour, getYardColour, getRoadColour, getParkColour, getSidewalkColour,
  getBuildingShadowColour, getCenterLineColour, getRoadMarkingColour, getCrosswalkColour,
  MaxBuildingsToDraw
} from '../constants';
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

  // Draw road markings on top of road background
  drawRoadMarkings(
    ctx,
    canvas,
    roadDrawWidth,
    blockDrawLength,
    blockDrawHeight,
    sidewalkDrawWidth,
    blocksThatFitVerticallyInCanvas,
    blocksThatFitHorizontallyIntoCanvas
  );

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
        drawBlockOfBuildings(ctx, params, roadDrawWidth, buildingsPerBlockOnSingleStreet, lotDrawWidth, lotDrawDepth, lanewayDrawWidth, sidewalkDrawWidth);
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
  // Base park color
  ctx.fillStyle = getParkColour();
  ctx.fillRect(0, 0, blockDrawLength, blockDrawHeight);

  // Add grass texture
  drawGrassTexture(ctx, blockDrawLength, blockDrawHeight);
}

function drawGrassTexture(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save();

  // Add subtle darker patches for texture
  ctx.fillStyle = 'rgba(30, 100, 30, 0.12)';
  const patchSize = Math.min(width, height) * 0.06;

  for (let x = 0; x < width; x += patchSize * 2.5) {
    for (let y = 0; y < height; y += patchSize * 2.5) {
      const offsetX = ((x * 7 + y * 11) % 10) * (patchSize * 0.1);
      const offsetY = ((x * 13 + y * 3) % 10) * (patchSize * 0.1);
      ctx.fillRect(x + offsetX, y + offsetY, patchSize, patchSize * 0.6);
    }
  }

  ctx.restore();
}

function drawYardTexture(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  ctx.save();

  // Very subtle grass-like pattern
  ctx.fillStyle = 'rgba(100, 140, 80, 0.08)';
  const dotSpacing = Math.min(width, height) * 0.2;

  for (let dx = 0; dx < width; dx += dotSpacing) {
    for (let dy = 0; dy < height; dy += dotSpacing) {
      const offsetX = ((dx * 7 + dy * 11) % 5) * (dotSpacing * 0.1);
      const offsetY = ((dx * 13 + dy * 3) % 5) * (dotSpacing * 0.1);
      const size = dotSpacing * 0.25;
      ctx.fillRect(x + dx + offsetX, y + dy + offsetY, size, size);
    }
  }

  ctx.restore();
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

function drawRoadMarkings(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  roadDrawWidth: number,
  blockDrawLength: number,
  blockDrawHeight: number,
  sidewalkDrawWidth: number,
  blocksThatFitVerticallyInCanvas: number,
  blocksThatFitHorizontallyIntoCanvas: number
): void {
  ctx.save();

  const totalBlockWidth = blockDrawLength + 2 * sidewalkDrawWidth;
  const totalBlockHeight = blockDrawHeight + 2 * sidewalkDrawWidth;

  // Draw horizontal road center lines
  ctx.strokeStyle = getCenterLineColour();
  ctx.lineWidth = Math.max(1.5, roadDrawWidth * 0.035);
  ctx.setLineDash([roadDrawWidth * 0.4, roadDrawWidth * 0.25]);

  for (let i = 0; i <= blocksThatFitVerticallyInCanvas; i++) {
    const roadY = i * (totalBlockHeight + roadDrawWidth) + roadDrawWidth / 2;
    ctx.beginPath();
    ctx.moveTo(0, roadY);
    ctx.lineTo(canvas.width, roadY);
    ctx.stroke();
  }

  // Draw vertical road center lines
  for (let j = 0; j <= blocksThatFitHorizontallyIntoCanvas; j++) {
    const roadX = j * (totalBlockWidth + roadDrawWidth) + roadDrawWidth / 2;
    ctx.beginPath();
    ctx.moveTo(roadX, 0);
    ctx.lineTo(roadX, canvas.height);
    ctx.stroke();
  }

  // Draw lane edge markings (solid white lines)
  ctx.strokeStyle = getRoadMarkingColour();
  ctx.lineWidth = Math.max(0.8, roadDrawWidth * 0.02);
  ctx.setLineDash([]);

  const edgeOffset = roadDrawWidth * 0.15;

  ctx.restore();
}

function drawBlockOfBuildings(ctx: CanvasRenderingContext2D, params: VisualizerParameters, roadDrawWidth: number, buildingsPerBlockOnSingleStreet: number, lotDrawWidth: number,
  lotDrawDepth: number, lanewayDrawWidth: number, sidewalkDrawWidth: number) {
  ctx.save();
  drawRowOfBuildings(ctx, params, roadDrawWidth, buildingsPerBlockOnSingleStreet, lotDrawWidth, lotDrawDepth, true);
  ctx.restore();

  drawLaneway(ctx, lotDrawDepth, lotDrawWidth, buildingsPerBlockOnSingleStreet, lanewayDrawWidth, sidewalkDrawWidth);

  ctx.save();

  ctx.translate(0, lotDrawDepth + lanewayDrawWidth);
  drawRowOfBuildings(ctx, params, roadDrawWidth, buildingsPerBlockOnSingleStreet, lotDrawWidth, lotDrawDepth, false);
  ctx.restore();
}

function drawLaneway(ctx: CanvasRenderingContext2D, lotDrawDepth: number, lotDrawWidth: number, buildingsPerBlockOnSingleStreet: number, lanewayDrawWidth: number, sidewalkDrawWidth: number) {
  ctx.save();
  ctx.fillStyle = getRoadColour();
  ctx.translate(-sidewalkDrawWidth, lotDrawDepth);
  // Extend through sidewalks on both sides to connect to roads
  ctx.fillRect(0, 0, lotDrawWidth * buildingsPerBlockOnSingleStreet + 2 * sidewalkDrawWidth, lanewayDrawWidth);
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

  // Lot outline
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.strokeRect(0, 0, lotDrawWidth, lotDrawDepth);

  // Yard (grass) fill
  ctx.fillStyle = getYardColour();
  ctx.fillRect(1, 1, lotDrawWidth - 2, lotDrawDepth - 2);

  // Subtle yard grass texture
  drawYardTexture(ctx, 1, 1, lotDrawWidth - 2, lotDrawDepth - 2);

  const bldgDrawDepth = calculateBldgDepth(lotDrawDepth, params.frontYardPercent, params.backYardPercent);
  const bldgDrawWidth = calculateBldgWidth(lotDrawWidth, params.sideYardPercent);

  const frontYardDrawDepth = lotDrawDepth * params.frontYardPercent / 100;
  const sideyardDrawDepth = lotDrawWidth * params.sideYardPercent / 100;

  // Shadow (offset to bottom-right, sun from upper-left)
  const shadowOffset = Math.min(bldgDrawWidth, bldgDrawDepth) * 0.08;
  ctx.fillStyle = getBuildingShadowColour();
  ctx.fillRect(
    sideyardDrawDepth + shadowOffset,
    frontYardDrawDepth + shadowOffset,
    bldgDrawWidth,
    bldgDrawDepth
  );

  // Building
  ctx.fillStyle = getBuildingColour();
  ctx.fillRect(sideyardDrawDepth, frontYardDrawDepth, bldgDrawWidth, bldgDrawDepth);

  // Subtle roofline detail (inner edge)
  const roofInset = Math.min(bldgDrawWidth, bldgDrawDepth) * 0.1;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.strokeRect(
    sideyardDrawDepth + roofInset,
    frontYardDrawDepth + roofInset,
    bldgDrawWidth - 2 * roofInset,
    bldgDrawDepth - 2 * roofInset
  );

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
