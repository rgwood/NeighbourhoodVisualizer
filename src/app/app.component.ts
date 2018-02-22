import { Component, OnInit} from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';

const BuildingColour = 'rgb(0, 82, 110)';
const YardColour = 'rgba(0, 0, 0, 0.03)';
const MetresPerFoot = 0.3048;

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

  static degreesToRadians(degrees: number) {
    return degrees * Math.PI / 180;
  }

  constructor(private fb: FormBuilder) { // <--- inject FormBuilder
    this.createForm();
  }

  createForm() {
    console.log('in createForm()');
    this.inputForm = this.fb.group({
      units: 'ft',
      lotWidth: [33, [Validators.required, Validators.pattern('[0-9]+[.]?[0-9]*$')]], // <--- the FormControl called "lotWidth"
      lotDepth: [122, [Validators.required, Validators.pattern('[0-9]+[.]?[0-9]*$')]],
      frontYardPercent: 20,
      sideYardPercent: 10,
      backYardPercent: 45
    });
  }

  ngOnInit(): void {
    console.log('in OnInit()');

    this.canvas = document.getElementById('setbackCanvas') as HTMLCanvasElement;
    this.inputForm.valueChanges.subscribe(val => {
      if (this.inputForm.valid) {
        this.drawCanvas();
      }
    });

    this.drawCanvas();
  }

  drawCanvas(): void {
    console.log(`canvas height:${this.canvas.height} width:${this.canvas.width}`);

    let frontYardPercent = this.inputForm.get('frontYardPercent').value;
    let sideYardPercent = this.inputForm.get('sideYardPercent').value;
    let backYardPercent = this.inputForm.get('backYardPercent').value;

    let lotDepth: number = this.inputForm.get('lotDepth').value;
    let lotWidth: number = this.inputForm.get('lotWidth').value;

    if ( frontYardPercent + backYardPercent < 100 && sideYardPercent < 50) {
      this.bldgArea = this.calculateBldgDepth(lotDepth) * this.calculateBldgWidth(lotWidth);
    } else {
      this.bldgArea = 0;
    }

    let lotDepthInMetres: number = (this.inputForm.get('units').value === 'ft') ? lotDepth * MetresPerFoot : lotDepth;
    let lotWidthInMetres: number = (this.inputForm.get('units').value === 'ft') ? lotWidth * MetresPerFoot : lotWidth ;

    // let canvas = document.getElementById("setbackCanvas") as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    ctx.save();

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    let ctxPerspectiveCanvasHeight, ctxPerspectiveCanvasWidth;

    ctxPerspectiveCanvasHeight = this.canvas.height;
    ctxPerspectiveCanvasWidth = this.canvas.width;

    let lotDrawDepth = this.realUnitToCanvasUnit(lotDepthInMetres, ctxPerspectiveCanvasHeight);
    let lotDrawWidth = this.realUnitToCanvasUnit(lotWidthInMetres, ctxPerspectiveCanvasHeight);

    // test
    lotDrawDepth *= 0.5;
    lotDrawWidth *= 0.5;

    if (lotDrawWidth > ctxPerspectiveCanvasWidth) {
      const scalingFactor = ctxPerspectiveCanvasWidth / lotDrawWidth;
      lotDrawDepth *= scalingFactor;
      lotDrawWidth *= scalingFactor;
    }

    let roadWidth = 10;
    let lanewayWidth = 10;

    // todo: choose loop limits that fill the canvas exactly
    for (let i = 0; i < 4; i++) {
      ctx.save();
      let flipVertically = (i % 2 === 1);
      for (let j = 0; j < 20; j++) {
        this.drawBuilding(ctx, lotDrawWidth, lotDrawDepth, frontYardPercent, sideYardPercent, backYardPercent, flipVertically);
        ctx.translate(lotDrawWidth, 0);
      }
      ctx.restore();
      ctx.translate(0, lotDrawDepth);
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

    let centrePoint = (width: number) => width / 2;

    // let xOffsetToDrawRectInCentre = centrePoint(ctxPerspectiveCanvasWidth) - centrePoint(lotDrawWidth);
    // ctx.translate(xOffsetToDrawRectInCentre, 0);

    ctx.strokeRect(0, 0, lotDrawWidth, lotDrawDepth);

    ctx.fillStyle = YardColour;
    ctx.fillRect(1, 1, lotDrawWidth - 2, lotDrawDepth - 2);

    if ( frontYardPercent + backYardPercent < 100 && sideYardPercent < 50) {
      const bldgDrawDepth = this.calculateBldgDepth(lotDrawDepth);
      const bldgDrawWidth = this.calculateBldgWidth(lotDrawWidth);

      const frontYardDrawDepth = lotDrawDepth * frontYardPercent / 100;
      const sideyardDrawDepth = lotDrawWidth * sideYardPercent / 100;

      ctx.fillStyle = BuildingColour;
      ctx.fillRect(sideyardDrawDepth,
                   frontYardDrawDepth,
                   bldgDrawWidth,
                   bldgDrawDepth);

    }

    ctx.restore();
  }

  calculateBldgDepth(lotDepth: number): number {
    let frontYardPercent = this.inputForm.get('frontYardPercent').value;
    let backYardPercent = this.inputForm.get('backYardPercent').value;
    return Math.max(0, lotDepth * (100 - frontYardPercent - backYardPercent) / 100);
  }
  calculateBldgWidth(lotWidth: number): number {
    let sideYardPercent = this.inputForm.get('sideYardPercent').value;
    return Math.max(0, lotWidth * (100 - 2 * sideYardPercent) / 100);
  }

  realUnitToCanvasUnit(xCoordInRealUnits: number, currContextCanvasHeight: number): number {
    return xCoordInRealUnits / this.inputForm.get('lotDepth').value * currContextCanvasHeight;
  }

  toCanvasUnits(numRealUnits: number, maxRealUnits: number, currContextCanvasHeight: number): number {
    return numRealUnits / maxRealUnits * currContextCanvasHeight;
  }
}
