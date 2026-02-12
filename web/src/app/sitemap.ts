import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://electionodds.com";

const SENATE_STATES = [
  "al", "ak", "ar", "co", "de", "fl", "ga", "id", "il", "ia",
  "ks", "ky", "la", "me", "ma", "mi", "mn", "ms", "mt", "ne",
  "nh", "nj", "nm", "nc", "oh", "ok", "or", "ri", "sc", "sd",
  "tn", "tx", "va", "wv", "wy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/presidential/candidates`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/presidential/party`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/primaries/gop`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/primaries/dem`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/races/house-2026`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/races/senate-2026`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/senate`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/charts`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/track-record`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/pulse`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/pulse/contrast`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  const senateStatePages: MetadataRoute.Sitemap = SENATE_STATES.map(
    (state) => ({
      url: `${siteUrl}/senate/${state}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })
  );

  return [...staticPages, ...senateStatePages];
}
