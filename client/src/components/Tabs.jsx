function Tabs({ activeTab, setActiveTab, prospectsCount, contactedCount }) {
  const tabs = [
    { id: "prospects", label: "Prospects", count: prospectsCount },
    { id: "contacted", label: "Contacted", count: contactedCount },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-slate-900 text-white"
                : "bg-white/75 text-slate-700 ring-1 ring-slate-200 hover:bg-white"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs ${
                active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
