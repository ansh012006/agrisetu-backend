// Seeds a curated set of real central government agricultural schemes.
// Every officialUrl below was verified via web search before being
// hardcoded here, specifically because an inaccurate redirect link on
// a "government scheme" feature would actively mislead a farmer rather
// than just being a cosmetic bug - accuracy mattered more than a long
// list here. Run: node seed/seedSchemes.js

import dotenv from "dotenv";
import connectDB from "../config/db.js";
import GovernmentScheme from "../models/GovernmentScheme.js";

dotenv.config();

const SCHEMES = [
  {
    name: "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
    shortDescription: "Direct income support of ₹6,000 per year to eligible farmer families, paid in three installments.",
    category: "income_support",
    officialUrl: "https://pmkisan.gov.in/",
    displayOrder: 1,
  },
  {
    name: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
    shortDescription: "Crop insurance scheme protecting farmers against yield loss from natural calamities, pests, and disease.",
    category: "insurance",
    officialUrl: "https://pmfby.gov.in/",
    displayOrder: 2,
  },
  {
    name: "Soil Health Card Scheme",
    shortDescription: "Free soil testing and a personalized report on nutrient status with fertilizer recommendations for your land.",
    category: "soil",
    officialUrl: "https://soilhealth.dac.gov.in/",
    displayOrder: 3,
  },
  {
    name: "PM-KUSUM (Solar Irrigation)",
    shortDescription: "Subsidies for solar-powered irrigation pumps, reducing dependence on diesel and grid electricity.",
    category: "irrigation",
    officialUrl: "https://pmkusum.mnre.gov.in/",
    displayOrder: 4,
  },
  {
    name: "e-NAM (National Agriculture Market)",
    shortDescription: "Online trading platform connecting farmers directly to buyers across mandis nationwide for better price discovery.",
    category: "marketing",
    officialUrl: "https://enam.gov.in/web/",
    displayOrder: 5,
  },
];

const run = async () => {
  await connectDB();

  let created = 0;
  let updated = 0;

  for (const scheme of SCHEMES) {
    const result = await GovernmentScheme.findOneAndUpdate(
      { name: scheme.name },
      { $set: { ...scheme, isActive: true } },
      { upsert: true, new: true, rawResult: true, setDefaultsOnInsert: true }
    );
    if (result.lastErrorObject?.updatedExisting) updated += 1;
    else created += 1;
  }

  console.log(`Government schemes: ${created} created, ${updated} updated.`);
  process.exit(0);
};

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
