const DEFAULT_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";

const withTimeout = (promise, ms) =>
 Promise.race([
 promise,
 new Promise((_, reject) => setTimeout(() => reject(new Error("Mandi API timed out.")), ms)),
 ]);

const MOCK_PRICES = [
 { commodity: "Wheat", state: "Maharashtra", district: "Mumbai", market: "Mumbai", minPrice: 2125, maxPrice: 2250, modalPrice: 2200, date: new Date().toISOString() },
 { commodity: "Rice", state: "Maharashtra", district: "Mumbai", market: "Mumbai", minPrice: 3100, maxPrice: 3250, modalPrice: 3180, date: new Date().toISOString() },
 { commodity: "Onion", state: "Maharashtra", district: "Nashik", market: "Nashik", minPrice: 800, maxPrice: 1200, modalPrice: 1000, date: new Date().toISOString() },
 { commodity: "Cotton", state: "Maharashtra", district: "Nagpur", market: "Nagpur", minPrice: 5500, maxPrice: 6000, modalPrice: 5800, date: new Date().toISOString() },
 { commodity: "Sugarcane", state: "Maharashtra", district: "Pune", market: "Pune", minPrice: 280, maxPrice: 320, modalPrice: 300, date: new Date().toISOString() },
 { commodity: "Soybean", state: "Maharashtra", district: "Nagpur", market: "Nagpur", minPrice: 4200, maxPrice: 4600, modalPrice: 4400, date: new Date().toISOString() },
 { commodity: "Maize", state: "Maharashtra", district: "Solapur", market: "Solapur", minPrice: 1850, maxPrice: 2050, modalPrice: 1950, date: new Date().toISOString() },
];

export async function searchMandiPrices({ commodity, state, district }) {
  // Read env here, not at import time (dotenv loads after imports).
  const DATA_GOV_API_KEY = process.env.DATA_GOV_IN_API_KEY;
  const RESOURCE_ID = process.env.DATA_GOV_IN_MANDI_RESOURCE_ID || DEFAULT_RESOURCE_ID;
  const TIMEOUT_MS = parseInt(process.env.DATA_GOV_IN_TIMEOUT_MS || "15000");
  // Try live data.gov.in API if key is available
  if (DATA_GOV_API_KEY && RESOURCE_ID) {
 try {
 const filters = [];
 if (commodity) filters.push(`commodity eq "${commodity}"`);
 if (state) filters.push(`state eq "${state}"`);
 if (district) filters.push(`district eq "${district}"`);

 const filterParam = filters.length > 0 ? `&filters=${encodeURIComponent(JSON.stringify(filters))}` : "";

 const url = `https://api.data.gov.in/resource/${RESOURCE_ID}?api-key=${DATA_GOV_API_KEY}&format=json&limit=50${filterParam}`;

  const response = await withTimeout(fetch(url), TIMEOUT_MS);
  if (response.ok) {
  const data = await response.json();
  const records = data.records || [];
  const prices = records.map((r) => ({
  commodity: r.commodity || r["Commodity"] || "",
  state: r.state || r["State"] || "",
  district: r.district || r["District"] || "",
  market: r.market || r["Market"] || "",
  variety: r.variety || r["Variety"] || "",
  minPrice: Number(r.min_price || r["Min Price"] || 0),
  maxPrice: Number(r.max_price || r["Max Price"] || 0),
  modalPrice: Number(r.modal_price || r["Modal Price"] || 0),
  date: r.arrival_date || r["Arrival_Date"] || new Date().toISOString(),
  arrivalDate: r.arrival_date || r["Arrival_Date"] || new Date().toISOString(),
  }));
  // ponytail: dual shape (prices+records) for Android compat, drop old when app migrates
  return { prices, records: prices, source: "live", isDemoData: false };
  }
 } catch (err) {
 console.warn("[Mandi] Live API failed, using fallback:", err.message);
 }
 }

  // Fallback: filter mock data
  let prices = MOCK_PRICES.map((p) => ({ ...p, variety: "", arrivalDate: p.date }));
  if (commodity) prices = prices.filter((p) => p.commodity.toLowerCase().includes(commodity.toLowerCase()));
  if (state) prices = prices.filter((p) => p.state.toLowerCase().includes(state.toLowerCase()));
  if (district) prices = prices.filter((p) => p.district.toLowerCase().includes(district.toLowerCase()));

  // ponytail: dual shape (prices+records) for Android compat, drop old when app migrates
  return { prices, records: prices, source: "mock", isDemoData: true, demoReason: "Live mandi service unavailable, showing sample data." };
}
