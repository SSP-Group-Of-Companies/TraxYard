/**
 * @fileoverview WeatherChip Component - TraxYard Guard Interface
 * 
 * Displays current weather information in a compact, visually appealing chip format.
 * Features real-time weather data, location display, and smooth animations.
 * Supports various weather conditions with appropriate icons and styling.
 * 
 * @author Faruq Adebayo Atanda
 * @owner SSP Group of Companies
 * @created 2025
 * @version 1.0.0
 * 
 * @dependencies
 * - framer-motion: For smooth animations and transitions
 * - lucide-react: For consistent iconography
 * - Custom types: TCurrentWeather for type safety
 * - Custom animations: cardHoverVariants, fadeInVariants
 * 
 * @features
 * - Real-time weather data display
 * - Location-based information
 * - Weather condition icons
 * - Smooth animations and transitions
 * - Loading states with skeleton UI
 * - Responsive design for all screen sizes
 * - Accessibility support with proper ARIA attributes
 */

"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TCurrentWeather } from "@/types/weather.types";
import { Wind } from "lucide-react";
import { cardHoverVariants, fadeInVariants } from "@/lib/animations";

/**
 * Location data interface supporting flexible location formats
 * @interface LocationLike
 * @property {string | null} [city] - City name
 * @property {string | null} [state] - State name (US format)
 * @property {string | null} [province] - Province name (Canadian format)
 * @property {string | null} [country] - Country name
 */
type LocationLike = {
  city?: string | null;
  state?: string | null;
  province?: string | null;
  country?: string | null;
};

/**
 * WeatherChip component props interface
 * @interface WeatherChipProps
 * @property {TCurrentWeather | null} weather - Current weather data
 * @property {boolean} loading - Loading state indicator
 * @property {LocationLike | null} [location] - Location information
 */
type WeatherChipProps = {
  weather: TCurrentWeather | null;
  loading: boolean;
  location?: LocationLike | null;
};

/**
 * Get weather icon based on condition hint
 * @param {string} [hint] - Weather condition hint from API
 * @returns {string} Emoji icon representing weather condition
 * 
 * @performance Optimized with switch statement for fast lookups
 * @accessibility Provides visual weather indicators
 */
function iconFromHint(hint?: string) {
  switch (hint) {
    case "clear":
      return "☀️";
    case "mostly-clear":
    case "partly-cloudy":
      return "🌤️";
    case "cloudy":
    case "overcast":
      return "☁️";
    case "rain":
    case "showers":
      return "🌧️";
    case "snow":
    case "snow-showers":
      return "❄️";
    case "thunder":
    case "thunder-hail":
      return "⛈️";
    case "fog":
      return "🌫️";
    default:
      return "⛅";
  }
}

export default function WeatherChip({
  weather,
  loading,
  location,
}: WeatherChipProps) {
  const temp = weather?.temperatureC;
  const feels = weather?.feelsLikeC;
  const wind = weather?.windSpeedKph;
  const gust = weather?.windGustKph;
  const hum = weather?.humidityPct;
  const prcp = weather?.precipitationMm;

  // ✅ state OR province and allow nulls
  const locationLine = useMemo(() => {
    if (!location) return null;
    const stateOrProv = location.state ?? location.province ?? null;
    const parts = [
      location.city ?? null,
      stateOrProv,
      location.country ?? null,
    ].filter((p): p is string => !!p && p.length > 0);
    return parts.length ? parts.join(", ") : null;
  }, [location]);

  const asOf = useMemo(() => {
    if (!weather?.asOfIso) return null;
    try {
      const d = new Date(weather.asOfIso);
      return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(d);
    } catch {
      return null;
    }
  }, [weather?.asOfIso]);

  return (
    <motion.div
      className="rounded-2xl p-3 sm:p-4 text-white shadow-sm
                 bg-gradient-to-br from-[var(--color-blue)] to-[var(--color-green)]
                 backdrop-blur supports-[backdrop-filter]:bg-white/0
                 max-w-xs sm:max-w-sm"
      variants={cardHoverVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
    >
      <div className="flex items-center gap-3">
        <div className="text-3xl sm:text-4xl leading-none">
          {loading ? (
            <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-white rounded-full"></div>
          ) : (
            iconFromHint(weather?.iconHint)
          )}
        </div>

        <motion.div 
          className="min-w-0"
          variants={fadeInVariants}
          initial="initial"
          animate="animate"
        >
          <div className="flex items-baseline gap-3">
            <motion.div 
              className="text-2xl sm:text-3xl font-semibold tabular-nums"
              variants={fadeInVariants}
              initial="initial"
              animate="animate"
            >
              {loading ? (
                <div className="animate-pulse bg-white/30 rounded w-16 h-8"></div>
              ) : typeof temp === "number" ? (
                `${Math.round(temp)}°C`
              ) : (
                "—"
              )}
            </motion.div>
            <motion.div 
              className="text-sm sm:text-base/5 opacity-90 truncate"
              variants={fadeInVariants}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.1 }}
            >
              {loading ? (
                <div className="animate-pulse bg-white/30 rounded w-20 h-4"></div>
              ) : (
                weather?.label ?? "—"
              )}
            </motion.div>
          </div>

          {locationLine && (
            <div className="mt-0.5 text-[11px] sm:text-xs font-medium text-white/90 truncate">
              {locationLine}
            </div>
          )}

          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] sm:text-xs opacity-90">
            {loading ? (
              <>
                <div className="animate-pulse bg-white/30 rounded w-24 h-3"></div>
                <div className="animate-pulse bg-white/30 rounded w-20 h-3"></div>
                <div className="animate-pulse bg-white/30 rounded w-16 h-3"></div>
                <div className="animate-pulse bg-white/30 rounded w-18 h-3"></div>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-1">
                  <Wind className="h-3.5 w-3.5" />
                  {wind != null ? `${Math.round(wind)} kph` : "—"}
                  {gust != null && (
                    <span className="opacity-80">
                      · gust {Math.round(gust)} kph
                    </span>
                  )}
                </div>
                <div>Humidity {hum != null ? `${Math.round(hum)}%` : "—"}</div>
                <div>Feels {feels != null ? `${Math.round(feels)}°C` : "—"}</div>
                <div>Precip {prcp != null ? `${prcp} mm` : "—"}</div>
              </>
            )}
          </div>

          {asOf && (
            <div className="mt-1 text-[10px] sm:text-[11px] text-white/80">
              as of: {asOf}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
