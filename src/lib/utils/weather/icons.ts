// src/lib/utils/weather/icons.ts
import { ECloudiness, EDayPeriod, EIntensity, EPrecipKind, EWeatherIconHint } from "@/types/weather.types";

/** Map Open-Meteo WMO -> canonical label + icon + rich hints. */
export function wmoToHints(wmo?: number) {
  // Defaults
  let label = "Unknown";
  let iconHint = EWeatherIconHint.UNKNOWN;
  let cloudiness = ECloudiness.CLEAR;
  let precipKind = EPrecipKind.NONE;
  let intensity = EIntensity.NONE;
  let hasThunder = false;
  let hasHail = false;
  let isFreezing = false;
  let isFog = false;

  switch (wmo) {
    case 0:
      label = "Clear sky";
      iconHint = EWeatherIconHint.CLEAR;
      cloudiness = ECloudiness.CLEAR;
      break;
    case 1:
      label = "Mainly clear";
      iconHint = EWeatherIconHint.MOSTLY_CLEAR;
      cloudiness = ECloudiness.MAINLY_CLEAR;
      break;
    case 2:
      label = "Partly cloudy";
      iconHint = EWeatherIconHint.PARTLY_CLOUDY;
      cloudiness = ECloudiness.PARTLY_CLOUDY;
      break;
    case 3:
      label = "Overcast";
      iconHint = EWeatherIconHint.CLOUDY;
      cloudiness = ECloudiness.OVERCAST;
      break;

    case 45:
    case 48:
      label = wmo === 45 ? "Fog" : "Depositing rime fog";
      iconHint = EWeatherIconHint.FOG;
      cloudiness = ECloudiness.FOG;
      isFog = true;
      break;

    case 51:
    case 53:
    case 55:
      label = "Drizzle";
      iconHint = EWeatherIconHint.DRIZZLE;
      precipKind = EPrecipKind.DRIZZLE;
      intensity = wmo === 51 ? EIntensity.LIGHT : wmo === 53 ? EIntensity.MODERATE : EIntensity.HEAVY;
      break;

    case 56:
    case 57:
      label = "Freezing drizzle";
      iconHint = EWeatherIconHint.FREEZING_DRIZZLE;
      precipKind = EPrecipKind.FREEZING_DRIZZLE;
      isFreezing = true;
      intensity = wmo === 56 ? EIntensity.LIGHT : EIntensity.HEAVY;
      break;

    case 61:
    case 63:
    case 65:
      label = "Rain";
      iconHint = EWeatherIconHint.RAIN;
      precipKind = EPrecipKind.RAIN;
      intensity = wmo === 61 ? EIntensity.LIGHT : wmo === 63 ? EIntensity.MODERATE : EIntensity.HEAVY;
      break;

    case 66:
    case 67:
      label = "Freezing rain";
      iconHint = EWeatherIconHint.FREEZING_RAIN;
      precipKind = EPrecipKind.FREEZING_RAIN;
      isFreezing = true;
      intensity = wmo === 66 ? EIntensity.LIGHT : EIntensity.HEAVY;
      break;

    case 71:
    case 73:
    case 75:
      label = "Snow";
      iconHint = EWeatherIconHint.SNOW;
      precipKind = EPrecipKind.SNOW;
      intensity = wmo === 71 ? EIntensity.LIGHT : wmo === 73 ? EIntensity.MODERATE : EIntensity.HEAVY;
      break;

    case 77:
      label = "Snow grains";
      iconHint = EWeatherIconHint.SNOW;
      precipKind = EPrecipKind.SNOW;
      intensity = EIntensity.LIGHT;
      break;

    case 80:
    case 81:
    case 82:
      label = "Rain showers";
      iconHint = EWeatherIconHint.SHOWERS;
      precipKind = EPrecipKind.SHOWERS;
      intensity = wmo === 80 ? EIntensity.LIGHT : wmo === 81 ? EIntensity.MODERATE : EIntensity.HEAVY;
      break;

    case 85:
    case 86:
      label = "Snow showers";
      iconHint = EWeatherIconHint.SNOW_SHOWERS;
      precipKind = EPrecipKind.SNOW_SHOWERS;
      intensity = wmo === 85 ? EIntensity.LIGHT : EIntensity.HEAVY;
      break;

    case 95:
      label = "Thunderstorm";
      iconHint = EWeatherIconHint.THUNDER;
      hasThunder = true;
      precipKind = EPrecipKind.SHOWERS;
      break;

    case 96:
    case 99:
      label = "Thunderstorm with hail";
      iconHint = EWeatherIconHint.THUNDER_HAIL;
      hasThunder = true;
      hasHail = true;
      precipKind = EPrecipKind.SHOWERS;
      intensity = wmo === 99 ? EIntensity.HEAVY : EIntensity.MODERATE;
      break;

    default:
      // unknown stays default
      break;
  }

  return {
    label,
    iconHint,
    cloudiness,
    precipKind,
    intensity,
    hasThunder,
    hasHail,
    isFreezing,
    isFog,
  };
}

/** Day/night from Open-Meteo's `is_day` */
export function toDayPeriod(isDay?: number | boolean | null) {
  if (isDay === 1 || isDay === true) return EDayPeriod.DAY;
  if (isDay === 0 || isDay === false) return EDayPeriod.NIGHT;
  return EDayPeriod.UNKNOWN;
}

/** Simple Beaufort-like wind buckets using km/h */
export function windToCategory(kph?: number | null) {
  const v = typeof kph === "number" ? kph : -1;
  if (v < 2) return "calm";
  if (v < 12) return "light";
  if (v < 29) return "moderate";
  if (v < 50) return "fresh";
  if (v < 75) return "strong";
  if (v < 103) return "gale";
  if (v < 118) return "storm";
  return "hurricane";
}
