const COUNTRIES = ["Tunisia", "France", "USA", "UK", "Germany"];
const BUSINESS_TYPES = [
  "Restaurant",
  "Barber Shop",
  "Cafe",
  "Gym",
  "Beauty Salon",
  "Auto Repair",
];

const REGION_OPTIONS = {
  Tunisia: [
    "Ariana",
    "Beja",
    "Ben Arous",
    "Bizerte",
    "Gabes",
    "Gafsa",
    "Jendouba",
    "Kairouan",
    "Kasserine",
    "Kebili",
    "Kef",
    "Mahdia",
    "Manouba",
    "Medenine",
    "Monastir",
    "Nabeul",
    "Sfax",
    "Sidi Bouzid",
    "Siliana",
    "Sousse",
    "Tataouine",
    "Tozeur",
    "Tunis",
    "Zaghouan",
  ],
  France: [
    "Auvergne-Rhone-Alpes",
    "Bourgogne-Franche-Comte",
    "Brittany",
    "Centre-Val de Loire",
    "Corsica",
    "Grand Est",
    "Hauts-de-France",
    "Ile-de-France",
    "Paris",
    "Normandy",
    "Nouvelle-Aquitaine",
    "Occitanie",
    "Pays de la Loire",
    "Provence-Alpes-Cote d'Azur",
    "Guadeloupe",
    "French Guiana",
    "Martinique",
    "Mayotte",
    "Reunion",
  ],
  USA: [
    "New York, NY",
    "Los Angeles, CA",
    "Chicago, IL",
    "Houston, TX",
    "Phoenix, AZ",
    "Philadelphia, PA",
    "San Antonio, TX",
    "San Diego, CA",
    "Dallas, TX",
    "San Jose, CA",
    "Austin, TX",
    "Jacksonville, FL",
    "Fort Worth, TX",
    "Columbus, OH",
    "Charlotte, NC",
    "San Francisco, CA",
    "Indianapolis, IN",
    "Seattle, WA",
    "Denver, CO",
    "Washington, DC",
    "Boston, MA",
    "El Paso, TX",
    "Nashville, TN",
    "Detroit, MI",
    "Oklahoma City, OK",
    "Portland, OR",
    "Las Vegas, NV",
    "Memphis, TN",
    "Louisville, KY",
    "Baltimore, MD",
    "Milwaukee, WI",
    "Albuquerque, NM",
    "Tucson, AZ",
    "Fresno, CA",
    "Sacramento, CA",
    "Kansas City, MO",
    "Mesa, AZ",
    "Atlanta, GA",
    "Omaha, NE",
    "Colorado Springs, CO",
    "Raleigh, NC",
    "Miami, FL",
    "Long Beach, CA",
    "Virginia Beach, VA",
    "Oakland, CA",
    "Minneapolis, MN",
    "Tulsa, OK",
    "Arlington, TX",
    "New Orleans, LA",
    "Wichita, KS",
  ],
  UK: [
    "East Midlands",
    "East of England",
    "London",
    "North East",
    "North West",
    "Northern Ireland",
    "Scotland",
    "South East",
    "South West",
    "Wales",
    "West Midlands",
    "Yorkshire and the Humber",
  ],
  Germany: [
    "Baden-Wurttemberg",
    "Bavaria",
    "Berlin",
    "Brandenburg",
    "Bremen",
    "Hamburg",
    "Hesse",
    "Lower Saxony",
    "Mecklenburg-Vorpommern",
    "North Rhine-Westphalia",
    "Rhineland-Palatinate",
    "Saarland",
    "Saxony",
    "Saxony-Anhalt",
    "Schleswig-Holstein",
    "Thuringia",
  ],
};

const REQUIREMENT_OPTIONS = [
  { key: "phone", label: "Phone" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Email" },
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "address", label: "Address" },
];

function SearchPanel({
  country,
  setCountry,
  region,
  setRegion,
  businessType,
  setBusinessType,
  requirements,
  onRequirementToggle,
  onSearch,
  loading,
}) {
  const regions = REGION_OPTIONS[country] || [];

  return (
    <section className="panel overflow-hidden p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-600">
            Search Local Leads
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Find businesses missing a website
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Search OpenStreetMap data in one selected region, then require the contact fields you
            care about before leads are added.
          </p>
        </div>

        <button
          type="button"
          onClick={onSearch}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Country</span>
          <select
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          >
            {COUNTRIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Region / City / State</span>
          <select
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          >
            {regions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Business Type</span>
          <select
            value={businessType}
            onChange={(event) => setBusinessType(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          >
            {BUSINESS_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Required Contact Fields</h3>
            <p className="mt-1 text-sm text-slate-600">
              Only return businesses that match every selected requirement.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {REQUIREMENT_OPTIONS.map((option) => {
            const active = Boolean(requirements[option.key]);

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onRequirementToggle(option.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200"
                }`}
              >
                {active ? `Required: ${option.label}` : option.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default SearchPanel;
