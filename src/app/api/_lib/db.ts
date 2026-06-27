/**
 * Thin, well-typed facade over the Supabase client.
 *
 * The installed @supabase/supabase-js + postgrest-js versions don't thread the
 * Database generic through chained query builders, so `.from(...).select(...)`
 * infers result rows as `never`. We own the API routes but not the shared
 * `@/lib/supabase/server` client, so we wrap the builder here to restore useful
 * types at the call sites without using `any` in handlers.
 */

type Result<Row> = { data: Row[] | null; error: unknown; count: number | null };
type SingleResult<Row> = { data: Row | null; error: unknown };

interface FilterBuilder<Row> extends PromiseLike<Result<Row>> {
  eq: (col: string, val: unknown) => FilterBuilder<Row>;
  or: (filter: string) => FilterBuilder<Row>;
  limit: (n: number) => FilterBuilder<Row>;
  single: () => PromiseLike<SingleResult<Row>>;
  maybeSingle: () => PromiseLike<SingleResult<Row>>;
}

interface MutationBuilder extends PromiseLike<{ error: unknown }> {
  select: <Row = Record<string, unknown>>(cols?: string) => FilterBuilder<Row>;
  eq: (col: string, val: unknown) => MutationBuilder;
}

interface QueryBuilder {
  select: <Row = Record<string, unknown>>(
    cols?: string,
    opts?: { count?: "exact"; head?: boolean },
  ) => FilterBuilder<Row>;
  insert: (values: unknown) => MutationBuilder;
  update: (values: unknown) => MutationBuilder;
  upsert: (values: unknown, opts?: { onConflict?: string }) => MutationBuilder;
}

type AnyClient = {
  from: (table: string) => QueryBuilder;
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string; email?: string | null } | null };
    }>;
  };
};

/**
 * Cast a Supabase client (or null) to the typed facade. Returns null when the
 * client is null so callers keep their demo-mode guards.
 */
export function db<T>(client: T | null): AnyClient | null {
  return client ? (client as unknown as AnyClient) : null;
}
