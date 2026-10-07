// Plain-words FAQ (docs/DESIGN.md §Voice). Shown on the homepage and
// /pricing, and emitted as FAQPage JSON-LD.
export const homepageFaqs = [
  {
    question: "What does Conduikt actually do?",
    answer:
      "It checks your website and tells you what to fix, writes your blog posts, social posts and emails, posts them to X and LinkedIn for you, and writes email series you can send from your own email tool. All from one screen.",
  },
  {
    question: "How does the website check work?",
    answer:
      "Conduikt reads every page of your site the way Google does, gives it a score out of 100, and lists the exact things to fix, with the code ready to paste. No generic tips.",
  },
  {
    question: "Does it really post to X and LinkedIn for me?",
    answer:
      "Yes. Connect your X and LinkedIn accounts once. After that Conduikt can write a post and publish it without you leaving the app. You choose whether it asks you first.",
  },
  {
    question: "Do I need to be technical?",
    answer:
      "No. Conduikt is made for founders and small business owners who don't have a marketing team. If you can paste a web address, you can use it.",
  },
  {
    question: "What happens after the free plan?",
    answer:
      "Free gives you 1 website and 5 pieces of content a month, for as long as you like. When you want more, Pro is $49 a month for 250 pieces of content, posting to every channel, and email series.",
  },
  {
    question: "Is my data safe?",
    answer:
      "Yes. Your data is stored with Supabase, protected so only your account can read it, and sent over encrypted connections. We never share or sell it. You can delete it any time.",
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
