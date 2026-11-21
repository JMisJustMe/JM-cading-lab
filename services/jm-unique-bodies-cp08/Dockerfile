FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /srv/jm-cp08
COPY . .
RUN python3 -m py_compile server.py contact_runtime.py native_contact_runtime.py cp07_atomic_runtime.py cp08_gateway.py && node --check native_donor_exec.mjs
ENV PYTHONUNBUFFERED=1
ENV JM_BODIES_DB=/tmp/jm-cp08-atlas.sqlite3
EXPOSE 10000
CMD ["sh","-c","exec python3 cp08_gateway.py --host 0.0.0.0 --port \"${PORT:-10000}\" --db \"${JM_BODIES_DB}\""]
