import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';

const BuildingColour = 'rgb(0, 82, 110)';
const YardColour = 'rgb(240, 240, 240)';
const RoadColour = 'rgb(84, 84, 84)';
const ParkColour = 'rgb(57,178,30)';
// const MetresPerFoot = 0.3048;

const HousingBlockToParkBlockRatio = 4;

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
    roadWidthInM: [10, [Validators.required, Validators.min(0), Validators.max(30)]],
    lanewayWidthInM: [4, [Validators.required, Validators.min(0), Validators.max(30)]],
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

    let frontYardPercent = this.inputForm.get('frontYardPercent').value;
    let sideYardPercent = this.inputForm.get('sideYardPercent').value;
    let backYardPercent = this.inputForm.get('backYardPercent').value;

    let lotDepthInM = Number(this.inputForm.get('lotDepth').value);
    let lotWidthInM = Number(this.inputForm.get('lotWidth').value);
    let storeys: number = this.inputForm.get('storeys').value;
    let roadWidthInM: number = this.inputForm.get('roadWidthInM').value;
    let lanewayWidthInM: number = this.inputForm.get('lanewayWidthInM').value;
    let maxBlockLengthInM: number = this.inputForm.get('maxBlockLengthInM').value;
    let includeParks: boolean = this.inputForm.get('includeParks').value;
    let oneParkPerThisManyHousingBlocks: number = this.inputForm.get('oneParkPerThisManyHousingBlocks').value;

    this.calculateStatistics(lotDepthInM, lotWidthInM, frontYardPercent, sideYardPercent, backYardPercent,
      storeys, roadWidthInM, lanewayWidthInM, maxBlockLengthInM, includeParks, oneParkPerThisManyHousingBlocks);
    this.drawCanvas(lotDepthInM, lotWidthInM, frontYardPercent, sideYardPercent, backYardPercent,
      roadWidthInM, lanewayWidthInM, maxBlockLengthInM, includeParks, oneParkPerThisManyHousingBlocks);
  }

  // todo: refactor this so it can be tested. What's the best way to return multiple values from a single method in TS?
  public calculateStatistics(lotDepthInM: number, lotWidthInM: number,
    frontYardPercent: number, sideYardPercent: number, backYardPercent: number, storeys: number,
    roadWidthInM: number, lanewayWidthInM: number, maxBlockLengthInM: number, includeParks: boolean, oneParkPerThisManyBlocks: number): void {
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
     ____________
    |  __________
    | | | | | | |
    | |_|_|_|_|_|
    | |__________
    | | | | | | |
    | |_|_|_|_|_|
    */
    let blockWidthInM = roadWidthInM, blockDepthInM = roadWidthInM;
    blockDepthInM += lotDepthInM + lanewayWidthInM + lotDepthInM;
    let maxNumOfAdjacentLots = Math.floor(maxBlockLengthInM / lotWidthInM);
    blockWidthInM += maxNumOfAdjacentLots * lotWidthInM;

    const totalBlockAreaInSqM = blockDepthInM * blockWidthInM;
    const blockAreaRoadsOnlyInSqM = (blockDepthInM * roadWidthInM) +
      (maxNumOfAdjacentLots * lotWidthInM * roadWidthInM) +
      (maxNumOfAdjacentLots * lotWidthInM * lanewayWidthInM);
    const lotsInBlock = 2 * maxNumOfAdjacentLots; // a row of houses on each side of the laneway

    const blockAreaPrivateLandOnlyInSqM = lotsInBlock * lotDepthInM * lotWidthInM;

    const bldgDepthInM = this.calculateBldgDepth(lotDepthInM, frontYardPercent, backYardPercent);
    const bldgWidthInM = this.calculateBldgWidth(lotWidthInM, sideYardPercent);
    const bldgLandArea = bldgDepthInM * bldgWidthInM;
    const blockAreaLandWithBuildingsOnItInSqM = lotsInBlock * bldgLandArea;
    
    const blockAreaYardsOnlyInSqM = blockAreaPrivateLandOnlyInSqM - blockAreaLandWithBuildingsOnItInSqM;
    const totalFloorSpaceInBlockInSqM = blockAreaLandWithBuildingsOnItInSqM * storeys;
    
    this.bldgArea = bldgLandArea;
    
    // look at X blocks, one of which might be a park
    let numOfBlocks = oneParkPerThisManyBlocks;
    let numOfParkBlocks = includeParks ? 1 : 0;

    let floorSpaceInSqM = totalFloorSpaceInBlockInSqM * (numOfBlocks - numOfParkBlocks); 
    let roadAreaInSqM = blockAreaRoadsOnlyInSqM * (numOfBlocks - numOfParkBlocks);
    let yardAreaInSqM = blockAreaYardsOnlyInSqM * (numOfBlocks - numOfParkBlocks);
    let buildingAreaInSqM = blockAreaLandWithBuildingsOnItInSqM * (numOfBlocks - numOfParkBlocks);
    
    let parkWidthInM = maxNumOfAdjacentLots * lotWidthInM;
    let parkDepthInM = lotDepthInM + lanewayWidthInM + lotDepthInM;
    let parkAreaInSqM = parkWidthInM * parkDepthInM * numOfParkBlocks;
    // add roads next to park
    roadAreaInSqM += numOfParkBlocks * ((blockDepthInM * roadWidthInM) + (maxNumOfAdjacentLots * lotWidthInM * roadWidthInM));

    let expectedTotalAreaInSqM = numOfBlocks * totalBlockAreaInSqM;
    let calculatedTotalAreaInSqM = roadAreaInSqM + yardAreaInSqM + buildingAreaInSqM + parkAreaInSqM;

    // todo: this should prolly be a unit test
    if (Math.abs(expectedTotalAreaInSqM - calculatedTotalAreaInSqM ) > 0.01) {
      throw new Error(`ALERT ALERT. expectedArea=${expectedTotalAreaInSqM}, calculatedArea=${calculatedTotalAreaInSqM}`);
    }

    this.yardRatio = yardAreaInSqM / calculatedTotalAreaInSqM;
    this.roadRatio = roadAreaInSqM / calculatedTotalAreaInSqM;
    this.parkRatio = parkAreaInSqM / calculatedTotalAreaInSqM;
    this.buildingRatio = buildingAreaInSqM / calculatedTotalAreaInSqM;

    // scale block to 1km
    this.floorSpaceIn1SqKm = (1000000 / calculatedTotalAreaInSqM) * floorSpaceInSqM;
    this.lotsIn1SqKm = (1000000 / calculatedTotalAreaInSqM) * lotsInBlock * (numOfBlocks - numOfParkBlocks);
  }

  drawCanvas(lotDepthInM: number, lotWidthInM: number,
    frontYardPercent: number, sideYardPercent: number, backYardPercent: number,
    roadWidthInM: number, lanewayWidthInM: number, maxBlockLengthInM: number, includeParks: boolean,
    oneParkPerThisManyHousingBlocks: number): void {
    // console.log(`canvas height:${this.canvas.height} width:${this.canvas.width}`);
    
    let buildingsPerBlockOnSingleStreet = Math.floor(maxBlockLengthInM / lotWidthInM);
    let blockLengthInM = buildingsPerBlockOnSingleStreet * lotWidthInM;
    const ctx = this.canvas.getContext('2d');
    ctx.save();

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // draw background
    ctx.fillStyle = RoadColour;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    let ctxPerspectiveCanvasHeight, ctxPerspectiveCanvasWidth;

    ctxPerspectiveCanvasHeight = this.canvas.height;
    ctxPerspectiveCanvasWidth = this.canvas.width;

    let lotDrawDepth = this.scaleRealUnitForCanvas(lotDepthInM, ctxPerspectiveCanvasHeight);
    let lotDrawWidth = this.scaleRealUnitForCanvas(lotWidthInM, ctxPerspectiveCanvasHeight);
    let roadDrawWidth = this.scaleRealUnitForCanvas(roadWidthInM, ctxPerspectiveCanvasHeight);
    let lanewayDrawWidth = this.scaleRealUnitForCanvas(lanewayWidthInM, ctxPerspectiveCanvasHeight);
    let maxBlockDrawLength = this.scaleRealUnitForCanvas(maxBlockLengthInM, ctxPerspectiveCanvasHeight);
    let blockDrawLength = this.scaleRealUnitForCanvas(blockLengthInM, ctxPerspectiveCanvasHeight);

    // if (lotDrawWidth > ctxPerspectiveCanvasWidth) {
    //   const scalingFactor = ctxPerspectiveCanvasWidth / lotDrawWidth;
    //   lotDrawDepth *= scalingFactor;
    //   lotDrawWidth *= scalingFactor;
    // }

    let blockDrawHeight = lotDrawDepth + lanewayDrawWidth + lotDrawDepth;
    let maxBlockDrawWidthIncludingRoads = roadDrawWidth + maxBlockDrawLength + roadDrawWidth;
    let blocksThatFitVerticallyInCanvas = Math.ceil(ctxPerspectiveCanvasHeight / (blockDrawHeight + roadDrawWidth));
    // doesn't include road width but that's OK, we just need a loose upper bound to avoid doing tooo much work
    // let buildingsThatFitHorizontallyInCanvas = Math.ceil(ctxPerspectiveCanvasWidth / lotDrawWidth);
    // upper bound to avoid doing tooo much work
    let blocksThatFitHorizontallyIntoCanvas = Math.ceil(ctxPerspectiveCanvasWidth / (blockDrawLength));

    const MaxBuildingsToDraw = 10000;
    let expectedBuildingsToDraw = blocksThatFitVerticallyInCanvas * blocksThatFitHorizontallyIntoCanvas * buildingsPerBlockOnSingleStreet * 2;
    if (expectedBuildingsToDraw > MaxBuildingsToDraw) {
      // todo: how do I throw a regular exception?
      // i.e. new Exception(`Not drawing canvas, too many inner loop iterations (${expectedInnerLoopIterations}) expected`)
      throw new DOMException();
    }

    for (let i = 0; i < blocksThatFitVerticallyInCanvas; i++) {
      ctx.translate(0, roadDrawWidth);

      ctx.save();
      for (let currentBlock = 1; currentBlock <= blocksThatFitHorizontallyIntoCanvas; currentBlock++) {
        ctx.translate(roadDrawWidth, 0);
        
        if (includeParks && (currentBlock + i) % oneParkPerThisManyHousingBlocks === 0) {
          ctx.fillStyle = ParkColour;
          ctx.fillRect(0, 0, blockDrawLength, blockDrawHeight);
        } else {
          this.drawBlockOfBuildings(ctx, roadDrawWidth, buildingsPerBlockOnSingleStreet, lotDrawWidth, lotDrawDepth, frontYardPercent, sideYardPercent, backYardPercent, lanewayDrawWidth);
        }
        

        ctx.translate(blockDrawLength, 0);
      }
      ctx.restore();

      ctx.translate(0, lotDrawDepth + lanewayDrawWidth + lotDrawDepth);
    }

    // clean up
    ctx.restore();
  }

  private drawBlockOfBuildings(ctx: CanvasRenderingContext2D, roadDrawWidth: number, buildingsPerBlockOnSingleStreet: number, lotDrawWidth: number, 
    lotDrawDepth: number, frontYardPercent: number, sideYardPercent: number, backYardPercent: number, lanewayDrawWidth: number) {
    ctx.save();
    this.drawRowOfBuildings(ctx, roadDrawWidth, buildingsPerBlockOnSingleStreet, lotDrawWidth, lotDrawDepth, frontYardPercent, sideYardPercent, backYardPercent, true);
    ctx.restore();
    ctx.save();
    ctx.translate(0, lotDrawDepth + lanewayDrawWidth);
    this.drawRowOfBuildings(ctx, roadDrawWidth, buildingsPerBlockOnSingleStreet, lotDrawWidth, lotDrawDepth, frontYardPercent, sideYardPercent, backYardPercent, false);
    ctx.restore();
  }

  private drawRowOfBuildings(ctx: CanvasRenderingContext2D, roadDrawWidth: number, buildingsPerBlockOnSingleStreet: number, lotDrawWidth: number,
    lotDrawDepth: number, frontYardPercent: number, sideYardPercent: number, backYardPercent: number, ctxIsAtRoad: boolean) {
    let yOffsetFromBlockStart = 0;
    // draw a row of buildings
    for (let j = 0; j < buildingsPerBlockOnSingleStreet; j++) {
      this.drawBuilding(ctx, lotDrawWidth, lotDrawDepth, frontYardPercent, sideYardPercent, backYardPercent, !ctxIsAtRoad);
      ctx.translate(lotDrawWidth, 0);
    }
  }

  drawBuilding(ctx: CanvasRenderingContext2D, lotDrawWidth: number, lotDrawDepth: number,
    frontYardPercent: number, sideYardPercent: number, backYardPercent: number, flipVertically: boolean): void {
    ctx.save();

    if (flipVertically) {
      ctx.translate(lotDrawWidth, lotDrawDepth);
      ctx.rotate(AppComponent.degreesToRadians(180));
    }

    ctx.strokeRect(0, 0, lotDrawWidth, lotDrawDepth);

    ctx.fillStyle = YardColour;
    ctx.fillRect(1, 1, lotDrawWidth - 2, lotDrawDepth - 2);

    const bldgDrawDepth = this.calculateBldgDepth(lotDrawDepth, frontYardPercent, backYardPercent);
    const bldgDrawWidth = this.calculateBldgWidth(lotDrawWidth, sideYardPercent);

    const frontYardDrawDepth = lotDrawDepth * frontYardPercent / 100;
    const sideyardDrawDepth = lotDrawWidth * sideYardPercent / 100;

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
    return metres * 2.42;
  }
}
