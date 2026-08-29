const TIMEOUT_MS = 10000;

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Weather service timed out.")), ms)),
  ]);

// @route   GET /api/weather?lat=&lng=
// Returns current conditions plus a 5-day daily forecast, both from a
// single Open-Meteo call (it supports "current" and "daily" params
// together, so this doesn't need two separate requests).
export const getWeather = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    const latitude = Number(lat);
    const longitude = Number(lng);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({ success: false, message: "Valid lat and lng query parameters are required." });
    }

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max` +
      `&timezone=auto&forecast_days=6`;

    let response;
    try {
      response = await withTimeout(fetch(url), TIMEOUT_MS);
    } catch (err) {
      return res.status(502).json({ success: false, message: "Could not reach the weather service." });
    }

    if (!response.ok) {
      return res.status(502).json({ success: false, message: "The weather service returned an error." });
    }

    const data = await response.json();
    const current = data.current || {};
    const daily = data.daily || {};

    // Skip index 0 - that's today, already covered by "current" above.
    // Take the next 5 days as the forecast list.
    const forecast = [];
    const dates = daily.time || [];
    for (let i = 1; i < dates.length; i++) {
      forecast.push({
        date: dates[i],
        maxTemperature: daily.temperature_2m_max?.[i] ?? null,
        minTemperature: daily.temperature_2m_min?.[i] ?? null,
        precipitationSum: daily.precipitation_sum?.[i] ?? null,
        precipitationProbability: daily.precipitation_probability_max?.[i] ?? null,
      });
    }

    res.status(200).json({
      success: true,
      weather: {
        temperature: current.temperature_2m ?? null,
        humidity: current.relative_humidity_2m ?? null,
        windSpeed: current.wind_speed_10m ?? null,
        precipitation: current.precipitation ?? null,
        description: current.precipitation > 0 ? "Rainy" : "Clear",
        locationName: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
        forecast,
      },
    });
  } catch (error) {
    next(error);
  }
};
