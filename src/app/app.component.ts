import { Component} from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent {
  title = 'app';
  inputForm: FormGroup;
  canvas: HTMLCanvasElement;
  bldgArea: number;

  constructor(private fb: FormBuilder) { // <--- inject FormBuilder
    this.createForm();
  }

  createForm() {
    console.log("in createForm()");
    this.inputForm = this.fb.group({
      units: 'ft',
      lotWidth: [33,[Validators.required, Validators.pattern("[0-9]+[.]?[0-9]*$")]], // <--- the FormControl called "lotWidth"
      lotDepth: [122, [Validators.required, Validators.pattern("[0-9]+[.]?[0-9]*$")]],
      frontYardPercent:20,
      sideYardPercent: 10,
      backYardPercent: 45
    });
  }

  ngOnInit(): void {
    console.log("in OnInit()");

    this.canvas = document.getElementById("setbackCanvas") as HTMLCanvasElement;
    this.inputForm.valueChanges.subscribe(val => {
      console.log("valueChanged");
      console.log(this.inputForm.get('lotWidth').value);
      this.drawCanvas();
    });

    this.drawCanvas();
  }

  drawCanvas(): void{
    console.log(`canvas height:${this.canvas.height} width:${this.canvas.width}`);

    let frontYardPercent= this.inputForm.get('frontYardPercent').value;
    let sideYardPercent= this.inputForm.get('sideYardPercent').value;;
    let backYardPercent= this.inputForm.get('backYardPercent').value;;

    const BuildingColour = "lightblue";

    /*pick longer side then scale?
    pick the longer side then have 2 different branches? simple and not that bad...
    */

    let lotDepth = this.inputForm.get('lotDepth').value;
    let lotWidth = this.inputForm.get('lotWidth').value;

    //let canvas = document.getElementById("setbackCanvas") as HTMLCanvasElement;
    let ctx = this.canvas.getContext("2d");
    ctx.save();

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    
    let ctxPerspectiveCanvasHeight, ctxPerspectiveCanvasWidth;

    if(lotWidth > lotDepth){ //front yard = top of canvas
      ctxPerspectiveCanvasHeight = this.canvas.height
      ctxPerspectiveCanvasWidth = this.canvas.width
    }
    else //front yard = left of canvas
    {
      //we want to rotate then 

      //move context to bottom left and rotate
      ctx.translate(0, this.canvas.height);
      //rotate 90 degrees counter-clockwise
      ctx.rotate(AppComponent.degreesToRadians(-90));

      //change size
      ctxPerspectiveCanvasHeight = this.canvas.width;
      ctxPerspectiveCanvasWidth = this.canvas.height
    }



    let lotDrawHeight = this.realUnitToCanvasUnit(lotDepth, ctxPerspectiveCanvasHeight);
    let lotDrawWidth = this.realUnitToCanvasUnit(lotWidth, ctxPerspectiveCanvasHeight);

    let centrePoint = (width: number) => { return width/2; };


    let xOffsetToDrawRectInCentre = centrePoint(ctxPerspectiveCanvasWidth) - centrePoint(lotDrawWidth);
    ctx.translate(xOffsetToDrawRectInCentre, 0);
    ctx.strokeRect(0,0,lotDrawWidth,lotDrawHeight);

    let bldgHeight = lotDepth * (100 - frontYardPercent - backYardPercent) / 100;
    let bldgDrawHeight = this.realUnitToCanvasUnit(bldgHeight, ctxPerspectiveCanvasHeight);

    let bldgWidth = lotWidth * (100 - 2*sideYardPercent) / 100;
    let bldgDrawWidth = this.realUnitToCanvasUnit(bldgWidth, ctxPerspectiveCanvasHeight);

    ctx.fillStyle = BuildingColour;

    let frontYardDepth = lotDepth * frontYardPercent / 100;
    let sideyardDepth = lotWidth * sideYardPercent / 100;

    ctx.fillRect(this.realUnitToCanvasUnit(sideyardDepth, ctxPerspectiveCanvasHeight),
                 this.realUnitToCanvasUnit(frontYardDepth, ctxPerspectiveCanvasHeight),
                 bldgDrawWidth,
                 bldgDrawHeight);
    this.bldgArea = bldgHeight * bldgWidth;

    //clean up
    ctx.restore();


    /*
    CONTEXT ROTATING SNIPPET
    context.save();
 context.translate(newx, newy);
 context.rotate(-Math.PI/2);
 context.textAlign = "center";
 context.fillText("Your Label Here", labelXposition, 0);
 context.restore();

    */
  }

  realUnitToCanvasUnit(xCoordInRealUnits:number, currContextCanvasHeight: number): number{
    return xCoordInRealUnits / this.inputForm.get('lotDepth').value * currContextCanvasHeight;
  }

  static degreesToRadians(degrees:number){
    return degrees * Math.PI / 180;
  }

}
