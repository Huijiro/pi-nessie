import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { isRuntimeDown, NESSIE_NAMESPACE, runNessie } from "../nessie.js";

export function registerEditTool(pi: ExtensionAPI) {
	pi.registerTool({
		name: "nessie_edit",
		label: "Nessie Edit",
		description:
			"Replace exact text inside an existing Nessie context. By default replaces the first occurrence; set all to replace every occurrence.",
		promptSnippet: "Replace exact text inside a Nessie context",
		promptGuidelines: [
			"Use `nessie_edit` to update an existing context; `old` must match the current text exactly.",
			"Read the context first with `nessie_read` to copy the exact text you want to replace.",
		],
		namespace: NESSIE_NAMESPACE,
		annotations: {
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: false,
			openWorldHint: true,
		},
		parameters: Type.Object({
			id: Type.String({ description: "Context node id" }),
			old: Type.String({ description: "Exact text to replace" }),
			new: Type.String({ description: "Replacement text" }),
			all: Type.Optional(Type.Boolean({ description: "Replace all occurrences (default: first only)" })),
		}),
		outputSchema: Type.Object({
			id: Type.String(),
			ok: Type.Boolean(),
		}),

		async execute(_toolCallId, params, signal) {
			const args = ["sed", params.id, "--old", params.old, "--new", params.new];
			if (params.all) args.push("--all");

			try {
				await runNessie(args, { signal });
				return {
					content: [{ type: "text", text: `Edited context #${params.id}.` }],
					details: { id: params.id, ok: true },
					structuredContent: { id: params.id, ok: true },
				};
			} catch (err) {
				const hint = isRuntimeDown(err)
					? " Start it with `systemctl --user start nessie-daemon` or open the desktop app."
					: "";
				const msg = err instanceof Error ? err.message : String(err);
				return {
					content: [{ type: "text", text: `nessie_edit failed: ${msg}${hint}` }],
					isError: true,
					details: { id: params.id, ok: false },
					structuredContent: { id: params.id, ok: false },
				};
			}
		},
	});
}
