# Substrata Installations

This repository now contains a deployable React + Vite app for building borehole installation records.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Coolify deployment

1. Create a new application in Coolify from this repository.
2. Choose `Dockerfile` as the build pack.
3. Use the repository root as the build context.
4. Expose port `3001`.

Coolify will build the image, compile the Vite app, and serve the static output with Nginx.
