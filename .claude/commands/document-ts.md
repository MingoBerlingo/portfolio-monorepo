Add comprehensive JSDoc documentation to the specified TypeScript file.

Target file: $ARGUMENTS

For each **function**, add:

- Brief description of what it does
- `@param` tags with parameter names, types, and descriptions
- `@returns` tag with return type and description
- `@example` showing typical usage
- `@throws` if applicable (for error cases)

For each **class**, add:

- Brief description of the class purpose
- `@example` showing how to instantiate and use it
- Document the constructor parameters
- Document public methods and properties

For **interfaces/types**, add:

- Brief description of what the type represents
- Property descriptions inline or with `@property` tags
- `@example` showing sample data structure

## Style Guidelines

- Use clear, concise language
- Start descriptions with action verbs for functions (e.g., "Fetches...", "Sanitizes...", "Queries...")
- Include units for numeric values (e.g., "milliseconds", "pixels")
- Mention side effects if any (CMS queries, cache mutations, state changes)
- Keep examples realistic and based on actual usage patterns in this codebase

## Example Output

````typescript
/**
 * Executes a GraphQL query against the Payload CMS API with in-memory caching.
 *
 * @param query - The GraphQL query string
 * @param variables - Optional variables to pass to the query
 * @param options - Optional config (e.g., cache TTL in milliseconds)
 * @returns The typed query result from the CMS
 * @throws {CmsQueryError} If the GraphQL response contains errors and no data
 *
 * @example
 * ```typescript
 * const { Projects } = await cmsQuery<{ Projects: PaginatedResponse<Project> }>(`
 *   query {
 *     Projects(limit: 10) {
 *       docs { id title slug }
 *     }
 *   }
 * `);
 * ```
 */
export async function cmsQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
  options?: { ttl?: number }
): Promise<T> {
  // implementation
}

/**
 * Sanitizes CMS rich-text HTML output for safe rendering.
 * Allows standard tags plus `img`, `figure`, and `figcaption` for media content.
 *
 * @param dirty - Raw HTML string from the CMS Lexical editor
 * @returns Sanitized HTML string safe for `{@html}` rendering
 *
 * @example
 * ```typescript
 * const safeHtml = sanitize(project.content_html);
 * ```
 */
export function sanitize(dirty: string): string {
  // implementation
}

/**
 * Paginated response shape returned by Payload CMS collection queries.
 *
 * @example
 * ```typescript
 * const response: PaginatedResponse<Project> = {
 *   docs: [{ id: '1', title: 'Portfolio Site', slug: 'portfolio' }],
 *   totalDocs: 1,
 *   totalPages: 1,
 *   page: 1,
 *   limit: 10,
 *   hasNextPage: false,
 *   hasPrevPage: false,
 *   nextPage: null,
 *   prevPage: null
 * };
 * ```
 */
export interface PaginatedResponse<T> {
  docs: T[];
  totalDocs: number;
  // ...
}
````

Please document all functions, classes, interfaces, and types in the target file following these guidelines.
