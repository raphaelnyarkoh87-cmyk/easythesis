/**
 * Public Supabase settings. Both values are designed to be public:
 * the publishable key only allows what the database's row-level
 * security rules allow. Secret keys never go in this file.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "") ||
  "https://nargougeuxpxvvaluffp.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_IxEfE-9wGxYYEyTfIMbqxg_aDuqK8sA";

export const DOCUMENTS_BUCKET = "documents";
