import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { isRuntimeDown, NESSIE_NAMESPACE, type NessieGrepResult, runNessie } from "../nessie.js";
import { GrepMatchSchema } from "../types.js";

export function registerSearchTool(pi: ExtensionAPI) {
	pi.registerTool({
		name: "nessie_search",
		label: "Nessie Search",
		description:
			"Search the Nessie context library by content. Returns matching contexts (notes, chat messages, transcripts) with their IDs for follow-up reads.",
		promptSnippet: "Search the Nessie context library for relevant contexts by content",
		promptGuidelines: [
			"Use `nessie_search` to recall prior decisions, notes, or agent traces stored in the Nessie context library.",
			"Pass a `scope` id (a folder or node id from nessie_list) to search within one subtree.",
			"Use `literal: true` for exact-string matches; otherwise the query is treated as a search expression.",
		],
		namespace: NESSIE_NAMESPACE,
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: true,
		},
		parameters: Type.Object({
			query: Type.String({ description: "Search query matched against context content" }),
			scope: Type.Optional(Type.String({ description: "Optional node/folder id to restrict the search subtree" })),
			type: Type.Optional(Type.String({ description: "Filter by node kind, e.g. transcript, pi_chat_message" })),
			literal: Type.Optional(Type.Boolean({ description: "Treat the query as a literal string (default: false)" })),
			limit: Type.Optional(Type.Number({ description: "Max results (default: 10)", default: 10 })),
		}),
		outputSchema: Type.Object({
			results: Type.Array(GrepMatchSchema),
			query: Type.String(),
		}),

		async execute(_toolCallId, params, signal) {
			const args = ["grep", params.query];
			if (params.scope) args.push(params.scope);
			if (params.type) args.push("--type", params.type);
			if (params.literal) args.push("-F");
			args.push("--limit", String(params.limit ?? 10), "--json");

			let parsed: NessieGrepResult;
			try {
				const stdout = await runNessie(args, { signal });
				parsed = JSON.parse(stdout) as NessieGrepResult;
			} catch (err) {
				const hint = isRuntimeDown(err)
					? " Start it with `systemctl --user start nessie-daemon` or open the desktop app."
					: "";
				const msg = err instanceof Error ? err.message : String(err);
				return {
					content: [{ type: "text", text: `nessie_search failed: ${msg}${hint}` }],
					isError: true,
					details: { results: [], query: params.query },
					structuredContent: { results: [], query: params.query },
				};
			}

			const results = parsed.results ?? [];
			if (results.length === 0) {
				return {
					content: [{ type: "text", text: `No contexts matched "${params.query}".` }],
					details: { results: [], query: params.query },
					structuredContent: { results: [], query: params.query },
				};
			}

			const lines = results.map((r) => {
				const snippet = r.body.length > 200 ? `${r.body.slice(0, 200)}…` : r.body;
				return `#${r.node.id} [${r.node.kind}] ${r.node.name}\n  ${snippet}`;
			});
			return {
				content: [
					{
						type: "text",
						text: `Found ${results.length} context${results.length === 1 ? "" : "s"}:\n\n${lines.join("\n\n")}`,
					},
				],
				details: { results, query: params.query },
				structuredContent: { results, query: params.query },
			};
		},
	});
}
