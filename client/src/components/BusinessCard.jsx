import {
  BadgeCheck,
  Mail,
  MapPin,
  MessageCircleMore,
  Phone,
  RotateCcw,
  Instagram,
  Facebook,
} from "lucide-react";

function InfoRow({ icon: Icon, children }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
      <div className="min-w-0 text-sm text-slate-700">{children}</div>
    </div>
  );
}

function LinkOrText({ href, children, external = false }) {
  if (!href) {
    return <span>{children}</span>;
  }

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="break-all font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-sky-500"
    >
      {children}
    </a>
  );
}

function BusinessCard({ business, mode, onMarkContacted, onMoveBack }) {
  return (
    <article className="panel flex h-full flex-col p-5 text-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-600">
            {business.businessType}
          </p>
          <h3 className="mt-2 text-xl font-bold">{business.name}</h3>
        </div>

        {mode === "contacted" && business.contactedAt ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {new Date(business.contactedAt).toLocaleString()}
          </span>
        ) : null}
      </div>

      <div className="mt-5 space-y-3">
        <InfoRow icon={MapPin}>{business.address}</InfoRow>

        <InfoRow icon={Phone}>
          {business.phone ? (
            <LinkOrText href={`tel:${business.phone}`}>{business.phone}</LinkOrText>
          ) : (
            "No phone available"
          )}
        </InfoRow>

        {business.whatsappUrl ? (
          <InfoRow icon={MessageCircleMore}>
            <LinkOrText href={business.whatsappUrl} external>
              Open WhatsApp
            </LinkOrText>
          </InfoRow>
        ) : null}

        {business.email ? (
          <InfoRow icon={Mail}>
            <LinkOrText href={`mailto:${business.email}`}>{business.email}</LinkOrText>
          </InfoRow>
        ) : null}

        {business.socialLinks?.facebook ? (
          <InfoRow icon={Facebook}>
            <LinkOrText href={business.socialLinks.facebook} external>
              Facebook profile
            </LinkOrText>
          </InfoRow>
        ) : null}

        {business.socialLinks?.instagram ? (
          <InfoRow icon={Instagram}>
            <LinkOrText href={business.socialLinks.instagram} external>
              Instagram profile
            </LinkOrText>
          </InfoRow>
        ) : null}
      </div>

      <div className="mt-6">
        {mode === "prospects" ? (
          <button
            type="button"
            onClick={() => onMarkContacted(business.id)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            <BadgeCheck className="h-4 w-4" />
            Mark as Contacted
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onMoveBack(business.id)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <RotateCcw className="h-4 w-4" />
            Move Back to Prospects
          </button>
        )}
      </div>
    </article>
  );
}

export default BusinessCard;
