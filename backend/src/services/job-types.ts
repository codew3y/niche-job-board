/** Shared shape for a single job, used by the detail page and the JSON-LD builder. */
export type Job = {
  id: string;
  slug: string;
  title: string;
  description: string;
  responsibilities: string | null;
  requirements: string | null;
  engagement_type: string;
  budget_min: string | null;
  budget_max: string | null;
  currency: string;
  location_type: string;
  location: string | null;
  experience_level: string | null;
  status: string;
  deadline: string | null;
  published_at: string | null;
  created_at: string;
  client_profiles: {
    id: string;
    company_name: string;
    website: string | null;
    industry: string | null;
    about: string | null;
    logo_url: string | null;
  } | null;
  job_skills: {
    is_required: boolean;
    skills: { name: string; slug: string; category: string } | null;
  }[];
};
