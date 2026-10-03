# pi-nessie

A [Pi](https://github.com/earendil-works/pi) extension that exposes the [Nessie](https://nessielabs.com/) context library to your agent as tools, through the `nessie` CLI.

Nessie is a cloud-synced context graph (notes, chat messages, agent transcripts) with a filesystem-style CLI. This extension lets a Pi agent search, read, write, and edit those contexts directly.

## Requirements

The Nessie runtime must be reachable — either the desktop app is open, or the headless daemon is running:

```bash
npm i -g @nessielabs/daemon
nessie-daemon start          # or: systemctl --user start nessie-daemon
nessie status                # verify
```

If the `nessie` binary is not on `PATH`, set `NESSIE_BIN` to its absolute path.

## Install

```bash
pi install ./pi-nessie          # local path (development)
pi install git:github.com/Huijiro/pi-nessie
```

Add `-l` to install for the current project only.

## Tools

| Tool | Description |
|------|-------------|
| `nessie_search` | Search context content; returns matches with ids (`nessie grep`) |
| `nessie_list` | List graph roots or a node's children (`nessie ls`) |
| `nessie_read` | Read one context's full content + metadata (`nessie cat` + `stat`) |
| `nessie_write` | Create a new context from text (`nessie tee`) |
| `nessie_edit` | Exact-text replace inside a context (`nessie sed`) |

All tools are namespaced under `nessie` and return structured data for Pi codemode scripts. When the runtime is offline the tools fail gracefully with a hint to start the daemon.

## How it works

Each tool shells out to the `nessie` CLI with `--json` where available and parses the result. `session_start` probes `nessie status` and notifies whether the runtime is connected.
