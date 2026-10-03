import { execFile } from "node:child_process";

export const NESSIE_NAMESPACE = {
	name: "nessie",
	description: "Nessie context library (search, read, write, edit contexts via the nessie CLI)",
} as const;

/** Resolve the nessie binary. Override with NESSIE_BIN if it is not on PATH. */
function nessieBin(): string {
	return process.env.NESSIE_BIN ?? "nessie";
}

export class NessieError extends Error {
	constructor(
		message: string,
		readonly code: number | null,
		readonly stderr: string,
	) {
		super(message);
		this.name = "NessieError";
	}
}

/** True when the failure is the runtime being offline rather than a bad command. */
export function isRuntimeDown(err: unknown): boolean {
	return err instanceof NessieError && /runtime is not running|could not reach Nessie|not running/i.test(err.stderr);
}

interface RunOptions {
	/** Text piped to the command's stdin. */
	input?: string;
	signal?: AbortSignal;
}

/** Run a nessie subcommand and resolve its stdout. Rejects with NessieError on failure. */
export function runNessie(args: string[], opts: RunOptions = {}): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = execFile(
			nessieBin(),
			args,
			{ maxBuffer: 16 * 1024 * 1024, signal: opts.signal },
			(error, stdout, stderr) => {
				if (error) {
					const code = typeof error.code === "number" ? error.code : null;
					const msg = stderr.trim() || error.message;
					reject(new NessieError(msg, code, stderr));
					return;
				}
				resolve(stdout);
			},
		);
		if (opts.input !== undefined) {
			child.stdin?.end(opts.input);
		}
	});
}

/** A node in the Nessie graph as emitted by `--json` output. */
export interface NessieNode {
	[key: string]: string | number | boolean | null;
	id: string;
	name: string;
	kind: string;
	emoji: string;
	isContainer: boolean;
	childCount: number;
	ownerEmail: string;
	ownership: string;
	initiated: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface NessieListResult {
	[key: string]: boolean | NessieNode[];
	hasMore: boolean;
	nodes: NessieNode[];
}

export interface NessieGrepMatch {
	[key: string]: string | number | null | NessieNode;
	body: string;
	matchedField: string;
	modality: string | null;
	score: number;
	sliceId: string;
	node: NessieNode;
}

export interface NessieGrepResult {
	[key: string]: NessieGrepMatch[];
	results: NessieGrepMatch[];
}
