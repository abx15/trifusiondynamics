import {
  ServiceItem,
  PortfolioItem,
  BlogPost,
  Testimonial,
} from "./cms-static-data";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "https://trifusiondynamics-api.onrender.com/api" : "http://localhost:8000/api");

const FETCH_CONFIG: RequestInit = {
  next: { revalidate: 60 },
};

async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...FETCH_CONFIG,
    ...options,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
}

function normalizeArray<T>(payload: T[] | { data?: T[]; items?: T[]; results?: T[] } | null | undefined): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const candidate = payload.data ?? payload.items ?? payload.results ?? [];
    return Array.isArray(candidate) ? candidate : [];
  }

  return [];
}

export async function getCmsServices(): Promise<ServiceItem[]> {
  try {
    const payload = await fetchJson<ServiceItem[] | { data?: ServiceItem[]; items?: ServiceItem[]; results?: ServiceItem[] }>('/cms/services');
    return normalizeArray(payload).filter((service): service is ServiceItem => Boolean(service && typeof service === "object" && typeof (service as ServiceItem).slug === "string" && (service as ServiceItem).slug.length > 0));
  } catch (error) {
    console.error("CMS services unavailable; no fallback data is returned.", error);
    return [];
  }
}

export async function getServiceBySlug(slug: string): Promise<ServiceItem | undefined> {
  const services = await getCmsServices();
  return services.find((s) => s.slug === slug);
}

export async function getCmsPage(slug: string): Promise<{ title: string; content?: string }> {
  try {
    return await fetchJson<{ title: string; content?: string }>(`/cms/pages/${slug}`);
  } catch (error) {
    console.error(`CMS page ${slug} unavailable; no fallback content is returned.`, error);
    return {
      title: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " "),
      content: "",
    };
  }
}

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

export async function getPortfolioItems(): Promise<PortfolioItem[]> {
  try {
    const payload = await fetchJson<PortfolioItem[] | { data?: PortfolioItem[]; items?: PortfolioItem[]; results?: PortfolioItem[] }>('/portfolio');
    return normalizeArray(payload).filter((item): item is PortfolioItem => Boolean(item && typeof item === "object" && typeof (item as PortfolioItem).slug === "string" && (item as PortfolioItem).slug.length > 0));
  } catch (error) {
    console.error("Portfolio data unavailable; no fallback data is returned.", error);
    return [];
  }
}

export async function getPortfolioItemBySlug(slug: string): Promise<PortfolioItem | undefined> {
  const items = await getPortfolioItems();
  return items.find((item) => item.slug === slug);
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const payload = await fetchJson<BlogPost[] | { data?: BlogPost[]; items?: BlogPost[]; results?: BlogPost[] }>('/blog');
    return normalizeArray(payload).filter((post): post is BlogPost => Boolean(post && typeof post === "object" && typeof (post as BlogPost).slug === "string" && (post as BlogPost).slug.length > 0));
  } catch (error) {
    console.error("Blog data unavailable; no fallback data is returned.", error);
    return [];
  }
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const posts = await getBlogPosts();
  return posts.find((post) => post.slug === slug);
}

export async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const payload = await fetchJson<Testimonial[] | { data?: Testimonial[]; items?: Testimonial[]; results?: Testimonial[] }>('/testimonials');
    return normalizeArray(payload);
  } catch (error) {
    console.error("Testimonials unavailable; no fallback data is returned.", error);
    return [];
  }
}
