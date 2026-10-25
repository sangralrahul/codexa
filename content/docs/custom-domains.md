---
title: Custom domains
description: Pointing your own domain at a Codexa hosting deployment with a CNAME record, and what is planned for verification.
category: Ship
order: 21
tags: [domains, dns, hosting]
author: Codexa Team
date: 2026-10-24
related: [deployment, billing]
---

Custom domains are available on Pro and Team plans (3 and 20 domains per workspace) for projects deployed with Codexa hosting.

## Current state

Today custom domains are set up **manually with a CNAME record**. Automatic DNS verification and certificate issuance are planned and listed on the [roadmap](/roadmap); until then the steps below are what works.

## Steps

1. Deploy the project with Codexa hosting and note its subdomain (for example `my-site.apps.example.com`).
2. In the project's **Settings → Domains**, add your domain (`www.yourdomain.com`). Codexa records it against the project.
3. At your DNS provider, create a CNAME record:

   | Type  | Name  | Value                          |
   | ----- | ----- | ------------------------------ |
   | CNAME | `www` | `my-site.apps.example.com`     |

4. Wait for DNS to propagate (minutes to a few hours depending on your provider's TTL).
5. Open `https://www.yourdomain.com`. The hosting proxy routes requests by hostname to the project's live deployment.

## Apex domains

Many DNS providers do not allow a CNAME on the apex (`yourdomain.com`). Use your provider's ALIAS/ANAME record if it has one, or redirect the apex to `www` at the provider.

## TLS certificates

Certificates for custom domains depend on the operator's edge configuration. Until automatic issuance ships, ask the operator of your Codexa deployment how certificates are provided for custom hostnames.

## Removing a domain

Remove it from project settings and delete the CNAME record. Requests for a removed hostname return 404 from the hosting proxy.
