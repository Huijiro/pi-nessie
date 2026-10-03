import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { isRuntimeDown, NESSIE_NAMESPACE, type NessieNode, runNessie } from "../nessie.js";
import { NodeSchema } from "../types.js";

export function registerReadTool(pi: ExtensionAPI) {
	pi.registerTool({
		name: "nessie_read",
		label: "Nessie Read",
		description: "Read the full content of one Nessie context by id, with its metadata.",
		promptSnippet: "Read the full content of a Nessie context by id",
		promptGuidelines: [
			"Use `nessie_read` after `nessie_search` or `nessie_list` to pull the full content of a context.",
		],
		namespace: NESSIE_NAMESPACE,
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: true,
		},
		parameters: Type.Object({
			id: Type.String({ description: "Context node id" }),
		}),
		outputSchema: Type.Object({
			id: Type.String(),
			content: Type.String(),
			node: Type.Union([NodeSchema, Type.Null()]),
		}),

		async execute(_toolCallId, params, signal) {
			try {
				const content = await runNessie(["cat", params.id], { signal });
				let node: NessieNode | null = null;
				try {
					node = JSON.parse(await runNessie(["stat", params.id, "--json"], { signal })) as NessieNode;
				} catch {
					// Metadata is best-effort; content is the primary payload.
				}
				const header = node ? `[${node.kind}] ${node.name}\n\n` : "";
				return {
					content: [{ type: "text", text: `${header}${content}` }],
					details: { id: params.id, content, node },
					structuredContent: { id: params.id, content, node },
				};
			} catch (err) {
				const hint = isRuntimeDown(err)
					? " Start it with `systemctl --user start nessie-daemon` or open the desktop app."
					: "";
				const msg = err instanceof Error ? err.message : String(err);
				return {
					content: [{ type: "text", text: `nessie_read failed: ${msg}${hint}` }],
					isError: true,
					details: { id: params.id, content: "", node: null },
					structuredContent: { id: params.id, content: "", node: null },
				};
			}
		},
	});
}
