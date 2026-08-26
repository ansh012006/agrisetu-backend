import { fetchDataGovInResource, DataGovInError } from "./dataGovIn.js";

const RESOURCE_ID = process.env.DATA_GOV_IN_MANDI_RESOURCE_ID || "9ef84268-d588-465a-a308-a864a43d0070";

const toNumber = (val) => {
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
};

const normalizeRecord = (r) => ({
  market: r.market || "",
  commodity: r.commodity || "",
  variety: r.variety || "",
  state: r.state || "",
  district: r.district || "",
  minPrice: toNumber(r.min_price),
  maxPrice: toNumber(r.max_price),
  modalPrice: toNumber(r.modal_price),
  arrivalDate: r.arrival_date || "",
});

const DEMO_RECORDS = [
  { market: "Azadpur Mandi", commodity: "Wheat", variety: "Dara", state: "Delhi", district: "Delhi", min_price: "2050", max_price: "2200", modal_price: "2125" },
  { market: "Ludhiana Mandi", commodity: "Wheat", variety: "Dara", state: "Punjab", district: "Ludhiana", min_price: "2100", max_price: "2250", modal_price: "2175" },
  { market: "Indore Mandi", commodity: "Soybean", variety: "Yellow", state: "Madhya Pradesh", district: "Indore", min_price: "4200", max_price: "4500", modal_price: "4350" },
  { market: "Nashik Mandi", commodity: "Onion", variety: "Red", state: "Maharashtra", district: "Nashik", min_price: "1200", max_price: "1800", modal_price: "1500" },
];

const buildDemoResponse = (filters, reason) => {
  const today = new Date().toISOString().slice(0, 10);
  let records = DEMO_RECORDS.map((r) => ({ ...r, arrival_date: today }));

  if (filters.commodity) {
    records = records.filter((r) => r.commodity.toLowerCase().includes(filters.commodity.toLowerCase()));
  }
  if (filters.state) {
    records = records.filter((r) => r.state.toLowerCase().includes(filters.state.toLowerCase()));
  }
  if (records.length === 0) records = DEMO_RECORDS.map((r) => ({ ...r, arrival_date: today }));

  return {
    records: records.map(normalizeRecord),
    isDemoData: true,
    demoReason: reason,
    source: "Demo data — NOT live data.gov.in mandi prices",
  };
};

export const searchMandiPrices = async (filters = {}) => {
  const resourceId = RESOURCE_ID;
  if (!resourceId || !process.env.DATA_GOV_IN_API_KEY) {
    return buildDemoResponse(filters, "No DATA_GOV_IN_API_KEY configured on the server.");
  }

  const dataGovFilters = {};
  if (filters.commodity) dataGovFilters.commodity = filters.commodity;
  if (filters.state) dataGovFilters.state = filters.state;
  if (filters.district) dataGovFilters.district = filters.district;

  try {
    const { records } = await fetchDataGovInResource(resourceId, { filters: dataGovFilters, limit: 50 });
    return { records: records.map(normalizeRecord), isDemoData: false, source: "data.gov.in — live mandi prices" };
  } catch (error) {
    if (error instanceof DataGovInError) {
      return buildDemoResponse(filters, error.message);
    }
    throw error;
  }
};
