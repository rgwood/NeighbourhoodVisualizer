import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';

const BuildingColour = 'rgb(0, 82, 110)';
const YardColour = 'rgb(240, 240, 240)';
const RoadColour = 'rgb(84, 84, 84)';
const ParkColour = 'rgb(57,178,30)';
const SidewalkColour = 'rgb(209,209,209)';
const MaxBuildingsToDraw = 10000;

class VisualizerParameters {
  frontYardPercent: number;
  sideYardPercent: number;
  backYardPercent: number;
  lotDepthInM: number;
  lotWidthInM: number;
  storeys: number;
  roadWidthInM: number;
  lanewayWidthInM: number;
  sidewalkWidthInM: number;
  maxBlockLengthInM: number;
  includeParks: boolean;
  oneParkPerThisManyHousingBlocks: number;
}

class BlockAreaByLandUse {
  roadAreaInSqM: number; 
  yardAreaInSqm: number; 
  builtLandAreaInSqm: number; 
  sidewalkAreaInSqM: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit {
  inputForm: FormGroup;
  canvas: HTMLCanvasElement;
  bldgArea: number;
  yardRatio: number;
  parkRatio: number;
  sidewalkRatio: number;
  roadRatio: number;
  buildingRatio: number;
  floorSpaceIn1SqKm: number;
  lotsIn1SqKm: number;
  defaultInputConfig = {
    lotWidth: [10.1, [Validators.required, Validators.pattern('[0-9]+[.]?[0-9]*$')]], // <--- the FormControl called "lotWidth"
    lotDepth: [37.2, [Validators.required, Validators.pattern('[0-9]+[.]?[0-9]*$')]],
    frontYardPercent: 20,
    sideYardPercent: 10,
    backYardPercent: 45,
    storeys: [3, [Validators.required, Validators.min(0), Validators.max(50)]],
    averageUnitSizeInSqM: 100,
    roadWidthInM: [11, [Validators.required, Validators.min(0), Validators.max(30)]],
    sidewalkWidthInM: [8, [Validators.required, Validators.min(0), Validators.max(30)]],
    lanewayWidthInM: [6, [Validators.required, Validators.min(0), Validators.max(30)]],
    // If 1 more lot would put us over this length, we will not build it. If lot width > this, invalid.
    maxBlockLengthInM: [100, [Validators.required, Validators.min(1), Validators.max(300)]],
    includeParks: [false],
    oneParkPerThisManyHousingBlocks: [4, [Validators.min(2), Validators.max(20)]]
  };

  static degreesToRadians(degrees: number) {
    return degrees * Math.PI / 180;
  }

  // <--- inject FormBuilder. Love how TS automatically assigns instance variables from constructor params
  constructor(private fb: FormBuilder) {
  }

  resetForm() {
    this.canvas = document.getElementById('setbackCanvas') as HTMLCanvasElement;
    this.inputForm = this.fb.group(this.defaultInputConfig);
    this.inputForm.valueChanges.subscribe(val => {
      if (this.inputForm.valid) {
        this.calculateStatsAndDrawCanvas();
      }
    });

    this.calculateStatsAndDrawCanvas();
  }

  ngOnInit(): void {
    this.resetForm();
  }

  calculateStatsAndDrawCanvas(): void {
    let parameters = new VisualizerParameters();
    parameters.frontYardPercent = this.inputForm.get('frontYardPercent').value;
    parameters.sideYardPercent = this.inputForm.get('sideYardPercent').value;
    parameters.backYardPercent = this.inputForm.get('backYardPercent').value;
    parameters.lotDepthInM = Number(this.inputForm.get('lotDepth').value);
    parameters.lotWidthInM = Number(this.inputForm.get('lotWidth').value);
    parameters.storeys = this.inputForm.get('storeys').value;
    parameters.roadWidthInM = this.inputForm.get('roadWidthInM').value;
    parameters.lanewayWidthInM = this.inputForm.get('lanewayWidthInM').value;
    parameters.sidewalkWidthInM = this.inputForm.get('sidewalkWidthInM').value;
    parameters.maxBlockLengthInM = this.inputForm.get('maxBlockLengthInM').value;
    parameters.includeParks = this.inputForm.get('includeParks').value;
    parameters.oneParkPerThisManyHousingBlocks = this.inputForm.get('oneParkPerThisManyHousingBlocks').value;

    this.calculateStatistics(parameters);
    this.drawCanvas(parameters);
  }

  // todo: refactor this so it can be tested. What's the best way to return multiple values from a single method in TS?
  public calculateStatistics(params: VisualizerParameters): void {
    /*
    Lots of questions we want to answer like:
    what % is land/road/building?
    how much floor space total?
    what are the gross and net floor space ratios?
    how many dwelling units (assuming a specific size of unit?)

    Some of this we want to answers for a standard measure of area (1km^2)
    This is really simple: find the answer for a single block then normalize that to a square kilometre
    A single representative "block" is one that can be tiled to make a whole neighbourhood
    I'm doing this as: road on top and left, then the bottom right is 2 blocks of housing with laneway in between:
     __________________
    |  ________________
    | |  _ _ _ _ _ _  |
    | | | | | | | | | |
    | | |_|_|_|_|_|_| |
    |     _ _ _ _ _ _   
    | | | | | | | | | |
    | | |_|_|_|_|_|_| |
    | |_______________|
    
    */

    let singleBlockAreaByLandUse = this.calculateBlockAreaByLandUse(params);

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
    
    let maxNumOfAdjacentLots = this.getMaxNumOfAdjacentLots(params);
    let lotsInBlock = this.getNumberOfLotsPerBlock(params);
    let blockWidthInM = this.calculateBlockWidthInM(params);
    let blockDepthInM = this.calculateBlockDepthInM(params);
    
    let parkWidthInM = maxNumOfAdjacentLots * params.lotWidthInM;
    let parkDepthInM = params.lotDepthInM + params.lanewayWidthInM + params.lotDepthInM;
    let parkAreaInSqM = parkWidthInM * parkDepthInM * numOfParkBlocks;
    // add roads next to park
    roadAreaInSqM += numOfParkBlocks * ((blockDepthInM * params.roadWidthInM) + ((2 * params.sidewalkWidthInM + maxNumOfAdjacentLots * params.lotWidthInM) * params.roadWidthInM));

    let expectedTotalAreaInSqM = numOfBlocks * blockDepthInM * blockWidthInM;
    let calculatedTotalAreaInSqM = roadAreaInSqM + yardAreaInSqM + buildingAreaInSqM + parkAreaInSqM + sidewalkAreaInSqM;

    // todo: this should prolly be a unit test
    if (Math.abs(expectedTotalAreaInSqM - calculatedTotalAreaInSqM ) > 0.01) {
      throw new Error(`ALERT ALERT. expectedArea=${expectedTotalAreaInSqM}, calculatedArea=${calculatedTotalAreaInSqM}`);
    }

    this.bldgArea = this.calculateLandAreaUnder1BuildingInSqM(params);

    this.yardRatio = yardAreaInSqM / calculatedTotalAreaInSqM;
    this.roadRatio = roadAreaInSqM / calculatedTotalAreaInSqM;
    this.parkRatio = parkAreaInSqM / calculatedTotalAreaInSqM;
    this.sidewalkRatio = sidewalkAreaInSqM / calculatedTotalAreaInSqM;
    this.buildingRatio = buildingAreaInSqM / calculatedTotalAreaInSqM;

    // scale block to 1km
    this.floorSpaceIn1SqKm = (1000000 / calculatedTotalAreaInSqM) * floorSpaceInSqM;
    this.lotsIn1SqKm = (1000000 / calculatedTotalAreaInSqM) * lotsInBlock * (numOfBlocks - numOfParkBlocks);
  }

  private getNumberOfLotsPerBlock(params: VisualizerParameters) {
    let maxNumOfAdjacentLots = this.getMaxNumOfAdjacentLots(params);
    return 2 * maxNumOfAdjacentLots; // a row of houses on each side of the laneway
  }

  private getMaxNumOfAdjacentLots(params: VisualizerParameters) {
    return Math.floor(params.maxBlockLengthInM / params.lotWidthInM);
  }

  private calculateBlockAreaByLandUse(params: VisualizerParameters) {
    const lotsPerBlock = this.getNumberOfLotsPerBlock(params);
    const blockAreaRoadsOnlyInSqM = this.calculateBlockAreaRoadsOnlyInSqM(params);
    const blockAreaPrivateLandOnlyInSqM = lotsPerBlock * params.lotDepthInM * params.lotWidthInM;
    const blockAreaSidewalkOnlyInSqM = this.calculateBlockAreaSidewalkOnlyInSqM(params, blockAreaPrivateLandOnlyInSqM);
    const blockAreaLandWithBuildingsOnItInSqM = lotsPerBlock * this.calculateLandAreaUnder1BuildingInSqM(params);
    const blockAreaYardsOnlyInSqM = blockAreaPrivateLandOnlyInSqM - blockAreaLandWithBuildingsOnItInSqM;
    let blockArea = new BlockAreaByLandUse();
    blockArea.builtLandAreaInSqm = blockAreaLandWithBuildingsOnItInSqM;
    blockArea.roadAreaInSqM = blockAreaRoadsOnlyInSqM;
    blockArea.sidewalkAreaInSqM = blockAreaSidewalkOnlyInSqM;
    blockArea.yardAreaInSqm = blockAreaYardsOnlyInSqM;
    return blockArea;
  }

  private calculateLandAreaUnder1BuildingInSqM(params: VisualizerParameters) {
    const bldgDepthInM = this.calculateBldgDepth(params.lotDepthInM, params.frontYardPercent, params.backYardPercent);
    const bldgWidthInM = this.calculateBldgWidth(params.lotWidthInM, params.sideYardPercent);
    return bldgDepthInM * bldgWidthInM;
  }

  private calculateBlockAreaSidewalkOnlyInSqM(params: VisualizerParameters, blockAreaPrivateLandOnlyInSqM: number) {
    let maxNumOfAdjacentLots = this.getMaxNumOfAdjacentLots(params);
    const blockWidth = (params.sidewalkWidthInM + maxNumOfAdjacentLots * params.lotWidthInM + params.sidewalkWidthInM);
    const blockHeight = (2 * params.sidewalkWidthInM + 2 * params.lotDepthInM + params.lanewayWidthInM);
    const totalBlockArea = blockWidth * blockHeight; // whole block from sidewalks inward
    const lanewayArea = (maxNumOfAdjacentLots * params.lotWidthInM) * params.lanewayWidthInM;
    return totalBlockArea - blockAreaPrivateLandOnlyInSqM - lanewayArea; 
  }

  // assume sidewalk surrounds entire block, even at laneway entrance
  private calculateBlockAreaRoadsOnlyInSqM(params: VisualizerParameters) {
    let maxNumOfAdjacentLots = this.getMaxNumOfAdjacentLots(params);
    return (this.calculateBlockDepthInM(params) * params.roadWidthInM) +
      (maxNumOfAdjacentLots * params.lotWidthInM + 2 * params.sidewalkWidthInM) * params.roadWidthInM +
      (maxNumOfAdjacentLots * params.lotWidthInM) * params.lanewayWidthInM;
  }

  private calculateBlockDepthInM(params: VisualizerParameters) {
    let result = params.roadWidthInM;
    result += params.lotDepthInM + params.lanewayWidthInM + params.lotDepthInM + 2 * params.sidewalkWidthInM;
    return result;
  }

  private calculateBlockWidthInM(params: VisualizerParameters) {
    let result = params.roadWidthInM;
    result += this.getMaxNumOfAdjacentLots(params) * params.lotWidthInM;
    result += 2 * params.sidewalkWidthInM;
    return result;
  }

  drawCanvas(params: VisualizerParameters): void {
    // console.log(`canvas height:${this.canvas.height} width:${this.canvas.width}`);
    
    let buildingsPerBlockOnSingleStreet = Math.floor(params.maxBlockLengthInM / params.lotWidthInM);
    let blockLengthInM = buildingsPerBlockOnSingleStreet * params.lotWidthInM;
    const ctx = this.canvas.getContext('2d');
    ctx.save();

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawBackground(ctx);

    let ctxPerspectiveCanvasHeight, ctxPerspectiveCanvasWidth;

    ctxPerspectiveCanvasHeight = this.canvas.height;
    ctxPerspectiveCanvasWidth = this.canvas.width;

    let lotDrawDepth = this.scaleRealUnitForCanvas(params.lotDepthInM, ctxPerspectiveCanvasHeight);
    let lotDrawWidth = this.scaleRealUnitForCanvas(params.lotWidthInM, ctxPerspectiveCanvasHeight);
    let roadDrawWidth = this.scaleRealUnitForCanvas(params.roadWidthInM, ctxPerspectiveCanvasHeight);
    let lanewayDrawWidth = this.scaleRealUnitForCanvas(params.lanewayWidthInM, ctxPerspectiveCanvasHeight);
    let sidewalkDrawWidth = this.scaleRealUnitForCanvas(params.sidewalkWidthInM, ctxPerspectiveCanvasHeight);
    let blockDrawLength = this.scaleRealUnitForCanvas(blockLengthInM, ctxPerspectiveCanvasHeight);

    // if (lotDrawWidth > ctxPerspectiveCanvasWidth) {
    //   const scalingFactor = ctxPerspectiveCanvasWidth / lotDrawWidth;
    //   lotDrawDepth *= scalingFactor;
    //   lotDrawWidth *= scalingFactor;
    // }

    let blockDrawHeight = lotDrawDepth + lanewayDrawWidth + lotDrawDepth;
    let blocksThatFitVerticallyInCanvas = Math.ceil(ctxPerspectiveCanvasHeight / (blockDrawHeight + roadDrawWidth));
    // doesn't include road width but that's OK, we just need a loose upper bound to avoid doing tooo much work
    // let buildingsThatFitHorizontallyInCanvas = Math.ceil(ctxPerspectiveCanvasWidth / lotDrawWidth);
    // upper bound to avoid doing tooo much work
    let blocksThatFitHorizontallyIntoCanvas = Math.ceil(ctxPerspectiveCanvasWidth / (blockDrawLength));

    this.throwErrorIfAboutToDrawTooManyBuildings(blocksThatFitVerticallyInCanvas, blocksThatFitHorizontallyIntoCanvas, buildingsPerBlockOnSingleStreet);

    for (let i = 0; i < blocksThatFitVerticallyInCanvas; i++) {
      ctx.translate(0, roadDrawWidth);

      ctx.save();
      for (let currentBlock = 1; currentBlock <= blocksThatFitHorizontallyIntoCanvas; currentBlock++) {
        ctx.translate(roadDrawWidth, 0);

        ctx.save();
        
        this.drawSidewalks(ctx, sidewalkDrawWidth, blockDrawLength, blockDrawHeight);

        ctx.translate(sidewalkDrawWidth, sidewalkDrawWidth);

        if (params.includeParks && (currentBlock + i) % params.oneParkPerThisManyHousingBlocks === 0) {
          this.drawParkBlock(ctx, blockDrawLength, blockDrawHeight);
        } else {
          this.drawBlockOfBuildings(ctx, params, roadDrawWidth, buildingsPerBlockOnSingleStreet, lotDrawWidth, lotDrawDepth, lanewayDrawWidth);
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

  private drawSidewalks(ctx: CanvasRenderingContext2D, sidewalkDrawWidth: number, blockDrawLength: number, blockDrawHeight: number) {
    ctx.fillStyle = SidewalkColour;
    ctx.fillRect(0, 0, 2 * sidewalkDrawWidth + blockDrawLength, 2 * sidewalkDrawWidth + blockDrawHeight);
  }

  private drawParkBlock(ctx: CanvasRenderingContext2D, blockDrawLength: number, blockDrawHeight: number) {
    ctx.fillStyle = ParkColour;
    ctx.fillRect(0, 0, blockDrawLength, blockDrawHeight);
  }

  private throwErrorIfAboutToDrawTooManyBuildings(blocksThatFitVerticallyInCanvas: number, blocksThatFitHorizontallyIntoCanvas: number, buildingsPerBlockOnSingleStreet: number) {
    let expectedBuildingsToDraw = blocksThatFitVerticallyInCanvas * blocksThatFitHorizontallyIntoCanvas * buildingsPerBlockOnSingleStreet * 2;
    if (expectedBuildingsToDraw > MaxBuildingsToDraw) {
      // todo: how do I throw a regular exception?
      // i.e. new Exception(`Not drawing canvas, too many inner loop iterations (${expectedInnerLoopIterations}) expected`)
      throw new DOMException();
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = RoadColour;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawBlockOfBuildings(ctx: CanvasRenderingContext2D, params: VisualizerParameters, roadDrawWidth: number, buildingsPerBlockOnSingleStreet: number, lotDrawWidth: number, 
    lotDrawDepth: number, lanewayDrawWidth: number) {
    ctx.save();
    this.drawRowOfBuildings(ctx, params, roadDrawWidth, buildingsPerBlockOnSingleStreet, lotDrawWidth, lotDrawDepth, true);
    ctx.restore();

    this.drawLaneway(ctx, lotDrawDepth, lotDrawWidth, buildingsPerBlockOnSingleStreet, lanewayDrawWidth);

    ctx.save();

    ctx.translate(0, lotDrawDepth + lanewayDrawWidth);
    this.drawRowOfBuildings(ctx, params, roadDrawWidth, buildingsPerBlockOnSingleStreet, lotDrawWidth, lotDrawDepth, false);
    ctx.restore();
  }

  private drawLaneway(ctx: CanvasRenderingContext2D, lotDrawDepth: number, lotDrawWidth: number, buildingsPerBlockOnSingleStreet: number, lanewayDrawWidth: number) {
    ctx.save();
    ctx.fillStyle = RoadColour;
    ctx.translate(0, lotDrawDepth);
    ctx.fillRect(0, 0, lotDrawWidth * buildingsPerBlockOnSingleStreet, lanewayDrawWidth);
    ctx.restore();
  }

  private drawRowOfBuildings(ctx: CanvasRenderingContext2D, params: VisualizerParameters, roadDrawWidth: number, buildingsPerBlockOnSingleStreet: number, lotDrawWidth: number,
    lotDrawDepth: number, ctxIsAtRoad: boolean) {
    let yOffsetFromBlockStart = 0;
    // draw a row of buildings
    for (let j = 0; j < buildingsPerBlockOnSingleStreet; j++) {
      this.drawBuilding(ctx, params, lotDrawWidth, lotDrawDepth, !ctxIsAtRoad);
      ctx.translate(lotDrawWidth, 0);
    }
  }

  drawBuilding(ctx: CanvasRenderingContext2D, params: VisualizerParameters, lotDrawWidth: number, lotDrawDepth: number, flipVertically: boolean): void {
    ctx.save();

    if (flipVertically) {
      ctx.translate(lotDrawWidth, lotDrawDepth);
      ctx.rotate(AppComponent.degreesToRadians(180));
    }

    ctx.strokeRect(0, 0, lotDrawWidth, lotDrawDepth);

    ctx.fillStyle = YardColour;
    ctx.fillRect(1, 1, lotDrawWidth - 2, lotDrawDepth - 2);

    const bldgDrawDepth = this.calculateBldgDepth(lotDrawDepth, params.frontYardPercent, params.backYardPercent);
    const bldgDrawWidth = this.calculateBldgWidth(lotDrawWidth, params.sideYardPercent);

    const frontYardDrawDepth = lotDrawDepth * params.frontYardPercent / 100;
    const sideyardDrawDepth = lotDrawWidth * params.sideYardPercent / 100;

    ctx.fillStyle = BuildingColour;
    ctx.fillRect(sideyardDrawDepth,
      frontYardDrawDepth,
      bldgDrawWidth,
      bldgDrawDepth);

    ctx.restore();
  }

  calculateBldgDepth(lotDepth: number, frontYardPercent: number, backYardPercent: number): number {
    return Math.max(0, lotDepth * (100 - frontYardPercent - backYardPercent) / 100);
  }
  calculateBldgWidth(lotWidth: number, sideYardPercent: number): number {
    return Math.max(0, lotWidth * (100 - 2 * sideYardPercent) / 100);
  }

  // Scale things so the defaults look good. Someday maybe we could determine this dynamically
  scaleRealUnitForCanvas(metres: number, currContextCanvasHeight: number): number {
    return metres * 2.07;
  }
}
