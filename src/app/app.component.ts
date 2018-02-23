import { Component, OnInit} from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';

const BuildingColour = 'rgb(0, 82, 110)';
const YardColour = 'rgb(200, 200, 200)';
const RoadColour = 'rgb(84, 84, 84)';
// const MetresPerFoot = 0.3048;
const RoadWidthInMetres = 10;
const LanewayWidthInMetres = 4;
// If 1 more lot would put us over this length, we will not build it. If lot width > this, invalid.
const MaxBlockLengthInMetres = 100;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit {
  title = 'app';
  inputForm: FormGroup;
  canvas: HTMLCanvasElement;
  bldgArea: number;
  yardRatio: number;
  roadRatio: number;
  buildingRatio: number;
  floorSpaceIn1SqKm: number;

  static degreesToRadians(degrees: number) {
    return degrees * Math.PI / 180;
  }

  constructor(private fb: FormBuilder) { // <--- inject FormBuilder
    this.createForm();
  }

  createForm() {
    console.log('in createForm()');
    this.inputForm = this.fb.group({
      lotWidth: [10.1, [Validators.required, Validators.pattern('[0-9]+[.]?[0-9]*$')]], // <--- the FormControl called "lotWidth"
      lotDepth: [37.2, [Validators.required, Validators.pattern('[0-9]+[.]?[0-9]*$')]],
      frontYardPercent: 20,
      sideYardPercent: 10,
      backYardPercent: 45,
      storeys: [2, [Validators.required, Validators.min(0), Validators.max(50)]],
      averageUnitSizeInSqM: 100
    });
  }

  ngOnInit(): void {
    console.log('in OnInit()');

    this.canvas = document.getElementById('setbackCanvas') as HTMLCanvasElement;
    this.inputForm.valueChanges.subscribe(val => {
      if (this.inputForm.valid) {
        this.calculateStatsAndDrawCanvas();
      }
    });

    this.calculateStatsAndDrawCanvas();
  }

  calculateStatsAndDrawCanvas(): void {

    let frontYardPercent = this.inputForm.get('frontYardPercent').value;
    let sideYardPercent = this.inputForm.get('sideYardPercent').value;
    let backYardPercent = this.inputForm.get('backYardPercent').value;

    let lotDepthInM: number = this.inputForm.get('lotDepth').value;
    let lotWidthInM: number = this.inputForm.get('lotWidth').value;

    this.calculateStatistics(lotDepthInM, lotWidthInM, frontYardPercent, sideYardPercent, backYardPercent);
    this.drawCanvas(lotDepthInM, lotWidthInM, frontYardPercent, sideYardPercent, backYardPercent);
  }

  calculateStatistics(lotDepthInM: number, lotWidthInM: number,
    frontYardPercent: number, sideYardPercent: number, backYardPercent: number): void {
    console.log(`lot depth: ${lotDepthInM}m, width: ${lotWidthInM}m`);
    // over 1 km^2...
    // what % is land/road/building?
    // how much floor space total?
    // what are the gross and net floor space ratios?
    // how many dwelling units (assuming a specific size of unit?)

    // Big Q: how do we calculate this for a square kilometre when blocks don't line up exactly?
    // I think we just calculate for a certain area then normalize that to a square kilometre
    // what's the smallest area we can do that for?
    // I think it's: road on top and left, then 2 blocks of housing with laneway in between
    let blockWidthInM = RoadWidthInMetres, blockDepthInM = RoadWidthInMetres;
    blockDepthInM += lotDepthInM + LanewayWidthInMetres + lotDepthInM;
    let maxNumOfAdjacentLots = Math.floor(MaxBlockLengthInMetres / lotWidthInM);
    blockWidthInM += maxNumOfAdjacentLots * lotWidthInM;

    const totalBlockAreaInSqM = blockDepthInM * blockWidthInM;
    const blockAreaRoadsOnlyInSqM = (blockDepthInM * RoadWidthInMetres) +
                                    (maxNumOfAdjacentLots * lotWidthInM * RoadWidthInMetres) +
                                    (maxNumOfAdjacentLots * lotWidthInM * LanewayWidthInMetres);
    const lotsInBlock = 2 * maxNumOfAdjacentLots; // a row of houses on each side of the laneway

    const blockAreaPrivateLandOnlyInSqM = lotsInBlock * lotDepthInM * lotWidthInM;

    const bldgDepthInM = this.calculateBldgDepth(lotDepthInM, frontYardPercent, backYardPercent);
    const bldgWidthInM = this.calculateBldgWidth(lotWidthInM, sideYardPercent);
    const bldgLandArea = bldgDepthInM * bldgWidthInM;
    const blockAreaLandWithBuildingsOnItInSqM = lotsInBlock * bldgLandArea;
    const blockAreaYardsOnlyInSqM = blockAreaPrivateLandOnlyInSqM - blockAreaLandWithBuildingsOnItInSqM;

    this.bldgArea = bldgLandArea;
    this.yardRatio = blockAreaYardsOnlyInSqM / totalBlockAreaInSqM;
    this.roadRatio = blockAreaRoadsOnlyInSqM / totalBlockAreaInSqM;
    this.buildingRatio = blockAreaLandWithBuildingsOnItInSqM / totalBlockAreaInSqM;

    // console.log(`total block area: ${blockAreaInSqM}m^2`);
    // console.log(`total road area: ${blockAreaRoadsOnlyInSqM}m^2`);
    // console.log(`total lot area: ${blockAreaPrivateLandOnlyInSqM}m^2`);
    // console.log(`total land with buildings on it: ${blockAreaLandWithBuildingsOnItInSqM}m^2`);
  }

  drawCanvas(lotDepthInMetres: number, lotWidthInMetres: number,
    frontYardPercent: number, sideYardPercent: number, backYardPercent: number): void {
    console.log(`canvas height:${this.canvas.height} width:${this.canvas.width}`);
    const ctx = this.canvas.getContext('2d');
    ctx.save();

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // draw background
    ctx.fillStyle = RoadColour;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    let ctxPerspectiveCanvasHeight, ctxPerspectiveCanvasWidth;

    ctxPerspectiveCanvasHeight = this.canvas.height;
    ctxPerspectiveCanvasWidth = this.canvas.width;

    let lotDrawDepth = this.realUnitToCanvasUnit(lotDepthInMetres, ctxPerspectiveCanvasHeight);
    let lotDrawWidth = this.realUnitToCanvasUnit(lotWidthInMetres, ctxPerspectiveCanvasHeight);
    let roadDrawWidth = this.realUnitToCanvasUnit(RoadWidthInMetres, ctxPerspectiveCanvasHeight);
    let lanewayDrawWidth = this.realUnitToCanvasUnit(LanewayWidthInMetres, ctxPerspectiveCanvasHeight);
    let maxBlockDrawLength = this.realUnitToCanvasUnit(MaxBlockLengthInMetres, ctxPerspectiveCanvasHeight);

    // todo: some kinda dynamic scaling to ensure that we always show a certain number of blocks
    let testScalingFactor = 0.1;
    lotDrawDepth *= testScalingFactor;
    lotDrawWidth *= testScalingFactor;
    roadDrawWidth *= testScalingFactor;
    lanewayDrawWidth *= testScalingFactor;
    maxBlockDrawLength *= testScalingFactor;

    if (lotDrawWidth > ctxPerspectiveCanvasWidth) {
      const scalingFactor = ctxPerspectiveCanvasWidth / lotDrawWidth;
      lotDrawDepth *= scalingFactor;
      lotDrawWidth *= scalingFactor;
    }

    ctx.translate(roadDrawWidth, 0 );
    let blockDrawHeight = roadDrawWidth + lotDrawDepth + lanewayDrawWidth + lotDrawDepth;
    let blocksThatFitVerticallyInCanvas = Math.ceil(ctxPerspectiveCanvasHeight / blockDrawHeight);
    // doesn't include road width but that's OK, we just need a loose upper bound
    let buildingsThatFitHorizontallyInCanvas = Math.ceil( ctxPerspectiveCanvasWidth / lotDrawWidth );

    const MaxInnerLoopIterations = 10000;
    let expectedInnerLoopIterations = blocksThatFitVerticallyInCanvas *  buildingsThatFitHorizontallyInCanvas;
    if (expectedInnerLoopIterations > MaxInnerLoopIterations ) {
      // todo: how do I throw a regular exception?
      // `Not drawing canvas, too many inner loop iterations (${expectedInnerLoopIterations}) expected`
      throw new DOMException();
    }

    for (let i = 0; i < blocksThatFitVerticallyInCanvas * 2; i++) {
      let ctxIsAtRoad = (i % 2 === 0); // is our context currently on a road (as opposed to a laneway?)
      ctx.translate(0, (ctxIsAtRoad ? roadDrawWidth : lanewayDrawWidth) );
      ctx.save();

      let yOffsetFromBlockStart = 0;
      for (let j = 0; j < buildingsThatFitHorizontallyInCanvas; j++) {
        if (yOffsetFromBlockStart + lotDrawWidth >= maxBlockDrawLength) { // start a new block
          yOffsetFromBlockStart = 0;
          ctx.translate(roadDrawWidth, 0);
        } else { // draw a building!
          this.drawBuilding(ctx, lotDrawWidth, lotDrawDepth, frontYardPercent, sideYardPercent, backYardPercent, !ctxIsAtRoad);
          ctx.translate(lotDrawWidth, 0);
          yOffsetFromBlockStart += lotDrawWidth;
        }
      }
      ctx.restore();
      ctx.translate(0, lotDrawDepth );
    }

    // clean up
    ctx.restore();
  }

  drawBuilding(ctx: CanvasRenderingContext2D, lotDrawWidth: number, lotDrawDepth: number,
               frontYardPercent: number, sideYardPercent: number, backYardPercent: number, flipVertically: boolean): void {
    ctx.save();

    if ( flipVertically ) {
      let temp = frontYardPercent;
      frontYardPercent = backYardPercent;
      backYardPercent = temp;
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

  realUnitToCanvasUnit(xCoordInRealUnits: number, currContextCanvasHeight: number): number {
    return xCoordInRealUnits / this.inputForm.get('lotDepth').value * currContextCanvasHeight;
  }

  toCanvasUnits(numRealUnits: number, maxRealUnits: number, currContextCanvasHeight: number): number {
    return numRealUnits / maxRealUnits * currContextCanvasHeight;
  }
}
