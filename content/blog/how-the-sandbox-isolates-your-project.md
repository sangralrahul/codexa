---
title: How the sandbox isolates your project
description: Generated code never runs inside Codexa's web server. A look at the runner service, Linux namespaces, cgroups and the preview proxy.
category: Engineering
tags: [sandbox, security, runtime]
author: Codexa Team
date: 2026-10-24
related: [why-codexa-snapshots-before-every-ai-run]
---

The first rule we wrote down for Codexa was that user code, and code written by a model, never executes in the same process as the web application. Everything that runs, from `npm install` to a dev server, runs in a sandbox managed by a separate service. This post describes that service as it exists today.

## Two processes, one job each

The **web app** stores files, authenticates people, talks to the AI provider and renders the UI. It cannot spawn a shell.

The **runner** is a separate Node service with one job: given a project id and an allow-listed command, materialise the files into an isolated working directory, run the command with limits, and stream the output back. The web app talks to it over an authenticated internal API; the runner trusts nothing from the browser.

## What "isolated" means here

The default driver runs each command as an unprivileged user inside fresh Linux namespaces:

- a **user namespace** so root inside is nobody outside,
- a **PID namespace** so the process tree cannot see or signal anything else,
- a **mount namespace** with the project directory and a read-only toolchain,
- a **network namespace** with the policy the operator chooses for package installs.

Resource limits come from **cgroups**: a memory ceiling, a process count ceiling, and a wall-clock timeout on every command. Hitting a limit kills the command and the log says so; it does not take the host with it.

Operators who prefer containers can switch to the **Docker** driver, and those who want execution off the box entirely can use the **E2B** driver. The web app does not know or care which one is active.

## Commands are allow-listed

The agent's `run_command` tool and the Logs panel can run exactly `install`, `build`, `test` and `typecheck`, plus the template's dev command for previews. There is no "run arbitrary shell" tool. That removes a whole category of prompt-injection outcomes: a malicious README cannot talk the model into exfiltrating anything, because the tool to do so does not exist.

## Previews without opening ports

A running preview listens on a port inside its sandbox. Users reach it through a **host-based proxy**: each sandbox gets a hostname, the proxy maps the hostname to the sandbox, and nothing else is reachable. Sandboxes do not see each other's hostnames or networks.

## Logs are the truth

Every line of `stdout` and `stderr` is streamed to the Logs panel and to the agent when it asks. We do not summarise or hide errors, because the next step (yours or the agent's) depends on the real message.

## What this does not claim

Isolation of this kind is a strong engineering boundary, not a certification. Codexa has not been audited by a third party, and we say so on the [security page](/docs/security). If you find a way out of the sandbox, we want to know: [security@codexa.app](mailto:security@codexa.app).
