import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { debounce, takeUntil } from 'rxjs/operators';
import { timer, Subject } from 'rxjs';
import * as qs from 'qs';
import { VisualizerParameters } from './VisualizerParameters';

const BuildingColour = 'rgb(0, 82, 110)';
const YardColour = 'rgb(240, 240, 240)';
const RoadColour = 'rgb(84, 84, 84)';
const ParkColour = 'rgb(57,178,30)';
const SidewalkColour = 'rgb(209,209,209)';
const MaxBuildingsToDraw = 10000;
const DefaultInputConfig = {
  lotWidth: [10.1, [Validators.required, Validators.pattern('[0-9]+[.]?[0-9]*$')]], // <--- the FormControl called "lotWidth"
  lotDepth: [37.2, [Validators.required, Validators.pattern('[0-9]+[.]?[0-9]*$')]],
  frontYardPercent: [20],
  sideYardPercent: [10],
  backYardPercent: [45],
  storeys: [3, [Validators.required, Validators.min(0), Validators.max(50)]],
  averageUnitSizeInSqM: [100],
  roadWidthInM: [11, [Validators.required, Validators.min(0), Validators.max(30)]],
  sidewalkWidthInM: [8, [Validators.required, Validators.min(0), Validators.max(30)]],
  lanewayWidthInM: [6, [Validators.required, Validators.min(0), Validators.max(30)]],
  // If 1 more lot would put us over this length, we will not build it. If lot width > this, invalid.
  maxBlockLengthInM: [100, [Validators.required, Validators.min(1), Validators.max(300)]],
  includeParks: [false],
  oneParkPerThisManyHousingBlocks: [4, [Validators.min(2), Validators.max(20)]]
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit {
  title = 'Vancouver Housing Block Visualizer';
  inputForm!: FormGroup;
  canvas!: HTMLCanvasElement;
  bldgArea!: number;
  yardRatio!: number;
  parkRatio!: number;
  sidewalkRatio!: number;
  roadRatio!: number;
  buildingRatio!: number;
  floorSpaceIn1SqKm!: number;
  lotsIn1SqKm!: number;
  stopSubscriptionsSubject!: Subject<void>;

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.canvas = document.getElementById('setbackCanvas') as HTMLCanvasElement;
    this.populateInputFormUsingQueryParamsIfAvailable();
    this.subscribeToInputFormChanges();
  }

  ngAfterViewChecked(): void {
    // do this after ngOnInit because input form not ready then
    this.calculateStatsAndDrawCanvas();
  }


  resetForm() {
    this.cleanUpSubscriptions();
    this.resetInputForm();
    this.subscribeToInputFormChanges();
    this.calculateStatsAndDrawCanvas();
    this.setURLToMatchParams();
  }


  private cleanUpSubscriptions() {
    this.stopSubscriptionsSubject.next();
    this.stopSubscriptionsSubject.complete();
  }

  private resetInputForm() {
    this.inputForm = this.fb.group(DefaultInputConfig, {validator: this.checkThatBlockLengthAllowsAtLeastOneLotValidator()});
  }

  private populateInputFormUsingQueryParamsIfAvailable() {
    let config = Object.assign({}, DefaultInputConfig);

    if (location.search.startsWith('?')) {
      let queryParams: any = qs.parse(location.search.substring(1));

      let tryParseNumber = function(queryParam: any, fallback: any) {
        // special case because 0 will not evaluate to truthy, and thus the code below will use the fallback...
        if (queryParam === '0') {
          return 0;
        }
        let parsed = Number(queryParam);
        return !!parsed ? [parsed] : fallback;
      };

      config.lotWidth = tryParseNumber(queryParams.low, config.lotWidth);
      config.lotDepth = tryParseNumber(queryParams.lod, config.lotDepth);
      config.frontYardPercent = tryParseNumber(queryParams.fyp, config.frontYardPercent);
      config.sideYardPercent = tryParseNumber(queryParams.syp, config.sideYardPercent);
      config.backYardPercent = tryParseNumber(queryParams.byp, config.backYardPercent);
      config.storeys = tryParseNumber(queryParams.st, config.storeys);
      config.averageUnitSizeInSqM = tryParseNumber(queryParams.aus, config.averageUnitSizeInSqM);
      config.roadWidthInM = tryParseNumber(queryParams.rw, config.roadWidthInM);
      config.sidewalkWidthInM = tryParseNumber(queryParams.sw, config.sidewalkWidthInM);
      config.lanewayWidthInM = tryParseNumber(queryParams.law, config.lanewayWidthInM);
      config.maxBlockLengthInM = tryParseNumber(queryParams.mbl, config.maxBlockLengthInM);

      if (queryParams.ip !== undefined) {
        config.includeParks = [queryParams.ip.toLowerCase() === 'true'];
      }

      config.oneParkPerThisManyHousingBlocks = tryParseNumber(queryParams.pphb, config.oneParkPerThisManyHousingBlocks);
    }
    this.inputForm = this.fb.group(config, {validator: this.checkThatBlockLengthAllowsAtLeastOneLotValidator()});
  }

  private checkThatBlockLengthAllowsAtLeastOneLotValidator() {
    return (group: FormGroup): {[key: string]: any} => {
      let blockLength = group.controls['maxBlockLengthInM'];
      let lotWidth = group.controls['lotWidth'];
      if (blockLength.value < lotWidth.value) {
        return {blockLengthTooShort: true};
      }

      return {};
    };
  }

  private subscribeToInputFormChanges() {
    this.stopSubscriptionsSubject = new Subject<void>();
    this.inputForm.valueChanges.pipe(takeUntil(this.stopSubscriptionsSubject)).subscribe(val => {
      if (this.inputForm.valid) {
        this.calculateStatsAndDrawCanvas();
      } else {
        this.clearCanvas();
      }
    });

    this.inputForm.valueChanges.pipe(
      takeUntil(this.stopSubscriptionsSubject),
      debounce(() => timer(250)))
      .subscribe(() => {this.setURLToMatchParams();
    });
  }

  private setURLToMatchParams() {
    this.router.navigate(['.'], { queryParams: this.getStronglyTypedParametersFromForm().toQueryParamFormat() });
  }

  calculateStatsAndDrawCanvas(): void {
    if (!this.inputForm.valid) {
      console.log('Parameters not valid. Skipping calculation+drawing');
      return;
    }
    let parameters = this.getStronglyTypedParametersFromForm();
    this.calculateStatistics(parameters);
    this.drawCanvas(parameters);
  }

  private getStronglyTypedParametersFromForm() {
    let vp = new VisualizerParameters();
    vp.frontYardPercent = this.inputForm.get('frontYardPercent')!.value;
    vp.sideYardPercent = this.inputForm.get('sideYardPercent')!.value;
    vp.backYardPercent = this.inputForm.get('backYardPercent')!.value;
    vp.lotDepthInM = Number(this.inputForm.get('lotDepth')!.value);
    vp.lotWidthInM = Number(this.inputForm.get('lotWidth')!.value);
    vp.storeys = this.inputForm.get('storeys')!.value;
    vp.roadWidthInM = this.inputForm.get('roadWidthInM')!.value;
    vp.lanewayWidthInM = this.inputForm.get('lanewayWidthInM')!.value;
    vp.sidewalkWidthInM = this.inputForm.get('sidewalkWidthInM')!.value;
    vp.maxBlockLengthInM = this.inputForm.get('maxBlockLengthInM')!.value;
    vp.includeParks = this.inputForm.get('includeParks')!.value;
    vp.oneParkPerThisManyHousingBlocks = this.inputForm.get('oneParkPerThisManyHousingBlocks')!.value;
    return vp;
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

    let maxNumOfAdjacentLots = this.getMaxNumOfAdjacentLots(params);
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

    return {
      roadAreaInSqM:  blockAreaRoadsOnlyInSqM,
      yardAreaInSqm: blockAreaYardsOnlyInSqM,
      builtLandAreaInSqm: blockAreaLandWithBuildingsOnItInSqM,
      sidewalkAreaInSqM: blockAreaSidewalkOnlyInSqM
    };
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
    const ctx = this.canvas.getContext('2d')!;
    let buildingsPerBlockOnSingleStreet = this.getMaxNumOfAdjacentLots(params);
    let blockLengthInM = buildingsPerBlockOnSingleStreet * params.lotWidthInM;

    ctx.save();

    this.clearCanvas();

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

    let blockDrawHeight = lotDrawDepth + lanewayDrawWidth + lotDrawDepth;
    let blocksThatFitVerticallyInCanvas = Math.ceil(ctxPerspectiveCanvasHeight / (blockDrawHeight + roadDrawWidth));
    // doesn't include road width but that's OK, we just need a loose upper bound to avoid doing tooo much work
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

  private clearCanvas() {
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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
      throw new Error(`Not drawing canvas, too many buildings. Would draw ${expectedBuildingsToDraw}, the max is ${MaxBuildingsToDraw}. Params are probably bad`);
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

  // tslint:disable-next-line:member-ordering
  static degreesToRadians(degrees: number) {
    return degrees * Math.PI / 180;
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
