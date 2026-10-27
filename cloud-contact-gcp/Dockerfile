# JM ECOSTATE CP-GC1. Build context MUST be the existing JM-cading-lab repository root.
# This container imports the existing Estate relay verbatim, not a replacement cloud server.
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node functions/api/estate-contact.js /app/functions/api/estate-contact.js
COPY --chown=node:node cloud-contact-gcp/entrypoint.mjs /app/cloud-contact-gcp/entrypoint.mjs
USER node
EXPOSE 8080
CMD ["node", "/app/cloud-contact-gcp/entrypoint.mjs"]
