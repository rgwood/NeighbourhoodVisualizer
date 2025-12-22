<script lang="ts">
  import { formatPercent, formatNumber } from '../utils/formatters';

  export let canvas: HTMLCanvasElement | undefined;
  export let isValid: boolean;
  export let yardRatio: number;
  export let roadRatio: number;
  export let sidewalkRatio: number;
  export let parkRatio: number;
  export let buildingRatio: number;
  export let floorSpaceIn1SqKm: number;
  export let lotsIn1SqKm: number;
  export let bldgArea: number;
  export let lotWidth: number;
  export let lotDepth: number;
  export let storeys: number;
  export let averageUnitSizeInSqM: number;
  export let includeParks: boolean;
</script>

<div class="bg-white border-2 border-blue-500 rounded-lg">
  <div class="bg-blue-500 text-white px-4 py-2 font-semibold">
    Results
  </div>
  <div class="p-4">
    <canvas
      bind:this={canvas}
      id="setbackCanvas"
      width="1000"
      height="913"
      class="w-full max-w-full h-auto mx-auto block border border-gray-300"
    ></canvas>

    {#if isValid}
      <div class="mt-4 space-y-4 text-sm">
        <p>
          The land is covered by <strong>{formatPercent(yardRatio)}</strong> "yards",
          <strong>{formatPercent(roadRatio)}</strong> roads,
          <strong>{formatPercent(sidewalkRatio)}</strong> sidewalks/
          <a href="http://www.riversidemo.com/publicworks/page/curbs-sidewalks-and-right-way"
             class="text-blue-600 underline">ROW</a>,
          {#if includeParks}
            <strong>{formatPercent(parkRatio)}</strong> parks,
          {/if}
          and <strong>{formatPercent(buildingRatio)}</strong> buildings.
          1 km<sup>2</sup> of blocks like this could have roughly:
        </p>

        <ul class="list-disc ml-6 space-y-1">
          <li>
            <strong>{formatNumber(floorSpaceIn1SqKm)} m<sup>2</sup></strong> of floor space
          </li>
          <li>
            <strong>{formatNumber(lotsIn1SqKm)}</strong> buildings
          </li>
          <li>
            <strong>{formatNumber(floorSpaceIn1SqKm / averageUnitSizeInSqM)}</strong> homes
            with an average size of {formatNumber(averageUnitSizeInSqM)} m<sup>2</sup>
            <small class="text-gray-600">
              (<em>if</em> the city allows multiple households to live in the same building)
            </small>
          </li>
        </ul>

        <p>
          The max <a href="https://en.wikipedia.org/wiki/Floor_area_ratio" class="text-blue-600 underline">
          Floor Area Ratio (FAR)</a> on a given lot is effectively
          <strong>{formatNumber((bldgArea * storeys) / (lotWidth * lotDepth), 2)}</strong>, but the max
          <em>gross</em> (including streets{#if includeParks} and parks{/if}) FAR of the entire neighbourhood is
          <strong>{formatNumber(floorSpaceIn1SqKm / 1000000, 2)}</strong>.
        </p>

        <p>
          The <span class="font-semibold" style="color:rgb(0, 82, 110)">building footprint</span> can cover
          <strong>{formatNumber(bldgArea)} m<sup>2</sup></strong> at most on a
          <strong>{formatNumber(lotWidth * lotDepth)} m<sup>2</sup></strong> lot, or
          <strong>{formatPercent(bldgArea / (lotWidth * lotDepth))}</strong> of the lot.
          With {storeys}-storey buildings, we can have
          <strong>{formatNumber(bldgArea * storeys)} m<sup>2</sup></strong> of floor space per lot.
        </p>
      </div>
    {:else}
      <div class="text-red-600 mt-4">
        Parameters not valid, please try adjusting or resetting them.
        This often occurs when the maximum block size is too small for a single lot.
      </div>
    {/if}
  </div>
</div>
