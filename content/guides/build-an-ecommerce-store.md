---
title: Build an ecommerce store
description: Catalog, cart and checkout with a static or React storefront and a small Express API that owns prices and payments.
category: Projects
order: 3
tags: [ecommerce, stripe, razorpay, catalog]
author: Codexa Team
date: 2026-10-24
difficulty: intermediate
duration: 90 min
related: [build-a-saas, deploy-your-first-app]
---

A store has two halves with very different trust levels: the catalog and cart (fine in the browser) and prices, stock and payment (must live on a server). This guide keeps them in two projects.

## Step 1: Storefront

Create a project from an ecommerce starter in the [templates](/templates/ecommerce) list (Vite + React). Then:

```text
Build the catalog from src/data/products.json:
- /  grid of products with image, name, price
- /products/:slug  detail page with an "Add to cart" button
- a cart drawer with quantities and a subtotal, persisted in localStorage
Prices are display-only here; the API recalculates them at checkout.
```

Run the preview and check phone width; product grids are where responsive bugs show first.

## Step 2: Checkout API

Create a **Node + Express** project named `store-api`, connect a database ([guide](/guides/connect-a-database)) and add the payment credential from workspace Integrations as an environment variable.

```text
Add checkout:
- products table with price_cents and stock; a seed script from products.json
- POST /checkout receives [{ productId, quantity }], re-prices every line
  from the database, checks stock, and creates a Stripe Checkout session
  (or a Razorpay order when CURRENCY=INR)
- POST /webhooks/<provider> verifies the signature, deduplicates by event id,
  decrements stock and stores the order
```

> Warning: Never accept prices from the browser. The API must look every price up again.

## Step 3: Connect the two

Set `VITE_API_URL` in the storefront and ask the agent to call `POST /checkout` from the cart's "Checkout" button, redirecting to the returned URL.

## Step 4: Orders and email

Add a Resend connection if you want order confirmation emails, and store the API key in `store-api`. Ask the agent to send an email from the webhook handler after the order is stored, never before.

## Step 5: Deploy

- Storefront → Codexa hosting (static). Add a [custom domain](/docs/custom-domains) on Pro.
- API → a Node host via GitHub push; configure the provider's webhook URL to point at it.

## Going further

- Product search: ask the agent for a client-side index over the catalog for small stores; move it to the API when the catalog grows.
- Admin panel: a third small React project behind the API's auth, or extend the API with an `/admin` section.
