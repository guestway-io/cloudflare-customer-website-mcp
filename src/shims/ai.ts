/**
 * Stub for the optional `ai` (Vercel AI SDK) peer dependency of the `agents`
 * package. The agents client bundle does a dynamic `import("ai")` to grab
 * `jsonSchema`, but that code path belongs to the AI-chat / codemode features
 * we do not use; this MCP server only uses `agents/mcp`. Aliasing `ai` to this
 * shim lets esbuild resolve the import without pulling the full AI SDK into the
 * Worker bundle.
 *
 * `jsonSchema` is provided as an identity passthrough so that, in the unlikely
 * event the path is reached, it degrades to "use the schema as-is" rather than
 * throwing on a missing export.
 */

export function jsonSchema<T>(schema: T): T {
  return schema;
}

export default { jsonSchema };
