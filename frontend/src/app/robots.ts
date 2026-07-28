import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://artemisa-ai.netlify.app';

/**
 * Robots policy.
 * - Production: allow all, reference sitemap.
 * - Preview/non-production: disallow all to prevent duplicate content indexing.
 */
export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview';

  if (!isProduction) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
