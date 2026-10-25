---
title: Billing
description: Plans, currencies, invoices, failed payments, upgrades, downgrades and cancellation.
category: Account
order: 2
tags: [billing, invoices, plans]
author: Codexa Team
date: 2026-10-24
related: [ai-limits, account]
---

## Which plan am I on?

Workspace → **Billing** shows the plan, interval, currency and renewal date. Every workspace has its own plan.

## Currencies and providers

Prices are shown in **INR** and **USD**. INR payments go through Razorpay; USD through Stripe. The currency is chosen at checkout and cannot be changed mid-subscription; cancel and resubscribe to switch.

## Invoices

Invoices are issued by the payment provider and listed on the billing page with a link to the hosted PDF. Add a company name and tax id on the billing page before the next invoice if you need them printed.

## A payment failed

The provider retries according to its schedule and emails you. The plan stays active during the retry window; if all retries fail the workspace returns to Free and projects above the Free limit are kept read-only until you resubscribe or remove some.

## Upgrading and downgrading

Upgrades apply immediately with proration by the provider. Downgrades apply at the end of the current period.

## Cancelling

**Cancel subscription** on the billing page keeps the paid plan until the period ends. There is no partial-period refund by default; see the [refund policy](/refund-policy).

## I was charged but the plan did not change

Plan changes come from provider webhooks, which usually arrive within a minute. If it has been longer, [contact support](/help/contacting-support) with the invoice number; we can replay the event.
