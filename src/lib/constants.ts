function isDarkMode(): boolean {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function getBuildingColour(): string {
  return isDarkMode() ? 'rgb(100, 181, 246)' : 'rgb(0, 82, 110)';
}

export function getYardColour(): string {
  return isDarkMode() ? 'rgb(55, 65, 81)' : 'rgb(240, 240, 240)';
}

export function getRoadColour(): string {
  return isDarkMode() ? 'rgb(156, 163, 175)' : 'rgb(84, 84, 84)';
}

export function getParkColour(): string {
  return isDarkMode() ? 'rgb(74, 222, 128)' : 'rgb(57, 178, 30)';
}

export function getSidewalkColour(): string {
  return isDarkMode() ? 'rgb(107, 114, 128)' : 'rgb(209, 209, 209)';
}

export const MaxBuildingsToDraw = 10000;
