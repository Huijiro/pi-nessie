import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { isRuntimeDown, NESSIE_NAMESPACE, type NessieListResult, runNessie } from "../nessie.js";
import { NodeSchema } from "../types.js";

export function registerListTool(pi: ExtensionAPI) {
	pi.registerTool({
		name: "nessie_list",
		label: "Nessie List",
		description:
			"List the Nessie context graph: top-level roots, or the children of one node. Use the returned ids with nessie_read or nessie_search.",
		promptSnippet: "List Nessie graph roots or the children of one node",
		promptGuidelines: [
			"Call `nessie_list` with no arguments to see top-level folders and integration roots.",
			"Pass a `parent` id to browse into a folder or subtree.",
		],
		namespace: NESSIE_NAMESPACE,
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: true,
		},
		parameters: Type.Object({
			parent: Type.Optional(Type.String({ description: "Node id whose children to list; omit for roots" })),
			type: Type.Optional(Type.String({ description: "Filter by node kind" })),
			name: Type.Optional(Type.String({ description: "Case-insensitive name substring filter" })),
			limit: Type.Optional(Type.Number({ description: "Max results (default: 100)", default: 100 })),
		}),
		outputSchema: Type.Object({
			nodes: Type.Array(NodeSchema),
			hasMore: Type.Boolean(),
		}),

		async execute(_toolCallId, params, signal) {
			const args = ["ls"];
			if (params.parent) args.push(params.parent);
			if (params.type) args.push("--type", params.type);
			if (params.name) args.push("--name", params.name);
			args.push("--limit", String(params.limit ?? 100), "--json");

			let parsed: NessieListResult;
			try {
				const stdout = await runNessie(args, { signal });
				parsed = JSON.parse(stdout) as NessieListResult;
			} catch (err) {
				const hint = isRuntimeDown(err)
					? " Start it with `systemctl --user start nessie-daemon` or open the desktop app."
					: "";
				const msg = err instanceof Error ? err.message : String(err);
				return {
					content: [{ type: "text", text: `nessie_list failed: ${msg}${hint}` }],
					isError: true,
					details: { nodes: [], hasMore: false },
					structuredContent: { nodes: [], hasMore: false },
				};
			}

			const nodes = parsed.nodes ?? [];
			const lines = nodes.map((n) => {
				const marker = n.isContainer ? "📁" : "📄";
				const count = n.isContainer ? ` (${n.childCount})` : "";
				return `${marker} #${n.id} [${n.kind}] ${n.name}${count}`;
			});
			const more = parsed.hasMore ? "\n… more results available (raise limit)" : "";
			return {
				content: [
					{
						type: "text",
						text: nodes.length ? `${lines.join("\n")}${more}` : "No nodes found.",
					},
				],
				details: { nodes, hasMore: parsed.hasMore },
				structuredContent: { nodes, hasMore: parsed.hasMore },
			};
		},
	});
}
