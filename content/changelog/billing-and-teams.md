---
title: Billing and teams
description: Free, Pro, Team and Enterprise plans in INR and USD, Stripe and Razorpay with idempotent webhooks, server-side usage limits, team roles and the staff admin area.
category: Release
order: 7
version: 0.1.0
tags: [release, billing, teams, admin]
author: Codexa Team
date: 2026-10-24
related: [platform-foundation, public-website]
---

## Plans and billing

- Free, Pro, Team and Enterprise plans defined in one configuration, priced in INR and USD with monthly and annual intervals.
- Stripe Checkout and billing portal for USD; Razorpay orders for INR.
- Inbound webhooks verified by signature and deduplicated by event id.
- Usage limits enforced on the server before each metered action: AI requests and tokens, runtime minutes, deployments, storage, projects, members. Exceeding a limit returns `402 quota_exceeded`.

## Teams

- Team workspaces with owner/admin/editor/viewer roles and email invitations.

## Admin

- Staff-only area for users, workspaces, subscriptions, provider health, jobs, deployments, support tickets, abuse reports, audit logs and feature flags.

Documentation: [Billing](/docs/billing), [Webhooks](/api/webhooks).
