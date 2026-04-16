export const homepageFaqs = [
  {
    question: "What is Conduikt?",
    answer:
      "Conduikt is an AI-powered marketing automation platform that audits your site, generates content, and publishes across social, email, and web channels — all from a single dashboard.",
  },
  {
    question: "How does the AI SEO audit work?",
    answer:
      "Conduikt crawls your website and runs a comprehensive technical and on-page SEO analysis. It identifies issues, scores your site, and provides specific, actionable fixes — not generic best practices.",
  },
  {
    question: "Can Conduikt publish directly to LinkedIn and X?",
    answer:
      "Yes. Conduikt connects to your X (Twitter) and LinkedIn accounts so you can generate and publish posts directly from the platform without switching tools.",
  },
  {
    question: "Do I need technical knowledge to use Conduikt?",
    answer:
      "No. Conduikt is built for founders, marketers, and agencies who want results without hiring a full marketing team. The interface is designed to be intuitive with AI handling the heavy lifting.",
  },
  {
    question: "What happens after the free plan?",
    answer:
      "The free plan includes 1 project and 5 AI generations per month. When you're ready to scale, Pro starts at $49/month with 250 generations, multi-channel publishing, and email sequences.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes. Conduikt uses Supabase with row-level security, encrypted connections, and never shares your data with third parties. Your content and analytics stay private.",
  },
];

export const softwareAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Conduikt",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "MarketingApplication",
  operatingSystem: "Web",
  description:
    "AI-powered marketing automation for founders, marketers, and agencies.",
  url: "https://conduikt.com/",
  screenshot: {
    "@type": "ImageObject",
    url: "https://conduikt.com/images/conduikt-dashboard.png",
    width: 600,
    height: 450,
  },
  featureList:
    "AI SEO Audit, CRO Analysis, Keyword Research, Content Generation, Multi-Channel Publishing, Email Sequence Builder, Video Ad Creator, A/B Testing, Growth Playbook, Campaign Orchestration, Analytics Feedback Loop, Client Reports",
  publisher: {
    "@type": "Organization",
    name: "Conduikt",
    url: "https://conduikt.com/",
  },
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: "https://conduikt.com/signup/?plan=free",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "0",
        priceCurrency: "USD",
        unitCode: "MON",
        billingIncrement: 1,
      },
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "49",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: "https://conduikt.com/signup/?plan=pro",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "49",
        priceCurrency: "USD",
        unitCode: "MON",
        billingIncrement: 1,
      },
    },
    {
      "@type": "Offer",
      name: "Growth",
      price: "99",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: "https://conduikt.com/signup/?plan=growth",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "99",
        priceCurrency: "USD",
        unitCode: "MON",
        billingIncrement: 1,
      },
    },
    {
      "@type": "Offer",
      name: "Agency",
      price: "249",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: "https://conduikt.com/signup/?plan=agency",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "249",
        priceCurrency: "USD",
        unitCode: "MON",
        billingIncrement: 1,
      },
    },
  ],
};

export const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: homepageFaqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};
