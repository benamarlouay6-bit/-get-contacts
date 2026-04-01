import { useEffect, useState } from "react";
import SearchPanel from "./components/SearchPanel";
import Tabs from "./components/Tabs";
import BusinessCard from "./components/BusinessCard";
import api from "./lib/api";

const LOCAL_STORAGE_KEY = "get-contacts-data";

const DEFAULT_REQUIREMENTS = {
  phone: false,
  whatsapp: false,
  email: false,
  facebook: false,
  instagram: false,
  address: false,
};

const DEFAULT_REGION_BY_COUNTRY = {
  Tunisia: "Tunis",
  France: "Paris",
  USA: "New York, NY",
  UK: "London",
  Germany: "Berlin",
};

const EMPTY_SAVED_DATA = {
  prospects: [],
  contacted: [],
};

function readLocalData() {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);

    if (!raw) {
      return EMPTY_SAVED_DATA;
    }

    const parsed = JSON.parse(raw);

    return {
      prospects: Array.isArray(parsed.prospects) ? parsed.prospects : [],
      contacted: Array.isArray(parsed.contacted) ? parsed.contacted : [],
    };
  } catch {
    return EMPTY_SAVED_DATA;
  }
}

function writeLocalData(data) {
  const safeData = {
    prospects: Array.isArray(data?.prospects) ? data.prospects : [],
    contacted: Array.isArray(data?.contacted) ? data.contacted : [],
  };

  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(safeData));
}

function App() {
  const [country, setCountry] = useState("France");
  const [region, setRegion] = useState("Paris");
  const [businessType, setBusinessType] = useState("Restaurant");
  const [requirements, setRequirements] = useState(DEFAULT_REQUIREMENTS);
  const [prospects, setProspects] = useState([]);
  const [contacted, setContacted] = useState([]);
  const [activeTab, setActiveTab] = useState("prospects");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  useEffect(() => {
    setRegion(DEFAULT_REGION_BY_COUNTRY[country]);
  }, [country]);

  useEffect(() => {
    const loadStoredData = async () => {
      const localData = readLocalData();

      setProspects(localData.prospects);
      setContacted(localData.contacted);

      try {
        const response = await api.get("/api/data");
        const serverData = {
          prospects: Array.isArray(response.data.prospects) ? response.data.prospects : [],
          contacted: Array.isArray(response.data.contacted) ? response.data.contacted : [],
        };

        const nextData =
          serverData.prospects.length > 0 || serverData.contacted.length > 0 ? serverData : localData;

        setProspects(nextData.prospects);
        setContacted(nextData.contacted);
        writeLocalData(nextData);
      } catch {
        if (localData.prospects.length === 0 && localData.contacted.length === 0) {
          setError("Could not load saved prospect data.");
        }
      } finally {
        setBooting(false);
      }
    };

    loadStoredData();
  }, []);

  const persistData = async (nextProspects, nextContacted) => {
    const payload = {
      prospects: nextProspects,
      contacted: nextContacted,
    };

    setProspects(nextProspects);
    setContacted(nextContacted);
    writeLocalData(payload);

    try {
      await api.post("/api/data", payload);
    } catch {
      setError("Saved in this browser, but could not sync to the server.");
    }
  };

  const toggleRequirement = (key) => {
    setRequirements((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleSearch = async () => {
    setLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const response = await api.get("/api/search", {
        params: {
          country,
          region,
          type: businessType,
          excludeIds: contacted.map((item) => item.id).join(","),
          requirePhone: requirements.phone,
          requireWhatsapp: requirements.whatsapp,
          requireEmail: requirements.email,
          requireFacebook: requirements.facebook,
          requireInstagram: requirements.instagram,
          requireAddress: requirements.address,
        },
      });

      const payload = response.data || {};
      const nextResults = Array.isArray(payload.results)
        ? payload.results
        : Array.isArray(payload)
          ? payload
          : [];

      await persistData(nextResults, contacted);
      setActiveTab("prospects");

      if (payload.meta?.cachedFallbackUsed && payload.meta?.message) {
        setInfoMessage(payload.meta.message);
      } else if (payload.meta?.source === "live") {
        setInfoMessage("");
      }
    } catch (searchError) {
      const status = searchError?.response?.status;
      const message = searchError?.response?.data?.message || "Search failed. Please try again in a moment.";
      const details = searchError?.response?.data?.details;

      if (status === 503) {
        setError(message);
      } else {
        setError(details ? `${message} ${details}` : message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMarkContacted = async (businessId) => {
    const item = prospects.find((prospect) => prospect.id === businessId);

    if (!item) {
      return;
    }

    const nextProspects = prospects.filter((prospect) => prospect.id !== businessId);
    const nextContacted = [{ ...item, contactedAt: new Date().toISOString() }, ...contacted];
    await persistData(nextProspects, nextContacted);
  };

  const handleMoveBack = async (businessId) => {
    const item = contacted.find((business) => business.id === businessId);

    if (!item) {
      return;
    }

    const nextContacted = contacted.filter((business) => business.id !== businessId);
    const { contactedAt, ...restored } = item;
    const nextProspects = [restored, ...prospects];
    await persistData(nextProspects, nextContacted);
  };

  const listToRender = activeTab === "prospects" ? prospects : contacted;
  const activeRequirementCount = Object.values(requirements).filter(Boolean).length;
  const emptyMessage =
    activeTab === "prospects"
      ? "No prospects found. Try searching!"
      : "No contacted businesses yet.";

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-300">
            Solo Prospecting Tool
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Build a clean outreach pipeline for local businesses with no website.
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-slate-300 sm:text-base">
            Search free OpenStreetMap business listings, uncover missing web presence, and track
            who you have already contacted.
          </p>
        </header>

        <div className="space-y-6">
          <SearchPanel
            country={country}
            setCountry={setCountry}
            region={region}
            setRegion={setRegion}
            businessType={businessType}
            setBusinessType={setBusinessType}
            requirements={requirements}
            onRequirementToggle={toggleRequirement}
            onSearch={handleSearch}
            loading={loading}
          />

          <section className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Tabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                prospectsCount={prospects.length}
                contactedCount={contacted.length}
              />

              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-slate-700">
                  Searching in {region}
                </div>

                {activeRequirementCount > 0 ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-2 text-sm font-medium text-sky-700">
                    {activeRequirementCount} required filter{activeRequirementCount > 1 ? "s" : ""} active
                  </div>
                ) : null}

                {loading ? (
                  <div className="inline-flex items-center gap-3 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-slate-700">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-500" />
                    Fetching fresh leads...
                  </div>
                ) : null}
              </div>
            </div>

            {infoMessage ? (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                {infoMessage}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {booting ? (
              <div className="panel px-6 py-10 text-center text-slate-600">Loading saved data...</div>
            ) : listToRender.length === 0 ? (
              <div className="panel px-6 py-12 text-center">
                <h2 className="text-xl font-bold text-slate-900">{emptyMessage}</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Search one region at a time and turn on the contact fields you want to require.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {listToRender.map((business) => (
                  <BusinessCard
                    key={business.id}
                    business={business}
                    mode={activeTab}
                    onMarkContacted={handleMarkContacted}
                    onMoveBack={handleMoveBack}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
