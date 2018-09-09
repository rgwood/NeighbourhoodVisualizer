export class VisualizerParameters {
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
  
  // Same data but with much shorter names, for use in query parameters
  toQueryParamFormat() {
    return {
      fyp: this.frontYardPercent,
      syp: this.sideYardPercent,
      byp: this.backYardPercent,
      lod: this.lotDepthInM,
      low: this.lotWidthInM,
      st: this.storeys,
      rw: this.roadWidthInM,
      law: this.lanewayWidthInM,
      sw: this.sidewalkWidthInM,
      mbl: this.maxBlockLengthInM,
      ip: this.includeParks,
      pphb: this.oneParkPerThisManyHousingBlocks
    };
  }
}