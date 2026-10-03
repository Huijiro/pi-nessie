import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { isRuntimeDown, NESSIE_NAMESPACE, runNessie } from "../nessie.js";

/** Pull the trailing UUID out of `created context "title"  <uuid>`. */
function extractId(stdout: string): string | null {
	const match = stdout.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
	return match ? match[0] : null;
}

export function registerWriteTool(pi: ExtensionAPI) {
	pi.registerTool({
		name: "nessie_write",
		label: "Nessie Write",
		description: "Create a new context in the Nessie library from text. Returns the new context id.",
		promptSnippet: "Create a new Nessie context from text content",
		promptGuidelines: [
			"Use `nessie_write` to persist a note, decision, or summary into the Nessie context library.",
			"Pass a `folder` id (from nessie_list) to file the context under a folder; otherwise it lands at the top level.",
		],
		namespace: NESSIE_NAMESPACE,
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: true,
		},
		parameters: Type.Object({
			title: Type.String({ description: "Title for the new context" }),
			content: Type.String({ description: "Body content of the context" }),
			folder: Type.Optional(Type.String({ description: "Folder id to file the context under" })),
			emoji: Type.Optional(Type.String({ description: "Optional emoji for the context" })),
		}),
		outputSchema: Type.Object({
			id: Type.Union([Type.String(), Type.Null()]),
			title: Type.String(),
		}),

		async execute(_toolCallId, params, signal) {
			const args = ["tee", params.title];
			if (params.folder) args.push("--folder", params.folder);
			if (params.emoji) args.push("--emoji", params.emoji);

			try {
				const stdout = await runNessie(args, { input: params.content, signal });
				const id = extractId(stdout);
				return {
					content: [{ type: "text", text: `Created context "${params.title}"${id ? ` (#${id})` : ""}.` }],
					details: { id, title: params.title },
					structuredContent: { id, title: params.title },
				};
			} catch (err) {
				const hint = isRuntimeDown(err)
					? " Start it with `systemctl --user start nessie-daemon` or open the desktop app."
					: "";
				const msg = err instanceof Error ? err.message : String(err);
				return {
					content: [{ type: "text", text: `nessie_write failed: ${msg}${hint}` }],
					isError: true,
					details: { id: null, title: params.title },
					structuredContent: { id: null, title: params.title },
				};
			}
		},
	});
}
