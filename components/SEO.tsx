import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useStore } from '../hooks/useStore';
import { useStandaloneCategory } from '../hooks/useStandaloneCategory';
import { safeJsonStringify } from '../utils/helpers';

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    article?: boolean;
    type?: 'website' | 'article' | 'product';
    canonical?: string;
    schema?: object | object[];
    keywords?: string[] | string;
    noindex?: boolean;
    price?: number;
    currency?: string;
    availability?: 'InStock' | 'OutOfStock';
    siteName?: string;
}

export const SEO: React.FC<SEOProps> = ({ 
    title, 
    description, 
    image, 
    article, 
    type = 'website',
    canonical, 
    schema,
    keywords,
    noindex = false,
    price,
    currency = 'PKR',
    availability = 'InStock',
    siteName
}) => {
    const { settings } = useStore();
    const { isStandalone, storeName, storeLogoUrl } = useStandaloneCategory();

    const effectiveAppName = siteName || (isStandalone ? storeName : (settings?.appName || 'onliny'));
    const defaultDescription = isStandalone
        ? `Official ${effectiveAppName} storefront. Discover curated fashion, baby clothing, boy clothing, gifts, premium deals, fast nationwide shipping, and cash on delivery.`
        : 'Online shopping in Pakistan on onliny (onliny.co.uk) - Baby clothing, boy wear, girlfriend gifts, boyfriend gifts, couple gift hampers, and women fashion with fast Cash on Delivery and easy returns.';
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const currentUrl = typeof window !== 'undefined' ? (canonical || window.location.href) : '';

    const seoTitle = title 
        ? (title.includes(effectiveAppName) ? title : `${title} | ${effectiveAppName}`)
        : `${effectiveAppName} - Online Shopping Pakistan | Baby & Boy Clothing, Gifts & Fashion`;
    const seoDescription = description || defaultDescription;
    const seoImage = image || (isStandalone ? storeLogoUrl : settings?.logoUrl) || `${siteUrl}/favicon.svg`;
    const keywordString = Array.isArray(keywords) 
        ? keywords.join(', ') 
        : (keywords || `${effectiveAppName}, onliny.co.uk, online shopping Pakistan, baby clothing Pakistan, baby clothes, boy clothing, boys wear, girlfriend gifts, gifts for girlfriend, boyfriend gifts, gifts for boyfriend, couple gifts, gift hampers, women fashion, lawn suits, COD Pakistan`);
    const ogType = article ? 'article' : (type === 'product' ? 'product' : 'website');

    // Direct synchronous DOM update for fast crawler indexing and mobile web view header syncing
    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.title = seoTitle;
            const descMeta = document.querySelector('meta[name="description"]');
            if (descMeta) descMeta.setAttribute('content', seoDescription);
            const ogTitleMeta = document.querySelector('meta[property="og:title"]');
            if (ogTitleMeta) ogTitleMeta.setAttribute('content', seoTitle);
            const ogDescMeta = document.querySelector('meta[property="og:description"]');
            if (ogDescMeta) ogDescMeta.setAttribute('content', seoDescription);
            const ogImgMeta = document.querySelector('meta[property="og:image"]');
            if (ogImgMeta && seoImage) ogImgMeta.setAttribute('content', seoImage);
        }
    }, [seoTitle, seoDescription, seoImage]);

    return (
        <Helmet>
            {/* Standard HTML Metadata */}
            <title>{seoTitle}</title>
            <meta name="description" content={seoDescription} />
            <meta name="keywords" content={keywordString} />
            {noindex ? (
                <meta name="robots" content="noindex, nofollow" />
            ) : (
                <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
            )}
            {currentUrl && <link rel="canonical" href={currentUrl} />}

            {/* Open Graph / Facebook */}
            <meta property="og:site_name" content={effectiveAppName} />
            <meta property="og:title" content={seoTitle} />
            <meta property="og:description" content={seoDescription} />
            <meta property="og:type" content={ogType} />
            {currentUrl && <meta property="og:url" content={currentUrl} />}
            {seoImage && <meta property="og:image" content={seoImage} />}
            {seoImage && <meta property="og:image:alt" content={seoTitle} />}

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={seoTitle} />
            <meta name="twitter:description" content={seoDescription} />
            {seoImage && <meta name="twitter:image" content={seoImage} />}

            {/* Product Specific Microdata */}
            {type === 'product' && price !== undefined && (
                <>
                    <meta property="product:price:amount" content={price.toString()} />
                    <meta property="product:price:currency" content={currency} />
                    <meta property="product:availability" content={availability.toLowerCase()} />
                </>
            )}

            {/* JSON-LD Structured Data */}
            {schema && (
                Array.isArray(schema) ? (
                    schema.map((item, idx) => (
                        <script key={idx} type="application/ld+json">
                            {safeJsonStringify(item)}
                        </script>
                    ))
                ) : (
                    <script type="application/ld+json">
                        {safeJsonStringify(schema)}
                    </script>
                )
            )}
        </Helmet>
    );
};
