import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import { FREE_TOOLS, getFreeToolBySlug } from "@/lib/free-tools/catalog";
import { ToolPageLayout } from "@/components/free-tools/ToolPageLayout";

interface ToolPageProps {
    params: { toolSlug: string };
}

export function generateStaticParams() {
    return FREE_TOOLS.map((tool) => ({ toolSlug: tool.slug }));
}

export function generateMetadata({ params }: ToolPageProps): Metadata {
    const tool = getFreeToolBySlug(params.toolSlug);

    if (!tool) {
        return {
            title: "Free Tool | Buildstate",
        };
    }

    return {
        title: `${tool.name} | Buildstate Free Tools`,
        description: tool.seoDescription,
        alternates: {
            canonical: `/free-tools/${tool.slug}`,
        },
    };
}

export default function FreeToolDetailPage({ params }: ToolPageProps) {
    const tool = getFreeToolBySlug(params.toolSlug);

    if (!tool) {
        notFound();
    }

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: tool.name,
        description: tool.seoDescription,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "AUD",
        },
        publisher: {
            "@type": "Organization",
            name: "Buildstate",
            url: "https://buildstate.com.au",
        },
    };

    return (
        <>
            <Script id={`schema-${tool.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
            <ToolPageLayout tool={tool} />
        </>
    );
}
