# ABC Prize Box

A one-page React app where the squad adds prize ideas fast (type, Enter, type, Enter, or paste a list) and sees the approved list. Ideas land in Airtable unapproved; the owner ticks **Approved** to publish one.

- Base: ABC Prize Box (`appkc7TflaC5nR9at`), table Prize Ideas (`tblLgDHzVyg0KZePf`)
- `api/ideas.js` is a Vercel function. The Airtable token lives only there. GET returns approved items; POST adds up to 10 unapproved items per call.

## Deploy (about 5 minutes)

1. Create an Airtable token at https://airtable.com/create/tokens with scopes `data.records:read` and `data.records:write`, access limited to the **ABC Prize Box** base only.
2. In Vercel: New Project, import this repo, set **Root Directory** to `prize-box`.
3. Add the environment variable `AIRTABLE_TOKEN` with the token from step 1, then deploy. Share the `.vercel.app` link.

## Local

```
npm install
npx vercel dev   # serves the app and /api together
```
