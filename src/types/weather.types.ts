// src/types/weather.types.ts
export enum EWeatherIconHint {
  CLEAR = "clear",
  MOSTLY_CLEAR = "mostly-clear",
  PARTLY_CLOUDY = "partly-cloudy",
  CLOUDY = "cloudy",
  FOG = "fog",
  DRIZZLE = "drizzle",
  FREEZING_DRIZZLE = "freezing-drizzle",
  RAIN = "rain",
  FREEZING_RAIN = "freezing-rain",
  SNOW = "snow",
  SHOWERS = "showers",
  SNOW_SHOWERS = "snow-showers",
  THUNDER = "thunder",
  THUNDER_HAIL = "thunder-hail",
  UNKNOWN = "unknown",
}

export enum EPrecipKind {
  NONE = "none",
  DRIZZLE = "drizzle",
  RAIN = "rain",
  SHOWERS = "showers",
  SNOW = "snow",
  SNOW_SHOWERS = "snow-showers",
  FREEZING_DRIZZLE = "freezing-drizzle",
  FREEZING_RAIN = "freezing-rain",
  MIXED = "mixed",
}

export enum EIntensity {
  NONE = "none",
  LIGHT = "light",
  MODERATE = "moderate",
  HEAVY = "heavy",
}

export enum ECloudiness {
  CLEAR = "clear",
  MAINLY_CLEAR = "mainly-clear",
  PARTLY_CLOUDY = "partly-cloudy",
  OVERCAST = "overcast",
  FOG = "fog",
}

export enum EDayPeriod {
  DAY = "day",
  NIGHT = "night",
  UNKNOWN = "unknown",
}

export enum EWindCategory {
  CALM = "calm", // < 2 km/h
  LIGHT = "light", // 2–11
  MODERATE = "moderate", // 12–28
  FRESH = "fresh", // 29–49
  STRONG = "strong", // 50–74
  GALE = "gale", // 75–102
  STORM = "storm", // 103–117
  HURRICANE = "hurricane", // >= 118
}

export type TCurrentWeather = {
  provider: "open-meteo";
  asOfIso: string | null;

  // Basic readings
  temperatureC: number | null;
  feelsLikeC: number | null;
  windSpeedKph: number | null;
  windGustKph: number | null;
  windCategory: EWindCategory;
  humidityPct: number | null;
  precipitationMm: number | null;
  cloudCoverPct: number | null;

  // WMO + derived hints
  wmoCode: number | null;
  label: string;
  iconHint: EWeatherIconHint;

  // Rich hints for UI flexibility
  isDay: boolean | null;
  dayPeriod: EDayPeriod;

  cloudiness: ECloudiness;
  precipKind: EPrecipKind;
  intensity: EIntensity;

  hasThunder: boolean;
  hasHail: boolean;
  isFreezing: boolean; // freezing drizzle/rain (icing risk)
  isFog: boolean;
};
