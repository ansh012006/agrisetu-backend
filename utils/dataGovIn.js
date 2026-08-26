export class DataGovInError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = "DataGovInError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

const TIMEOUT_MS = Number(process.env.DATA_GOV_IN_TIMEOUT_MS) || 15000;

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new DataGovInError("The government data service timed out.", 504, "TIMEOUT")), ms)),
  ]);

export const fetchDataGovInResource = async (resourceId, { filters = {}, limit = 100 } = {}) => {
  const apiKey = process.env.DATA_GOV_IN_API_KEY?.trim();
  if (!apiKey) {
    throw new DataGovInError("DATA_GOV_IN_API_KEY is not configured on the server.", 503, "NOT_CONFIGURED");
  }

  const params = new URLSearchParams({ "api-key": apiKey, format: "json", limit: String(limit) });
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(`filters[${key}]`, value);
  });

  const url = `https://api.data.gov.in/resource/${resourceId}?${params.toString()}`;

  let response;
  try {
    response = await withTimeout(fetch(url), TIMEOUT_MS);
  } catch (err) {
    if (err instanceof DataGovInError) throw err;
    throw new DataGovInError("Could not reach the government data service.", 502, "NETWORK_ERROR");
  }

  if (!response.ok) {
    throw new DataGovInError(`The government data service returned an error (${response.status}).`, response.status, "SERVICE_ERROR");
  }

  const data = await response.json();
  return { records: data.records || [], fetchedAt: new Date().toISOString() };
};
