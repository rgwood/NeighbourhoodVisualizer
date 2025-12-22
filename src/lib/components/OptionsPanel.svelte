<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let lotWidth: number;
  export let lotDepth: number;
  export let frontYardPercent: number;
  export let sideYardPercent: number;
  export let backYardPercent: number;
  export let storeys: number;
  export let averageUnitSizeInSqM: number;
  export let roadWidthInM: number;
  export let sidewalkWidthInM: number;
  export let lanewayWidthInM: number;
  export let maxBlockLengthInM: number;
  export let includeParks: boolean;
  export let oneParkPerThisManyHousingBlocks: number;
  export let isValid: boolean;
</script>

<div class="bg-white dark:bg-gray-800 border-2 border-blue-500 dark:border-blue-400 rounded-lg">
  <div class="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 font-semibold flex justify-between items-center">
    <span>Options</span>
    <button
      on:click={() => dispatch('reset')}
      class="bg-white dark:bg-gray-700 text-blue-500 dark:text-blue-300 px-3 py-1 rounded text-sm font-normal hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors"
    >
      Reset?
    </button>
  </div>

  <div class="p-4 space-y-6 text-sm dark:text-gray-200">
    <!-- Setback Requirements -->
    <div>
      <h5 class="text-base font-semibold mb-3">Setback Requirements</h5>

      <label for="frontYard" class="block mb-2">
        Front yard: at least <strong>{frontYardPercent}%</strong> of lot depth
      </label>
      <input
        id="frontYard"
        type="range"
        min="0"
        max="100"
        bind:value={frontYardPercent}
        class="w-full"
      />

      <label for="sideYard" class="block mb-2 mt-3">
        Side yard: at least <strong>{sideYardPercent}%</strong> of lot width
      </label>
      <input
        id="sideYard"
        type="range"
        min="0"
        max="100"
        bind:value={sideYardPercent}
        class="w-full"
      />

      <label for="backYard" class="block mb-2 mt-3">
        Back yard: at least <strong>{backYardPercent}%</strong> of lot depth
      </label>
      <input
        id="backYard"
        type="range"
        min="0"
        max="100"
        bind:value={backYardPercent}
        class="w-full"
      />
    </div>

    <!-- Streets -->
    <div>
      <h5 class="text-base font-semibold mb-3">Streets</h5>

      <label for="roadWidth" class="block mb-2">
        Road width: <strong>{roadWidthInM}m</strong>
      </label>
      <input
        id="roadWidth"
        type="range"
        min="0"
        max="30"
        bind:value={roadWidthInM}
        class="w-full"
      />

      <label for="lanewayWidth" class="block mb-2 mt-3">
        Laneway width: <strong>{lanewayWidthInM}m</strong>
      </label>
      <input
        id="lanewayWidth"
        type="range"
        min="0"
        max="30"
        bind:value={lanewayWidthInM}
        class="w-full"
      />

      <label for="sidewalkWidth" class="block mb-2 mt-3">
        Sidewalk/<a href="http://www.riversidemo.com/publicworks/page/curbs-sidewalks-and-right-way"
                     class="text-blue-600 dark:text-blue-400 underline">ROW</a> width: <strong>{sidewalkWidthInM}m</strong>
      </label>
      <input
        id="sidewalkWidth"
        type="range"
        min="0"
        max="30"
        bind:value={sidewalkWidthInM}
        class="w-full"
      />
    </div>

    <!-- Blocks -->
    <div>
      <h5 class="text-base font-semibold mb-3">Blocks</h5>

      <label for="maxBlockLength" class="block mb-2">
        Maximum block length: <strong>{maxBlockLengthInM}m</strong>
      </label>
      <input
        id="maxBlockLength"
        type="range"
        min="20"
        max="300"
        bind:value={maxBlockLengthInM}
        class="w-full"
      />
    </div>

    <!-- Maximum number of floors -->
    <div>
      <h5 class="text-base font-semibold mb-3">Maximum number of floors</h5>

      <label for="storeys" class="block mb-2">
        Buildings are allowed to be <strong>{storeys}</strong> storeys tall
      </label>
      <input
        id="storeys"
        type="range"
        min="1"
        max="20"
        bind:value={storeys}
        class="w-full"
      />
    </div>

    <!-- Lot Size (text inputs) -->
    <div>
      <h5 class="text-base font-semibold mb-3">Lot Size (in metres)</h5>

      <label class="block mb-3">
        Width:
        <input
          type="number"
          step="0.1"
          bind:value={lotWidth}
          class="w-full px-3 py-2 border dark:border-gray-600 rounded mt-1 dark:bg-gray-700 dark:text-white"
        />
      </label>

      <label class="block">
        Depth:
        <input
          type="number"
          step="0.1"
          bind:value={lotDepth}
          class="w-full px-3 py-2 border dark:border-gray-600 rounded mt-1 dark:bg-gray-700 dark:text-white"
        />
      </label>
    </div>

    <!-- Average Unit Size -->
    <div>
      <h5 class="text-base font-semibold mb-3">Average Unit Size</h5>

      <label for="averageUnitSize" class="block mb-2">
        Average unit size: <strong>{averageUnitSizeInSqM} m²</strong>
      </label>
      <input
        id="averageUnitSize"
        type="range"
        min="30"
        max="300"
        bind:value={averageUnitSizeInSqM}
        class="w-full"
      />
    </div>

    <!-- Parks -->
    <div>
      <h5 class="text-base font-semibold mb-3">Parks</h5>

      <label class="flex items-center mb-3">
        <input
          type="checkbox"
          bind:checked={includeParks}
          class="mr-2"
        />
        Include parks?
      </label>

      <label for="oneParkPerThisManyHousingBlocks" class="block mb-2">
        One park block per every <strong>{oneParkPerThisManyHousingBlocks}</strong> blocks
      </label>
      <input
        id="oneParkPerThisManyHousingBlocks"
        type="range"
        min="2"
        max="20"
        bind:value={oneParkPerThisManyHousingBlocks}
        class="w-full"
      />
    </div>
  </div>
</div>
