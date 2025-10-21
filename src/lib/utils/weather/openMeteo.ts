// src/lib/utils/weather/openMeteo.ts
import { AppError } from "@/lib/utils/apiResponse";
import { EDayPeriod, EWindCategory, TCurrentWeather } from "@/types/weather.types";
import { toDayPeriod, wmoToHints, windToCategory } from "./icons";

/** Current weather via Open-Meteo for lat/lon with rich UI hints. */
export async function getOpenMeteoCurrent(lat: number, lon: number): Promise<TCurrentWeather> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: "auto",
    // pull as many helpful "current" vars as possible
    current: ["temperature_2m", "apparent_temperature", "precipitation", "weather_code", "is_day", "wind_speed_10m", "wind_gusts_10m", "relative_humidity_2m", "cloud_cover"].join(","),
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { cache: "no-store" });
  if (!res.ok) throw new AppError(res.status, `Open-Meteo error (${res.status})`);

  const json = await res.json();
  const c = json?.current ?? {};

  const wmo = typeof c.weather_code === "number" ? (c.weather_code as number) : undefined;
  const { label, iconHint, cloudiness, precipKind, intensity, hasThunder, hasHail, isFreezing, isFog } = wmoToHints(wmo);

  const windKph = typeof c.wind_speed_10m === "number" ? Math.round(c.wind_speed_10m * 3.6) : null; // m/s -> km/h
  const gustKph = typeof c.wind_gusts_10m === "number" ? Math.round(c.wind_gusts_10m * 3.6) : null;

  const windCategory = windToCategory(windKph) as EWindCategory;

  const isDayVal = c.is_day as number | undefined;
  const dayPeriod = toDayPeriod(isDayVal) as EDayPeriod;

  return {
    provider: "open-meteo",
    asOfIso: c.time ?? null,

    temperatureC: c.temperature_2m ?? null,
    feelsLikeC: c.apparent_temperature ?? null,
    windSpeedKph: windKph,
    windGustKph: gustKph,
    windCategory,
    humidityPct: c.relative_humidity_2m ?? null,
    precipitationMm: c.precipitation ?? null,
    cloudCoverPct: c.cloud_cover ?? null,

    wmoCode: (wmo ?? null) as number | null,
    label,
    iconHint,

    isDay: typeof isDayVal === "number" ? isDayVal === 1 : null,
    dayPeriod,

    cloudiness,
    precipKind,
    intensity,

    hasThunder,
    hasHail,
    isFreezing,
    isFog,
  };
}
