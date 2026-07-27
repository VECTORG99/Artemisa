import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://huascar.vercel.app';

/**
 * Sitemap listing the two public routes: landing and Creator.
 * Last modified is set to the build time.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/agents/new`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];
}
