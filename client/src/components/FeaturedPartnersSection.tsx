import { trpc } from "@/lib/trpc";

/**
 * Featured partner interface matching the database schema
 */
interface FeaturedPartner {
  id: number;
  name: string;
  logoUrl: string;
  websiteUrl: string | null;
  partnerType: "media" | "customer" | "partner" | "integration" | null;
}

/**
 * Featured Partners / "As Seen In" section for the landing page
 * Displays logos of media outlets, partners, or notable customers
 */
export function FeaturedPartnersSection() {
  const { data: partners, isLoading } = trpc.partners.getActive.useQuery();

  if (isLoading) {
    return (
      <section 
        className="py-12 bg-white dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700" 
        aria-label="Featured partners and media coverage"
      >
        <div className="container">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-8">
            Trusted By Industry Leaders
          </p>
          <div className="flex justify-center items-center gap-12 flex-wrap">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i} 
                className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" 
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!partners || partners.length === 0) {
    return null; // Don't render section if no partners
  }

  // Group partners by type for different display sections
  const mediaPartners = partners.filter((p: FeaturedPartner) => p.partnerType === "media");
  const customerPartners = partners.filter((p: FeaturedPartner) => p.partnerType === "customer");
  const integrationPartners = partners.filter((p: FeaturedPartner) => p.partnerType === "integration");
  const otherPartners = partners.filter((p: FeaturedPartner) => 
    p.partnerType === "partner" || p.partnerType === null
  );

  // Determine the section title based on partner types
  const getSectionTitle = () => {
    if (mediaPartners.length > 0) return "As Seen In";
    if (customerPartners.length > 0) return "Trusted By";
    if (integrationPartners.length > 0) return "Integrates With";
    return "Our Partners";
  };

  return (
    <section 
      className="py-12 bg-white dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700" 
      aria-label="Featured partners and media coverage"
    >
      <div className="container">
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-8 font-medium">
          {getSectionTitle()}
        </p>
        
        <div 
          className="flex justify-center items-center gap-8 md:gap-12 flex-wrap"
          role="list"
          aria-label="Partner logos"
        >
          {partners.map((partner: FeaturedPartner) => (
            <div
              key={partner.id}
              role="listitem"
              className="grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
            >
              {partner.websiteUrl ? (
                <a
                  href={partner.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                  aria-label={`Visit ${partner.name} website (opens in new tab)`}
                >
                  <img
                    src={partner.logoUrl}
                    alt={`${partner.name} logo`}
                    className="h-8 md:h-10 w-auto max-w-[150px] object-contain"
                    loading="lazy"
                  />
                </a>
              ) : (
                <img
                  src={partner.logoUrl}
                  alt={`${partner.name} logo`}
                  className="h-8 md:h-10 w-auto max-w-[150px] object-contain"
                  loading="lazy"
                />
              )}
            </div>
          ))}
        </div>

        {/* Show separate sections if we have multiple partner types */}
        {mediaPartners.length > 0 && (customerPartners.length > 0 || integrationPartners.length > 0) && (
          <>
            {customerPartners.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-700">
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-8 font-medium">
                  Trusted By
                </p>
                <div 
                  className="flex justify-center items-center gap-8 md:gap-12 flex-wrap"
                  role="list"
                  aria-label="Customer logos"
                >
                  {customerPartners.map((partner: FeaturedPartner) => (
                    <div
                      key={partner.id}
                      role="listitem"
                      className="grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
                    >
                      {partner.websiteUrl ? (
                        <a
                          href={partner.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                          aria-label={`Visit ${partner.name} website (opens in new tab)`}
                        >
                          <img
                            src={partner.logoUrl}
                            alt={`${partner.name} logo`}
                            className="h-8 md:h-10 w-auto max-w-[150px] object-contain"
                            loading="lazy"
                          />
                        </a>
                      ) : (
                        <img
                          src={partner.logoUrl}
                          alt={`${partner.name} logo`}
                          className="h-8 md:h-10 w-auto max-w-[150px] object-contain"
                          loading="lazy"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {integrationPartners.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-700">
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-8 font-medium">
                  Integrates With
                </p>
                <div 
                  className="flex justify-center items-center gap-8 md:gap-12 flex-wrap"
                  role="list"
                  aria-label="Integration partner logos"
                >
                  {integrationPartners.map((partner: FeaturedPartner) => (
                    <div
                      key={partner.id}
                      role="listitem"
                      className="grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
                    >
                      {partner.websiteUrl ? (
                        <a
                          href={partner.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                          aria-label={`Visit ${partner.name} website (opens in new tab)`}
                        >
                          <img
                            src={partner.logoUrl}
                            alt={`${partner.name} logo`}
                            className="h-8 md:h-10 w-auto max-w-[150px] object-contain"
                            loading="lazy"
                          />
                        </a>
                      ) : (
                        <img
                          src={partner.logoUrl}
                          alt={`${partner.name} logo`}
                          className="h-8 md:h-10 w-auto max-w-[150px] object-contain"
                          loading="lazy"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default FeaturedPartnersSection;
