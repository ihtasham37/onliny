import fs from 'fs';
import path from 'path';

/**
 * Build Script: Generate SEO Assets (sitemap.xml & robots.txt)
 * Optimized for Cloudflare Pages and custom domains
 */

// 1. Resolve Base URL
// Cloudflare Pages automatically sets CF_PAGES_URL (e.g., https://branch.project.pages.dev)
const resolveBaseUrl = (): string => {
  const envUrl =
    process.env.SITE_URL ||
    process.env.CF_PAGES_URL ||
    process.env.VITE_SITE_URL ||
    'https://zivio.pages.dev';

  return envUrl.trim().replace(/\/+$/, '');
};

const baseUrl = resolveBaseUrl();
const currentDate = new Date().toISOString().split('T')[0];

console.log(`[SEO Build Script] Generating sitemap and robots.txt for: ${baseUrl}`);

// 2. Define Public Crawlable Routes
interface RouteConfig {
  path: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: string;
}

const publicRoutes: RouteConfig[] = [
  { path: '', changefreq: 'daily', priority: '1.0' },
  { path: '/categories', changefreq: 'daily', priority: '0.9' },
  { path: '/search', changefreq: 'daily', priority: '0.8' },
  { path: '/updates', changefreq: 'daily', priority: '0.8' },
  { path: '/blog', changefreq: 'weekly', priority: '0.8' },
  { path: '/track-order', changefreq: 'weekly', priority: '0.7' },
  { path: '/community', changefreq: 'weekly', priority: '0.6' },
  { path: '/more', changefreq: 'monthly', priority: '0.5' },
];

// 3. Generate XML Sitemap
const generateSitemapXml = (): string => {
  const urlsXml = publicRoutes
    .map((route) => {
      const fullUrl = `${baseUrl}${route.path}`;
      return `  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>
`;
};

// 4. Generate robots.txt
const generateRobotsTxt = (): string => {
  return `# SEO Robots.txt
# Generated during build for Cloudflare Pages

User-agent: *
Allow: /
Allow: /categories
Allow: /search
Allow: /updates
Allow: /blog
Allow: /track-order
Allow: /community
Allow: /more

# Disallow Private & Administrative Routes
Disallow: /admin
Disallow: /admin/
Disallow: /admin/*
Disallow: /vendor/dashboard
Disallow: /vendor/*
Disallow: /checkout
Disallow: /order-success

# Crawl-delay for crawler protection
Crawl-delay: 1

# Canonical Sitemap
Sitemap: ${baseUrl}/sitemap.xml
`;
};

// 5. Write to Directories (public/ and dist/ if exists)
const writeSeoFiles = () => {
  const sitemapContent = generateSitemapXml();
  const robotsContent = generateRobotsTxt();

  const targetDirs = [
    path.resolve(process.cwd(), 'public'),
    path.resolve(process.cwd(), 'dist'),
  ];

  targetDirs.forEach((dir) => {
    if (fs.existsSync(dir)) {
      const sitemapPath = path.join(dir, 'sitemap.xml');
      const robotsPath = path.join(dir, 'robots.txt');

      fs.writeFileSync(sitemapPath, sitemapContent, 'utf-8');
      fs.writeFileSync(robotsPath, robotsContent, 'utf-8');

      console.log(`[SEO Build Script] Wrote sitemap.xml & robots.txt to: ${dir}`);
    }
  });
};

try {
  writeSeoFiles();
  console.log('[SEO Build Script] SEO files generated successfully.');
} catch (error) {
  console.error('[SEO Build Script] Error generating SEO files:', error);
  process.exit(1);
}
