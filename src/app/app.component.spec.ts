import { TestBed, async } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { ReactiveFormsModule } from '@angular/forms';
describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        AppComponent
      ],
      imports: [ReactiveFormsModule]
    }).compileComponents();
  }));
  it('should create the app', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  }));
  // it(`should have as title 'app'`, async(() => {
  //   const fixture = TestBed.createComponent(AppComponent);
  //   const app = fixture.debugElement.componentInstance;
  //   expect(app.title).toEqual('app');
  // }));
  it(`should calculate building depth correctly`, async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app.calculateBldgDepth(100, 0, 0)).toEqual(100);
    expect(app.calculateBldgDepth(100, 40, 0)).toEqual(60);
    expect(app.calculateBldgDepth(100, 0, 40)).toEqual(60);
    expect(app.calculateBldgDepth(100, 10, 20)).toEqual(70);
    // should never go below zero
    expect(app.calculateBldgDepth(0, 100, 0)).toEqual(0);
    expect(app.calculateBldgDepth(100, 100, 0)).toEqual(0);
    expect(app.calculateBldgDepth(100, 0, 100)).toEqual(0);
    expect(app.calculateBldgDepth(100, 100, 100)).toEqual(0);
    expect(app.calculateBldgDepth(100, 101, 0)).toEqual(0);
    expect(app.calculateBldgDepth(100, 0, 101)).toEqual(0);
  }));
  it(`should calculate building width correctly`, async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app.calculateBldgWidth(100, 0)).toEqual(100);
    expect(app.calculateBldgWidth(100, 40)).toEqual(20);

    // should never go below zero
    expect(app.calculateBldgWidth(100, 50)).toEqual(0);
    expect(app.calculateBldgWidth(100, 51)).toEqual(0);
  }));
  it('should render title in a h1 tag', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.debugElement.nativeElement;
    expect(compiled.querySelector('h1').textContent).toContain('Neighbourhood Visualizer');
  }));
});
