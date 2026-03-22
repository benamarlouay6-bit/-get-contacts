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
    { name: "Tunis", lat: 36.8065, lon: 10.1815, radius: 1800 },
    { name: "Sfax", lat: 34.7406, lon: 10.7603, radius: 1800 },
    { name: "Sousse", lat: 35.8256, lon: 10.6411, radius: 1600 },
  ],
  France: [
    { name: "Paris", lat: 48.8566, lon: 2.3522, radius: 1800 },
    { name: "Marseille", lat: 43.2965, lon: 5.3698, radius: 1700 },
    { name: "Lyon", lat: 45.764, lon: 4.8357, radius: 1600 },
  ],
  USA: [
    { name: "New York", lat: 40.7128, lon: -74.006, radius: 1800 },
    { name: "Los Angeles", lat: 34.0522, lon: -118.2437, radius: 1800 },
    { name: "Chicago", lat: 41.8781, lon: -87.6298, radius: 1600 },
  ],
  UK: [
    { name: "London", lat: 51.5072, lon: -0.1276, radius: 1800 },
    { name: "Birmingham", lat: 52.4862, lon: -1.8904, radius: 1600 },
    { name: "Manchester", lat: 53.4808, lon: -2.2426, radius: 1600 },
  ],
  Germany: [
    { name: "Berlin", lat: 52.52, lon: 13.405, radius: 1800 },
    { name: "Hamburg", lat: 53.5511, lon: 9.9937, radius: 1600 },
    { name: "Munich", lat: 48.1351, lon: 11.582, radius: 1600 },
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

async function getCachedSearch(cacheKey) {
  if (MEMORY_SEARCH_CACHE.has(cacheKey)) {
    return MEMORY_SEARCH_CACHE.get(cacheKey);
  }

  const fileCache = await readSearchCacheFile();
  const cached = fileCache[cacheKey] || null;

  if (cached) {
    MEMORY_SEARCH_CACHE.set(cacheKey, cached);
  }

  return cached;
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

function buildCacheKey(country, region, type, requiredFields, excludedIds) {
  return JSON.stringify({
    country,
    region,
    type,
    requiredFields,
    excludedIds: [...excludedIds].sort(),
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
  const cacheKey = buildCacheKey(country, region, type, requiredFields, excludedIds);

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

    if (cachedSearch?.results?.length) {
      return res.json({
        results: cachedSearch.results,
        meta: {
          source: "cache",
          cachedFallbackUsed: true,
          savedAt: cachedSearch.savedAt,
          message: `Live search is temporarily unavailable. Showing the last saved results for ${region} instead.`,
        },
      });
    }

    if (isTemporaryOverpassFailure(errors)) {
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
