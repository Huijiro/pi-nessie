import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isRuntimeDown, runNessie } from "./nessie.js";
import { registerEditTool } from "./tools/edit.js";
import { registerListTool } from "./tools/list.js";
import { registerReadTool } from "./tools/read.js";
import { registerSearchTool } from "./tools/search.js";
import { registerWriteTool } from "./tools/write.js";

export default function (pi: ExtensionAPI) {
	registerSearchTool(pi);
	registerListTool(pi);
	registerReadTool(pi);
	registerWriteTool(pi);
	registerEditTool(pi);

	pi.on("session_start", async (_event, ctx) => {
		try {
			const status = await runNessie(["status"]);
			const user = status.match(/^user\s+(.+)$/m)?.[1]?.trim();
			ctx.ui.notify(user ? `nessie: connected (${user})` : "nessie: connected", "info");
		} catch (err) {
			if (isRuntimeDown(err)) {
				ctx.ui.notify("nessie: runtime offline — start nessie-daemon to enable context tools", "warning");
			} else {
				const msg = err instanceof Error ? err.message : String(err);
				ctx.ui.notify(`nessie: unavailable (${msg})`, "warning");
			}
		}
	});
}
