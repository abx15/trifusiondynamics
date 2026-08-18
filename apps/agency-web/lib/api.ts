import {
  SERVICES_DATA,
  PORTFOLIO_DATA,
  BLOG_DATA,
  TESTIMONIALS_DATA,
  ServiceItem,
  PortfolioItem,
  BlogPost,
  Testimonial,
} from "./cms-static-data";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// Helper for relative time/caching revalidation
const FETCH_CONFIG: RequestInit = {
  next: { revalidate: 60 },
};

/**
 * Fetch services from backend, enhanced with local details.
 */
export async function getCmsServices(): Promise<ServiceItem[]> {
  try {
    const res = await fetch(`${API_BASE}/cms/services`, FETCH_CONFIG);
    if (!res.ok) {
      throw new Error(`Failed to fetch services: ${res.status}`);
    }
    const backendServices = await res.json();
    
    // Map backend stubs [{id, name}] to our enriched local features
    return SERVICES_DATA.map((local) => {
      const match = backendServices.find((b: any) => b.id === local.id || b.name?.toLowerCase() === local.name?.toLowerCase());
      if (match) {
        return {
          ...local,
          id: match.id,
          name: match.name || local.name,
        };
      }
      return local;
    });
  } catch (error) {
    console.warn("Backend /cms/services failed, returning static fallback data:", error);
    return SERVICES_DATA;
  }
}

/**
 * Fetch single service by slug
 */
export async function getServiceBySlug(slug: string): Promise<ServiceItem | undefined> {
  const services = await getCmsServices();
  return services.find((s) => s.slug === slug);
}

/**
 * Fetch page details from backend, falling back to dynamic configurations.
 */
export async function getCmsPage(slug: string): Promise<{ title: string; content?: string }> {
  try {
    const res = await fetch(`${API_BASE}/cms/pages/${slug}`, FETCH_CONFIG);
    if (!res.ok) {
      throw new Error(`Failed to fetch page ${slug}: ${res.status}`);
    }
    const data = await res.json();
    return {
      title: data.title || (slug === "about-us" ? "About Us" : slug),
      content: data.content || "",
    };
  } catch (error) {
    console.warn(`Backend /cms/pages/${slug} failed, returning fallback:`, error);
    if (slug === "about-us") {
      return {
        title: "About Us",
        content: "Trifusion Dynamics is a boutique agency delivering cloud infrastructure, SaaS engineering, and AI consulting.",
      };
    }
    if (slug === "privacy-policy") {
      return {
        title: "Privacy Policy",
        content: "We protect your data. Submissions are processed and secured in compliance with local guidelines.",
      };
    }
    return {
      title: slug.charAt(0).toUpperCase() + slug.slice(1).replace("-", " "),
      content: "",
    };
  }
}

/**
 * Submit Contact Form lead to backend
 */
export async function submitContactForm(data: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}): Promise<{ id: string }> {
  const payload = {
    ...data,
    source: "contact-form",
  };

  const res = await fetch(`${API_BASE}/cms/leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 429) {
    throw new Error("RATE_LIMIT");
  }

  if (!res.ok) {
    throw new Error(`Failed submission: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Get Case Studies / Portfolio Items
 */
export async function getPortfolioItems(): Promise<PortfolioItem[]> {
  // Returns static case study dataset
  return PORTFOLIO_DATA;
}

export async function getPortfolioItemBySlug(slug: string): Promise<PortfolioItem | undefined> {
  const items = await getPortfolioItems();
  return items.find((item) => item.slug === slug);
}

/**
 * Get Insights / Blog Posts
 */
export async function getBlogPosts(): Promise<BlogPost[]> {
  // Returns static blog dataset
  return BLOG_DATA;
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const posts = await getBlogPosts();
  return posts.find((post) => post.slug === slug);
}

/**
 * Get Testimonials
 */
export async function getTestimonials(): Promise<Testimonial[]> {
  return TESTIMONIALS_DATA;
}
