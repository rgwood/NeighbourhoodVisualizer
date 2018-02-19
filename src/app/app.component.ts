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
  canvasWidth: number = 1000;
  canvasHeight: number = 500;
  bldgArea: number;

  constructor(private fb: FormBuilder) { // <--- inject FormBuilder
    this.createForm();
  }

  createForm() {
    console.log("in createForm()");
    this.inputForm = this.fb.group({
      units: 'ft',
      lotWidth: [33,[Validators.required, Validators.pattern("[0-9]+[.]?[0-9]*$")]], // <--- the FormControl called "lotWidth"
      lotDepth: [122, [Validators.required, Validators.pattern("[0-9]+[.]?[0-9]*$")]]
    });
  }

  ngOnInit(): void {
    console.log("in OnInit()");

    this.inputForm.valueChanges.subscribe(val => {
      console.log("valueChanged");
      console.log(this.inputForm.get('lotWidth').value);
      this.drawCanvas();
    });

    this.drawCanvas();
  }

  drawCanvas(): void{
    let frontYardPercent= 20;
    let sideYardPercent= 10;
    let backYardPercent= 45;

    let lotDepth = this.inputForm.get('lotDepth').value;
    let lotWidth = this.inputForm.get('lotWidth').value;

    let canvas = document.getElementById("setbackCanvas") as HTMLCanvasElement;
    let ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let lotDrawHeight = this.realUnitToCanvasUnit(lotDepth);
    let lotDrawWidth = this.realUnitToCanvasUnit(lotWidth);

    ctx.strokeRect(0,0,lotDrawWidth,lotDrawHeight);

    let bldgHeight = lotDepth * (100 - frontYardPercent - backYardPercent) / 100;
    let bldgDrawHeight = this.realUnitToCanvasUnit(bldgHeight);

    let bldgWidth = lotWidth * (100 - 2*sideYardPercent) / 100;
    let bldgDrawWidth = this.realUnitToCanvasUnit(bldgWidth);

    ctx.fillStyle = "lightblue";

    let frontYardDepth = lotDepth * frontYardPercent / 100;
    let sideyardDepth = lotWidth * sideYardPercent / 100;

    ctx.fillRect(this.realUnitToCanvasUnit(sideyardDepth),
                 this.realUnitToCanvasUnit(frontYardDepth),
                 bldgDrawWidth,
                 bldgDrawHeight);
    this.bldgArea = bldgHeight * bldgWidth;
  }

  realUnitToCanvasUnit(xCoordInRealUnits:number): number{
    return xCoordInRealUnits / this.inputForm.get('lotDepth').value * this.canvasHeight;
  }

}
