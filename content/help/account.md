---
title: Account
description: Sign up, verify your email, reset a password, change your email and delete your account.
category: Account
order: 1
tags: [account, password, verification]
author: Codexa Team
date: 2026-10-24
related: [contacting-support, data-export-and-deletion]
---

## Creating an account

Sign up at [/signup](/signup) with an email and a password of at least 8 characters. A verification email follows; the link is single-use and expires. If it expired, use **Resend verification** on the sign-in page.

If the sign-in page offers **Continue with GitHub**, the operator has configured GitHub sign-in. It creates the same kind of account.

## I did not get the verification email

- Check spam and any filters on your address.
- Request another from the sign-in page; a new link invalidates the old one.
- If the deployment you are using has no email provider configured, the page says so; contact the operator or [support](/support).

## Resetting a password

[/forgot-password](/forgot-password) sends a reset link. Opening it and choosing a new password signs out every other session. An `invalid_token` message means the link was used or expired; request a new one.

## Changing your email or password

Account settings → **Security**. Changing the email requires verifying the new address before it becomes active.

## Sessions

Account settings → **Sessions** lists active sessions with browser and last activity; revoke any you do not recognise.

## Deleting your account

See [data export and deletion](/help/data-export-and-deletion). Deleting an account that owns a team workspace requires transferring ownership first.
