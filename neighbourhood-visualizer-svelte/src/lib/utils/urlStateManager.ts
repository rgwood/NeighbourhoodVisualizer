import * as qs from 'qs';
import type { VisualizerParameters } from '../models/VisualizerParameters';
import type { InputConfig } from './validators';
import { DefaultInputConfig } from './validators';

export function loadParametersFromURL(): Partial<InputConfig> | null {
  if (!window.location.search.startsWith('?')) {
    return null;
  }

  const queryParams: any = qs.parse(window.location.search.substring(1));

  const tryParseNumber = (queryParam: any, fallback: number): number => {
    // special case because 0 will not evaluate to truthy, and thus the code below will use the fallback...
    if (queryParam === '0') {
      return 0;
    }
    const parsed = Number(queryParam);
    return !!parsed ? parsed : fallback;
  };

  return {
    lotWidth: tryParseNumber(queryParams.low, DefaultInputConfig.lotWidth),
    lotDepth: tryParseNumber(queryParams.lod, DefaultInputConfig.lotDepth),
    frontYardPercent: tryParseNumber(queryParams.fyp, DefaultInputConfig.frontYardPercent),
    sideYardPercent: tryParseNumber(queryParams.syp, DefaultInputConfig.sideYardPercent),
    backYardPercent: tryParseNumber(queryParams.byp, DefaultInputConfig.backYardPercent),
    storeys: tryParseNumber(queryParams.st, DefaultInputConfig.storeys),
    averageUnitSizeInSqM: tryParseNumber(queryParams.aus, DefaultInputConfig.averageUnitSizeInSqM),
    roadWidthInM: tryParseNumber(queryParams.rw, DefaultInputConfig.roadWidthInM),
    sidewalkWidthInM: tryParseNumber(queryParams.sw, DefaultInputConfig.sidewalkWidthInM),
    lanewayWidthInM: tryParseNumber(queryParams.law, DefaultInputConfig.lanewayWidthInM),
    maxBlockLengthInM: tryParseNumber(queryParams.mbl, DefaultInputConfig.maxBlockLengthInM),
    includeParks: queryParams.ip !== undefined ? queryParams.ip.toLowerCase() === 'true' : DefaultInputConfig.includeParks,
    oneParkPerThisManyHousingBlocks: tryParseNumber(queryParams.pphb, DefaultInputConfig.oneParkPerThisManyHousingBlocks)
  };
}

export function updateURLWithParameters(params: VisualizerParameters): void {
  const queryParams = params.toQueryParamFormat();
  const queryString = qs.stringify(queryParams);
  const newURL = `${window.location.pathname}?${queryString}`;
  window.history.replaceState(null, '', newURL);
}
