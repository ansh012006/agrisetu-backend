// Common denominator for every land-area calculation in this app is
// acres - both the coupon rate rules and a farmer's own land record can
// be authored in different units, so everything gets normalized here
// before being compared or divided.
const ACRE_CONVERSION = {
  acre: 1,
  hectare: 2.47105,
  bigha: 0.625, // approximate, varies by region in real life - a
                // reasonable single conversion factor for this app's scope
  guntha: 0.025,
  sqft: 1 / 43560,
  sqm: 1 / 4046.86,
};

export const toAcres = (value, unit) => {
  const factor = ACRE_CONVERSION[unit];
  if (!factor || typeof value !== "number" || Number.isNaN(value)) return 0;
  return value * factor;
};
