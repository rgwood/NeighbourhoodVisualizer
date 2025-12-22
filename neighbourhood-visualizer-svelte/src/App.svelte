<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { VisualizerParameters } from './lib/models/VisualizerParameters';
  import { calculateStatistics } from './lib/utils/statisticsCalculator';
  import { drawCanvas } from './lib/utils/canvasRenderer';
  import { loadParametersFromURL, updateURLWithParameters } from './lib/utils/urlStateManager';
  import { DefaultInputConfig, validateBlockLength } from './lib/utils/validators';

  import OptionsPanel from './lib/components/OptionsPanel.svelte';
  import ResultsPanel from './lib/components/ResultsPanel.svelte';

  // Form state (replaces FormGroup)
  let lotWidth = DefaultInputConfig.lotWidth;
  let lotDepth = DefaultInputConfig.lotDepth;
  let frontYardPercent = DefaultInputConfig.frontYardPercent;
  let sideYardPercent = DefaultInputConfig.sideYardPercent;
  let backYardPercent = DefaultInputConfig.backYardPercent;
  let storeys = DefaultInputConfig.storeys;
  let averageUnitSizeInSqM = DefaultInputConfig.averageUnitSizeInSqM;
  let roadWidthInM = DefaultInputConfig.roadWidthInM;
  let sidewalkWidthInM = DefaultInputConfig.sidewalkWidthInM;
  let lanewayWidthInM = DefaultInputConfig.lanewayWidthInM;
  let maxBlockLengthInM = DefaultInputConfig.maxBlockLengthInM;
  let includeParks = DefaultInputConfig.includeParks;
  let oneParkPerThisManyHousingBlocks = DefaultInputConfig.oneParkPerThisManyHousingBlocks;

  // Calculated statistics
  let bldgArea = 0;
  let yardRatio = 0;
  let roadRatio = 0;
  let sidewalkRatio = 0;
  let parkRatio = 0;
  let buildingRatio = 0;
  let floorSpaceIn1SqKm = 0;
  let lotsIn1SqKm = 0;

  let canvas: HTMLCanvasElement;
  let urlUpdateTimer: number;

  // Create params object from individual values
  $: params = createParams();

  // Validate
  $: isValid = validateBlockLength(maxBlockLengthInM, lotWidth) &&
               storeys >= 0 && storeys <= 50 &&
               roadWidthInM >= 0 && roadWidthInM <= 30 &&
               sidewalkWidthInM >= 0 && sidewalkWidthInM <= 30 &&
               lanewayWidthInM >= 0 && lanewayWidthInM <= 30 &&
               maxBlockLengthInM >= 1 && maxBlockLengthInM <= 300 &&
               oneParkPerThisManyHousingBlocks >= 2 && oneParkPerThisManyHousingBlocks <= 20;

  // Calculate when params change
  $: if (isValid && canvas) {
    try {
      const stats = calculateStatistics(params);
      bldgArea = stats.bldgArea;
      yardRatio = stats.yardRatio;
      roadRatio = stats.roadRatio;
      sidewalkRatio = stats.sidewalkRatio;
      parkRatio = stats.parkRatio;
      buildingRatio = stats.buildingRatio;
      floorSpaceIn1SqKm = stats.floorSpaceIn1SqKm;
      lotsIn1SqKm = stats.lotsIn1SqKm;

      drawCanvas(canvas, params);
    } catch (error) {
      console.error('Error calculating or drawing:', error);
    }
  }

  // Debounced URL update
  $: if (isValid && params) {
    clearTimeout(urlUpdateTimer);
    urlUpdateTimer = setTimeout(() => {
      updateURLWithParameters(params);
    }, 250);
  }

  onMount(() => {
    const urlParams = loadParametersFromURL();
    if (urlParams) {
      lotWidth = urlParams.lotWidth ?? lotWidth;
      lotDepth = urlParams.lotDepth ?? lotDepth;
      frontYardPercent = urlParams.frontYardPercent ?? frontYardPercent;
      sideYardPercent = urlParams.sideYardPercent ?? sideYardPercent;
      backYardPercent = urlParams.backYardPercent ?? backYardPercent;
      storeys = urlParams.storeys ?? storeys;
      averageUnitSizeInSqM = urlParams.averageUnitSizeInSqM ?? averageUnitSizeInSqM;
      roadWidthInM = urlParams.roadWidthInM ?? roadWidthInM;
      sidewalkWidthInM = urlParams.sidewalkWidthInM ?? sidewalkWidthInM;
      lanewayWidthInM = urlParams.lanewayWidthInM ?? lanewayWidthInM;
      maxBlockLengthInM = urlParams.maxBlockLengthInM ?? maxBlockLengthInM;
      includeParks = urlParams.includeParks ?? includeParks;
      oneParkPerThisManyHousingBlocks = urlParams.oneParkPerThisManyHousingBlocks ?? oneParkPerThisManyHousingBlocks;
    }
  });

  onDestroy(() => {
    clearTimeout(urlUpdateTimer);
  });

  function createParams(): VisualizerParameters {
    const p = new VisualizerParameters();
    p.lotWidthInM = lotWidth;
    p.lotDepthInM = lotDepth;
    p.frontYardPercent = frontYardPercent;
    p.sideYardPercent = sideYardPercent;
    p.backYardPercent = backYardPercent;
    p.storeys = storeys;
    p.roadWidthInM = roadWidthInM;
    p.sidewalkWidthInM = sidewalkWidthInM;
    p.lanewayWidthInM = lanewayWidthInM;
    p.maxBlockLengthInM = maxBlockLengthInM;
    p.includeParks = includeParks;
    p.oneParkPerThisManyHousingBlocks = oneParkPerThisManyHousingBlocks;
    return p;
  }

  function resetForm() {
    lotWidth = DefaultInputConfig.lotWidth;
    lotDepth = DefaultInputConfig.lotDepth;
    frontYardPercent = DefaultInputConfig.frontYardPercent;
    sideYardPercent = DefaultInputConfig.sideYardPercent;
    backYardPercent = DefaultInputConfig.backYardPercent;
    storeys = DefaultInputConfig.storeys;
    averageUnitSizeInSqM = DefaultInputConfig.averageUnitSizeInSqM;
    roadWidthInM = DefaultInputConfig.roadWidthInM;
    sidewalkWidthInM = DefaultInputConfig.sidewalkWidthInM;
    lanewayWidthInM = DefaultInputConfig.lanewayWidthInM;
    maxBlockLengthInM = DefaultInputConfig.maxBlockLengthInM;
    includeParks = DefaultInputConfig.includeParks;
    oneParkPerThisManyHousingBlocks = DefaultInputConfig.oneParkPerThisManyHousingBlocks;
  }
</script>

<style>
  .layout-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1rem;
  }
  .two-column-layout {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  @media (min-width: 768px) {
    .two-column-layout {
      flex-direction: row;
    }
    .results-column {
      width: 50%;
    }
    .options-column {
      width: 50%;
      max-width: 28rem;
    }
  }
</style>

<div class="layout-container">
  <div class="mb-6">
    <h1 class="text-3xl font-bold">Neighbourhood Visualizer</h1>
    <p class="text-gray-600">
      A tool to quickly estimate the effects of land use policy and road width.
      <a href="https://github.com/rgwood/NeighbourhoodVisualizer" class="text-blue-600 underline">
        Source code available
      </a>.
    </p>
  </div>

  <div class="two-column-layout">
    <div class="results-column">
      <ResultsPanel
        bind:canvas
        {isValid}
        {yardRatio}
        {roadRatio}
        {sidewalkRatio}
        {parkRatio}
        {buildingRatio}
        {floorSpaceIn1SqKm}
        {lotsIn1SqKm}
        {bldgArea}
        {lotWidth}
        {lotDepth}
        {storeys}
        {averageUnitSizeInSqM}
        {includeParks}
      />
    </div>

    <div class="options-column">
      <OptionsPanel
        bind:lotWidth
        bind:lotDepth
        bind:frontYardPercent
        bind:sideYardPercent
        bind:backYardPercent
        bind:storeys
        bind:roadWidthInM
        bind:sidewalkWidthInM
        bind:lanewayWidthInM
        bind:maxBlockLengthInM
        bind:includeParks
        bind:oneParkPerThisManyHousingBlocks
        bind:averageUnitSizeInSqM
        {isValid}
        on:reset={resetForm}
      />
    </div>
  </div>
</div>
