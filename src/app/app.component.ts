import { Component} from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  title = 'app';
  
  canvasWidth: number = 1000;
  canvasHeight: number = 500;
  lotWidth: number = 33;
  lotHeight: number = 122;
  lotArea: number;
  bldgArea: number;

  ngOnInit(): void {

    let frontYardPercent= 20;
    let sideYardPercent= 10;
    let backYardPercent= 45;

    let canvas = document.getElementById("setbackCanvas") as HTMLCanvasElement;
    let ctx = canvas.getContext("2d");

    let lotDrawHeight = this.realUnitToCanvasUnit(this.lotHeight);
    let lotDrawWidth = this.realUnitToCanvasUnit(this.lotWidth);

    ctx.strokeRect(0,0,lotDrawWidth,lotDrawHeight);

    let bldgHeight = this.lotHeight * (100 - frontYardPercent - backYardPercent) / 100;
    let bldgDrawHeight = this.realUnitToCanvasUnit(bldgHeight);

    let bldgWidth = this.lotWidth * (100 - 2*sideYardPercent) / 100;
    let bldgDrawWidth = this.realUnitToCanvasUnit(bldgWidth);

    ctx.fillStyle = "lightblue";

    let frontYardDepth = this.lotHeight * frontYardPercent / 100;
    let sideyardDepth = this.lotWidth * sideYardPercent / 100;

    ctx.fillRect(this.realUnitToCanvasUnit(sideyardDepth),
                 this.realUnitToCanvasUnit(frontYardDepth),
                 bldgDrawWidth,
                 bldgDrawHeight);

    this.lotArea = this.lotHeight * this.lotWidth;
    this.bldgArea = bldgHeight * bldgWidth;
  }

  realUnitToCanvasUnit(xCoordInRealUnits:number): number{
    return xCoordInRealUnits / this.lotHeight * this.canvasHeight;
  }

}
