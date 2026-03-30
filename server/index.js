import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const CLIENT_DIST_DIR = path.join(ROOT_DIR, "client", "dist");
const STORAGE_DIR = process.env.RENDER_DISK_ROOT
  ? path.join(process.env.RENDER_DISK_ROOT, "get-contacts")
  : __dirname;
const DATA_FILE = path.join(STORAGE_DIR, "data.json");
const SEARCH_CACHE_FILE = path.join(STORAGE_DIR, "search-cache.json");
const PORT = Number(process.env.PORT || 3001);
const SEARCH_LIMIT = 18;
const PER_CITY_LIMIT = 20;
const OVERPASS_TIMEOUT_SECONDS = 10;
const CURL_BIN = process.platform === "win32" ? "curl.exe" : "curl";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const COUNTRY_CITY_MAP = {
  Tunisia: [
    { name: "Ariana", lat: 36.8625, lon: 10.1956, radius: 7000 },
    { name: "Beja", lat: 36.7256, lon: 9.1817, radius: 7000 },
    { name: "Ben Arous", lat: 36.7531, lon: 10.2189, radius: 7000 },
    { name: "Bizerte", lat: 37.2744, lon: 9.8739, radius: 7000 },
    { name: "Gabes", lat: 33.8815, lon: 10.0982, radius: 7000 },
    { name: "Gafsa", lat: 34.425, lon: 8.7842, radius: 7000 },
    { name: "Jendouba", lat: 36.5011, lon: 8.7802, radius: 7000 },
    { name: "Kairouan", lat: 35.6781, lon: 10.0963, radius: 7000 },
    { name: "Kasserine", lat: 35.1676, lon: 8.8365, radius: 7000 },
    { name: "Kebili", lat: 33.7044, lon: 8.969, radius: 7000 },
    { name: "Kef", lat: 36.1742, lon: 8.7049, radius: 7000 },
    { name: "Mahdia", lat: 35.5047, lon: 11.0622, radius: 7000 },
    { name: "Manouba", lat: 36.81, lon: 10.0956, radius: 7000 },
    { name: "Medenine", lat: 33.3549, lon: 10.5055, radius: 7000 },
    { name: "Monastir", lat: 35.7643, lon: 10.8113, radius: 7000 },
    { name: "Nabeul", lat: 36.4561, lon: 10.7376, radius: 7000 },
    { name: "Sfax", lat: 34.7406, lon: 10.7603, radius: 7000 },
    { name: "Sidi Bouzid", lat: 35.0382, lon: 9.4858, radius: 7000 },
    { name: "Siliana", lat: 36.084, lon: 9.3708, radius: 7000 },
    { name: "Sousse", lat: 35.8256, lon: 10.6411, radius: 7000 },
    { name: "Tataouine", lat: 32.9297, lon: 10.4518, radius: 7000 },
    { name: "Tozeur", lat: 33.9197, lon: 8.1335, radius: 7000 },
    { name: "Tunis", lat: 36.8065, lon: 10.1815, radius: 7000 },
    { name: "Zaghouan", lat: 36.4029, lon: 10.1429, radius: 7000 },
  ],
  France: [
    { name: "Auvergne-Rhone-Alpes", lat: 45.764, lon: 4.8357, radius: 9000 },
    { name: "Bourgogne-Franche-Comte", lat: 47.322, lon: 5.0415, radius: 9000 },
    { name: "Brittany", lat: 48.1173, lon: -1.6778, radius: 9000 },
    { name: "Centre-Val de Loire", lat: 47.903, lon: 1.9093, radius: 9000 },
    { name: "Corsica", lat: 41.9192, lon: 8.7386, radius: 9000 },
    { name: "Grand Est", lat: 48.5734, lon: 7.7521, radius: 9000 },
    { name: "Hauts-de-France", lat: 50.6292, lon: 3.0573, radius: 9000 },
    { name: "Ile-de-France", lat: 48.8566, lon: 2.3522, radius: 9000 },
    { name: "Paris", lat: 48.8566, lon: 2.3522, radius: 4000 },
    { name: "Normandy", lat: 49.4431, lon: 1.0993, radius: 9000 },
    { name: "Nouvelle-Aquitaine", lat: 44.8378, lon: -0.5792, radius: 9000 },
    { name: "Occitanie", lat: 43.6047, lon: 1.4442, radius: 9000 },
    { name: "Pays de la Loire", lat: 47.2184, lon: -1.5536, radius: 9000 },
    { name: "Provence-Alpes-Cote d'Azur", lat: 43.2965, lon: 5.3698, radius: 9000 },
    { name: "Guadeloupe", lat: 16.241, lon: -61.533, radius: 9000 },
    { name: "French Guiana", lat: 4.9224, lon: -52.3135, radius: 9000 },
    { name: "Martinique", lat: 14.6104, lon: -61.08, radius: 9000 },
    { name: "Mayotte", lat: -12.7823, lon: 45.2288, radius: 9000 },
    { name: "Reunion", lat: -20.8821, lon: 55.4504, radius: 9000 },
  ],
  USA: [
    { name: "New York, NY", lat: 40.7128, lon: -74.006, radius: 7000 },
    { name: "Los Angeles, CA", lat: 34.0522, lon: -118.2437, radius: 7000 },
    { name: "Chicago, IL", lat: 41.8781, lon: -87.6298, radius: 7000 },
    { name: "Houston, TX", lat: 29.7604, lon: -95.3698, radius: 7000 },
    { name: "Phoenix, AZ", lat: 33.4484, lon: -112.074, radius: 7000 },
    { name: "Philadelphia, PA", lat: 39.9526, lon: -75.1652, radius: 7000 },
    { name: "San Antonio, TX", lat: 29.4241, lon: -98.4936, radius: 7000 },
    { name: "San Diego, CA", lat: 32.7157, lon: -117.1611, radius: 7000 },
    { name: "Dallas, TX", lat: 32.7767, lon: -96.797, radius: 7000 },
    { name: "San Jose, CA", lat: 37.3382, lon: -121.8863, radius: 7000 },
    { name: "Austin, TX", lat: 30.2672, lon: -97.7431, radius: 7000 },
    { name: "Jacksonville, FL", lat: 30.3322, lon: -81.6557, radius: 7000 },
    { name: "Fort Worth, TX", lat: 32.7555, lon: -97.3308, radius: 7000 },
    { name: "Columbus, OH", lat: 39.9612, lon: -82.9988, radius: 7000 },
    { name: "Charlotte, NC", lat: 35.2271, lon: -80.8431, radius: 7000 },
    { name: "San Francisco, CA", lat: 37.7749, lon: -122.4194, radius: 7000 },
    { name: "Indianapolis, IN", lat: 39.7684, lon: -86.1581, radius: 7000 },
    { name: "Seattle, WA", lat: 47.6062, lon: -122.3321, radius: 7000 },
    { name: "Denver, CO", lat: 39.7392, lon: -104.9903, radius: 7000 },
    { name: "Washington, DC", lat: 38.9072, lon: -77.0369, radius: 7000 },
    { name: "Boston, MA", lat: 42.3601, lon: -71.0589, radius: 7000 },
    { name: "El Paso, TX", lat: 31.7619, lon: -106.485, radius: 7000 },
    { name: "Nashville, TN", lat: 36.1627, lon: -86.7816, radius: 7000 },
    { name: "Detroit, MI", lat: 42.3314, lon: -83.0458, radius: 7000 },
    { name: "Oklahoma City, OK", lat: 35.4676, lon: -97.5164, radius: 7000 },
    { name: "Portland, OR", lat: 45.5152, lon: -122.6784, radius: 7000 },
    { name: "Las Vegas, NV", lat: 36.1699, lon: -115.1398, radius: 7000 },
    { name: "Memphis, TN", lat: 35.1495, lon: -90.049, radius: 7000 },
    { name: "Louisville, KY", lat: 38.2527, lon: -85.7585, radius: 7000 },
    { name: "Baltimore, MD", lat: 39.2904, lon: -76.6122, radius: 7000 },
    { name: "Milwaukee, WI", lat: 43.0389, lon: -87.9065, radius: 7000 },
    { name: "Albuquerque, NM", lat: 35.0844, lon: -106.6504, radius: 7000 },
    { name: "Tucson, AZ", lat: 32.2226, lon: -110.9747, radius: 7000 },
    { name: "Fresno, CA", lat: 36.7378, lon: -119.7871, radius: 7000 },
    { name: "Sacramento, CA", lat: 38.5816, lon: -121.4944, radius: 7000 },
    { name: "Kansas City, MO", lat: 39.0997, lon: -94.5786, radius: 7000 },
    { name: "Mesa, AZ", lat: 33.4152, lon: -111.8315, radius: 7000 },
    { name: "Atlanta, GA", lat: 33.749, lon: -84.388, radius: 7000 },
    { name: "Omaha, NE", lat: 41.2565, lon: -95.9345, radius: 7000 },
    { name: "Colorado Springs, CO", lat: 38.8339, lon: -104.8214, radius: 7000 },
    { name: "Raleigh, NC", lat: 35.7796, lon: -78.6382, radius: 7000 },
    { name: "Miami, FL", lat: 25.7617, lon: -80.1918, radius: 7000 },
    { name: "Long Beach, CA", lat: 33.7701, lon: -118.1937, radius: 7000 },
    { name: "Virginia Beach, VA", lat: 36.8529, lon: -75.978, radius: 7000 },
    { name: "Oakland, CA", lat: 37.8044, lon: -122.2711, radius: 7000 },
    { name: "Minneapolis, MN", lat: 44.9778, lon: -93.265, radius: 7000 },
    { name: "Tulsa, OK", lat: 36.154, lon: -95.9928, radius: 7000 },
    { name: "Arlington, TX", lat: 32.7357, lon: -97.1081, radius: 7000 },
    { name: "New Orleans, LA", lat: 29.9511, lon: -90.0715, radius: 7000 },
    { name: "Wichita, KS", lat: 37.6872, lon: -97.3301, radius: 7000 },
  ],
  UK: [
    { name: "East Midlands", lat: 52.9548, lon: -1.1581, radius: 9000 },
    { name: "East of England", lat: 52.2053, lon: 0.1218, radius: 9000 },
    { name: "London", lat: 51.5072, lon: -0.1276, radius: 9000 },
    { name: "North East", lat: 54.9783, lon: -1.6178, radius: 9000 },
    { name: "North West", lat: 53.4808, lon: -2.2426, radius: 9000 },
    { name: "Northern Ireland", lat: 54.5973, lon: -5.9301, radius: 9000 },
    { name: "Scotland", lat: 55.9533, lon: -3.1883, radius: 9000 },
    { name: "South East", lat: 50.8198, lon: -0.1367, radius: 9000 },
    { name: "South West", lat: 51.4545, lon: -2.5879, radius: 9000 },
    { name: "Wales", lat: 51.4816, lon: -3.1791, radius: 9000 },
    { name: "West Midlands", lat: 52.4862, lon: -1.8904, radius: 9000 },
    { name: "Yorkshire and the Humber", lat: 53.8008, lon: -1.5491, radius: 9000 },
  ],
  Germany: [
    { name: "Baden-Wurttemberg", lat: 48.7758, lon: 9.1829, radius: 9000 },
    { name: "Bavaria", lat: 48.1374, lon: 11.5755, radius: 9000 },
    { name: "Berlin", lat: 52.52, lon: 13.405, radius: 9000 },
    { name: "Brandenburg", lat: 52.3906, lon: 13.0645, radius: 9000 },
    { name: "Bremen", lat: 53.0793, lon: 8.8017, radius: 9000 },
    { name: "Hamburg", lat: 53.5511, lon: 9.9937, radius: 9000 },
    { name: "Hesse", lat: 50.1109, lon: 8.6821, radius: 9000 },
    { name: "Lower Saxony", lat: 52.3759, lon: 9.732, radius: 9000 },
    { name: "Mecklenburg-Vorpommern", lat: 53.6355, lon: 11.4012, radius: 9000 },
    { name: "North Rhine-Westphalia", lat: 51.2277, lon: 6.7735, radius: 9000 },
    { name: "Rhineland-Palatinate", lat: 49.9929, lon: 8.2473, radius: 9000 },
    { name: "Saarland", lat: 49.2402, lon: 6.9969, radius: 9000 },
    { name: "Saxony", lat: 51.0504, lon: 13.7373, radius: 9000 },
    { name: "Saxony-Anhalt", lat: 52.1205, lon: 11.6276, radius: 9000 },
    { name: "Schleswig-Holstein", lat: 54.3233, lon: 10.1228, radius: 9000 },
    { name: "Thuringia", lat: 50.9848, lon: 11.0299, radius: 9000 },
  ],
};

const BUSINESS_TYPE_MAP = {
  Restaurant: { key: "amenity", value: "restaurant" },
  "Barber Shop": { key: "shop", value: "hairdresser" },
  Cafe: { key: "amenity", value: "cafe" },
  Gym: { key: "leisure", value: "fitness_centre" },
  "Beauty Salon": { key: "shop", value: "beauty" },
  "Auto Repair": { key: "shop", value: "car_repair" },
};

const EMPTY_DATA = { prospects: [], contacted: [] };
const MEMORY_SEARCH_CACHE = new Map();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

async function ensureStorageDir() {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
}

async function ensureJsonFile(filePath, defaultValue) {
  await ensureStorageDir();

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2), "utf8");
  }
}

async function ensureDataFile() {
  await ensureJsonFile(DATA_FILE, EMPTY_DATA);
}

async function ensureSearchCacheFile() {
  await ensureJsonFile(SEARCH_CACHE_FILE, {});
}

async function readData() {
  await ensureDataFile();

  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);

    return {
      prospects: Array.isArray(parsed.prospects) ? parsed.prospects : [],
      contacted: Array.isArray(parsed.contacted) ? parsed.contacted : [],
    };
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(EMPTY_DATA, null, 2), "utf8");
    return EMPTY_DATA;
  }
}

async function writeData(data) {
  const safeData = {
    prospects: Array.isArray(data?.prospects) ? data.prospects : [],
    contacted: Array.isArray(data?.contacted) ? data.contacted : [],
  };

  await ensureStorageDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(safeData, null, 2), "utf8");
  return safeData;
}

async function readSearchCacheFile() {
  await ensureSearchCacheFile();

  try {
    const raw = await fs.readFile(SEARCH_CACHE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    await fs.writeFile(SEARCH_CACHE_FILE, JSON.stringify({}, null, 2), "utf8");
    return {};
  }
}

function parseCacheKey(cacheKey) {
  try {
    return JSON.parse(cacheKey);
  } catch {
    return null;
  }
}

async function getCachedSearch(cacheKey) {
  if (MEMORY_SEARCH_CACHE.has(cacheKey)) {
    return MEMORY_SEARCH_CACHE.get(cacheKey);
  }

  const fileCache = await readSearchCacheFile();
  const directMatch = fileCache[cacheKey] || null;

  if (directMatch) {
    MEMORY_SEARCH_CACHE.set(cacheKey, directMatch);
    return directMatch;
  }

  const requestedKey = parseCacheKey(cacheKey);

  if (!requestedKey) {
    return null;
  }

  let bestEntry = null;
  let bestSavedAt = 0;

  for (const [legacyKey, entry] of Object.entries(fileCache)) {
    const parsedLegacyKey = parseCacheKey(legacyKey);

    if (!parsedLegacyKey) {
      continue;
    }

    const isSameSearch =
      parsedLegacyKey.country === requestedKey.country &&
      parsedLegacyKey.region === requestedKey.region &&
      parsedLegacyKey.type === requestedKey.type;

    if (!isSameSearch) {
      continue;
    }

    const savedAt = Date.parse(entry?.savedAt || '') || 0;

    if (!bestEntry || savedAt > bestSavedAt) {
      bestEntry = entry;
      bestSavedAt = savedAt;
    }
  }

  if (bestEntry) {
    MEMORY_SEARCH_CACHE.set(cacheKey, bestEntry);
  }

  return bestEntry;
}

async function setCachedSearch(cacheKey, results) {
  const entry = {
    results,
    savedAt: new Date().toISOString(),
  };

  MEMORY_SEARCH_CACHE.set(cacheKey, entry);
  const fileCache = await readSearchCacheFile();
  fileCache[cacheKey] = entry;
  await fs.writeFile(SEARCH_CACHE_FILE, JSON.stringify(fileCache, null, 2), "utf8");
}

async function getRelatedCachedSearch(country, region, type) {
  const fileCache = await readSearchCacheFile();
  let bestEntry = null;
  let bestKey = null;
  let bestScore = -1;
  let bestSavedAt = 0;

  for (const [cacheKey, entry] of Object.entries(fileCache)) {
    const parsedKey = parseCacheKey(cacheKey);

    if (!parsedKey || parsedKey.type !== type || parsedKey.region === region) {
      continue;
    }

    const score = parsedKey.country === country ? 2 : 1;
    const savedAt = Date.parse(entry?.savedAt || "") || 0;

    if (score > bestScore || (score === bestScore && savedAt > bestSavedAt)) {
      bestEntry = entry;
      bestKey = parsedKey;
      bestScore = score;
      bestSavedAt = savedAt;
    }
  }

  if (!bestEntry || !bestKey) {
    return null;
  }

  return {
    entry: bestEntry,
    key: bestKey,
  };
}

function buildAddress(tags = {}) {
  if (tags["addr:full"]) {
    return tags["addr:full"];
  }

  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"],
    tags["addr:state"],
    tags["addr:postcode"],
    tags["addr:country"],
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "Address not available";
}

function getFirstTag(tags = {}, keys = []) {
  return keys.map((key) => tags[key]).find(Boolean) || null;
}

function normalizeWhatsAppPhone(phone) {
  if (!phone) {
    return null;
  }

  return phone.replace(/[^\d]/g, "");
}

function normalizeSocialLink(value) {
  if (!value) {
    return null;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

function normalizeElement(element, businessType) {
  const tags = element.tags || {};
  const website = getFirstTag(tags, ["website", "contact:website"]);

  if (website) {
    return null;
  }

  const phone = getFirstTag(tags, ["phone", "contact:phone", "mobile", "contact:mobile"]);
  const email = getFirstTag(tags, ["email", "contact:email"]);
  const facebook = getFirstTag(tags, ["facebook", "contact:facebook"]);
  const instagram = getFirstTag(tags, ["instagram", "contact:instagram"]);
  const address = buildAddress(tags);

  return {
    osmId: element.id,
    osmType: element.type,
    id: `${element.type}-${element.id}`,
    name: tags.name || "Unnamed business",
    businessType,
    address,
    phone: phone || null,
    whatsappUrl: phone ? `https://wa.me/${normalizeWhatsAppPhone(phone)}` : null,
    email,
    socialLinks: {
      facebook: normalizeSocialLink(facebook),
      instagram: normalizeSocialLink(instagram),
    },
    location: {
      lat: element.lat ?? null,
      lon: element.lon ?? null,
    },
    source: "openstreetmap-overpass",
  };
}

function buildCityQuery(city, tagKey, tagValue, requiredFields) {
  const phoneFilter = requiredFields.phone || requiredFields.whatsapp ? '[~"^(phone|contact:phone|mobile|contact:mobile)$"~"."]' : "";
  const emailFilter = requiredFields.email ? '[~"^(email|contact:email)$"~"."]' : "";
  const facebookFilter = requiredFields.facebook ? '[~"^(facebook|contact:facebook)$"~"."]' : "";
  const instagramFilter = requiredFields.instagram ? '[~"^(instagram|contact:instagram)$"~"."]' : "";
  const addressFilter = requiredFields.address ? '[~"^addr:(street|full|city|postcode|housenumber)$"~"."]' : "";

  return `[out:json][timeout:${OVERPASS_TIMEOUT_SECONDS}];node["${tagKey}"="${tagValue}"]["name"][!"website"][!"contact:website"]${phoneFilter}${emailFilter}${facebookFilter}${instagramFilter}${addressFilter}(around:${city.radius},${city.lat},${city.lon});out tags ${PER_CITY_LIMIT};`;
}

function parseBooleanQueryParam(value) {
  return value === "true" || value === true;
}

function buildRequiredFields(query) {
  return {
    phone: parseBooleanQueryParam(query.requirePhone),
    whatsapp: parseBooleanQueryParam(query.requireWhatsapp),
    email: parseBooleanQueryParam(query.requireEmail),
    facebook: parseBooleanQueryParam(query.requireFacebook),
    instagram: parseBooleanQueryParam(query.requireInstagram),
    address: parseBooleanQueryParam(query.requireAddress),
  };
}

function parseExcludedIds(value) {
  if (!value || typeof value !== "string") {
    return new Set();
  }

  return new Set(value.split(",").map((item) => item.trim()).filter(Boolean));
}

function passesRequirements(business, requiredFields) {
  if (requiredFields.phone && !business.phone) return false;
  if (requiredFields.whatsapp && !business.whatsappUrl) return false;
  if (requiredFields.email && !business.email) return false;
  if (requiredFields.facebook && !business.socialLinks?.facebook) return false;
  if (requiredFields.instagram && !business.socialLinks?.instagram) return false;
  if (requiredFields.address && (!business.address || business.address === "Address not available")) return false;
  return true;
}

function buildCacheKey(country, region, type, requiredFields) {
  return JSON.stringify({
    country,
    region,
    type,
    requiredFields,
  });
}

function filterCachedResults(results, requiredFields, excludedIds, type) {
  return results.filter((business) => {
    if (excludedIds.has(business.id)) {
      return false;
    }

    if (type && business.businessType !== type) {
      return false;
    }

    return passesRequirements(business, requiredFields);
  });
}

function summarizeCurlError(message) {
  if (!message) return "Unknown request error";
  if (message.includes("Operation timed out")) return "request timed out";
  if (message.includes("Could not resolve host")) return "could not resolve host";
  if (message.includes("Failed to connect")) return "failed to connect";
  if (message.includes("server returned HTML instead of JSON")) return "server returned HTML instead of JSON";
  return message;
}

function isTemporaryOverpassFailure(errors) {
  return errors.some((error) =>
    error.includes("request timed out") ||
    error.includes("server returned HTML instead of JSON") ||
    error.includes("failed to connect"),
  );
}

async function fetchViaCurl(endpoint, query) {
  const args = [
    "-sS",
    "--max-time",
    String(OVERPASS_TIMEOUT_SECONDS),
    "--get",
    "--data-urlencode",
    `data=${query}`,
    endpoint,
  ];

  try {
    const { stdout, stderr } = await execFileAsync(CURL_BIN, args, {
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 5,
    });

    if (stderr && stderr.trim()) {
      throw new Error(stderr.trim());
    }

    const trimmed = stdout.trim();
    if (!trimmed) {
      throw new Error("empty response from server");
    }

    if (trimmed.startsWith("<")) {
      throw new Error("server returned HTML instead of JSON");
    }

    return JSON.parse(trimmed);
  } catch (error) {
    throw new Error(summarizeCurlError(error.message));
  }
}

async function fetchBusinessesForRegion(city, businessConfig, requiredFields, excludedIds) {
  const query = buildCityQuery(city, businessConfig.key, businessConfig.value, requiredFields);
  const uniqueResults = [];
  const seenIds = new Set();
  const errors = [];
  let hadSuccessfulEndpoint = false;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const payload = await fetchViaCurl(endpoint, query);
      const elements = Array.isArray(payload.elements) ? payload.elements : [];
      hadSuccessfulEndpoint = true;

      for (const element of elements) {
        const normalized = normalizeElement(element, businessConfig.label);
        if (
          !normalized ||
          seenIds.has(normalized.id) ||
          excludedIds.has(normalized.id) ||
          !passesRequirements(normalized, requiredFields)
        ) {
          continue;
        }

        seenIds.add(normalized.id);
        uniqueResults.push(normalized);

        if (uniqueResults.length >= SEARCH_LIMIT) {
          break;
        }
      }

      return { results: uniqueResults, errors, hadSuccessfulEndpoint };
    } catch (error) {
      errors.push(`${city.name} via ${endpoint}: ${error.message}`);
    }
  }

  return { results: uniqueResults, errors, hadSuccessfulEndpoint };
}

app.get("/api/data", async (_req, res) => {
  const data = await readData();
  res.json(data);
});

app.post("/api/data", async (req, res) => {
  const saved = await writeData(req.body);
  res.json(saved);
});

app.get("/api/search", async (req, res) => {
  const country = req.query.country;
  const region = req.query.region;
  const type = req.query.type;
  const cities = COUNTRY_CITY_MAP[country];
  const city = cities?.find((item) => item.name === region);
  const businessConfig = BUSINESS_TYPE_MAP[type];
  const requiredFields = buildRequiredFields(req.query);
  const excludedIds = parseExcludedIds(req.query.excludeIds);
  const cacheKey = buildCacheKey(country, region, type, requiredFields);

  if (!city || !businessConfig) {
    return res.status(400).json({ message: "Invalid country, region, or business type." });
  }

  const cachedSearch = await getCachedSearch(cacheKey);

  try {
    const { results, errors, hadSuccessfulEndpoint } = await fetchBusinessesForRegion(
      city,
      { ...businessConfig, label: type },
      requiredFields,
      excludedIds,
    );

    if (results.length > 0) {
      await setCachedSearch(cacheKey, results);
      return res.json({
        results,
        meta: {
          source: "live",
          cachedFallbackUsed: false,
        },
      });
    }

    if (hadSuccessfulEndpoint) {
      return res.status(404).json({
        message: `No new prospects found for ${region}.`,
        details: `The search succeeded, but all matching businesses in ${region} are already contacted or filtered out.`,
      });
    }

    const cachedResults = filterCachedResults(cachedSearch?.results || [], requiredFields, excludedIds, type);

    if (cachedResults.length) {
      return res.json({
        results: cachedResults,
        meta: {
          source: "cache",
          cachedFallbackUsed: true,
          savedAt: cachedSearch.savedAt,
          message: `Live search is temporarily unavailable. Showing the last saved results for ${region} instead.`,
        },
      });
    }

    if (isTemporaryOverpassFailure(errors)) {
      const relatedCachedSearch = await getRelatedCachedSearch(country, region, type);
      const relatedCachedResults = filterCachedResults(
        relatedCachedSearch?.entry?.results || [],
        requiredFields,
        excludedIds,
        type,
      );

      if (relatedCachedResults.length) {
        return res.json({
          results: relatedCachedResults,
          meta: {
            source: "related-cache",
            cachedFallbackUsed: true,
            savedAt: relatedCachedSearch.entry.savedAt,
            message: `Live search is temporarily unavailable for ${region}. Showing saved ${type.toLowerCase()} leads from ${relatedCachedSearch.key.region} instead.`,
          },
        });
      }

      const savedData = await readData();
      const savedProspects = filterCachedResults(savedData.prospects || [], requiredFields, excludedIds, type);

      if (savedProspects.length) {
        return res.json({
          results: savedProspects.slice(0, SEARCH_LIMIT),
          meta: {
            source: "saved-prospects",
            cachedFallbackUsed: true,
            message: `Live search is temporarily unavailable for ${region}. Showing prospects from your saved list instead.`,
          },
        });
      }

      return res.status(503).json({
        message: `Search is temporarily unavailable for ${region}. Please wait a little and try again.`,
      });
    }

    return res.status(502).json({
      message: `Failed to fetch businesses from Overpass API for ${region}.`,
      details: errors.join(" | "),
    });
  } catch (error) {
    return res.status(502).json({
      message: "Failed to fetch businesses from Overpass API.",
      details: error.message || "Unknown Overpass error",
    });
  }
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(CLIENT_DIST_DIR));

  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST_DIR, "index.html"));
  });
}

Promise.all([ensureDataFile(), ensureSearchCacheFile()]).then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
});
