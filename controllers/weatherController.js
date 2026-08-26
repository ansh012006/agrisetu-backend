const TIMEOUT_MS = 10000;

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Weather service timed out.")), ms)),
  ]);

// @route   GET /api/weather?lat=&lng=
export const getWeather = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    const latitude = Number(lat);
    const longitude = Number(lng);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({ success: false, message: "Valid lat and lng query parameters are required." });
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&timezone=auto`;

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

    res.status(200).json({
      success: true,
      weather: {
        temperature: current.temperature_2m ?? null,
        humidity: current.relative_humidity_2m ?? null,
        windSpeed: current.wind_speed_10m ?? null,
        precipitation: current.precipitation ?? null,
        description: current.precipitation > 0 ? "Rainy" : "Clear",
        locationName: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
      },
    });
  } catch (error) {
    next(error);
  }
};
