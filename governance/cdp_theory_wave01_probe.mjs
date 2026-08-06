#!/usr/bin/env node

const port = Number(process.argv[2] || 9222);
const timeoutMs = Number(process.argv[3] || 60000);
const expectedPath = process.argv[4] || '/theory/';
const base = `http://127.0.0.1:${port}`;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getTarget() {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    try {
      const targets = await fetch(`${base}/json/list`, { cache: 'no-store' }).then(r => {
        if (!r.ok) throw new Error(`CDP target list HTTP ${r.status}`);
        return r.json();
      });
      last = targets;
      const target = targets.find(item => item.type === 'page' && String(item.url || '').includes(expectedPath))
        || targets.find(item => item.type === 'page');
      if (target?.webSocketDebuggerUrl) return target;
    } catch (error) {
      last = String(error);
    }
    await sleep(250);
  }
  throw new Error(`No Chrome page target found: ${JSON.stringify(last)}`);
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => reject(new Error('CDP WebSocket open timeout')), 10000);
    ws.addEventListener('open', () => {
      clearTimeout(timer);
      resolve(ws);
    }, { once: true });
    ws.addEventListener('error', event => {
      clearTimeout(timer);
      reject(new Error(`CDP WebSocket error: ${event?.message || 'unknown'}`));
    }, { once: true });
  });
}

async function main() {
  const target = await getTarget();
  const ws = await connect(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();

  ws.addEventListener('message', event => {
    const message = JSON.parse(String(event.data));
    if (!message.id) return;
    const slot = pending.get(message.id);
    if (!slot) return;
    pending.delete(message.id);
    if (message.error) slot.reject(new Error(JSON.stringify(message.error)));
    else slot.resolve(message.result);
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const messageId = ++id;
    pending.set(messageId, { resolve, reject });
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });

  await send('Runtime.enable');
  await send('Page.enable');

  const expression = String.raw`(() => {
    const api = window.JMTheorySourceIntegrityV12;
    const proof = document.querySelector('[data-v11-proof]');
    const lead = document.getElementById('sourcePassLead');
    const topFull = document.getElementById('topFullBodies');
    const topIntegrity = document.getElementById('topIntegrityBodies');
    if (!api) {
      return {
        ready: false,
        href: location.href,
        title: document.title,
        waveMarker: document.body?.dataset?.publicRouteWave || null,
        shellObject: Boolean(window.JMTheoryFirstStageT1ReconciliationV10),
        lead: String(lead?.textContent || '').slice(0, 160)
      };
    }
    const checks = {
      version: api.version === 'v0.20.1',
      bodies: api.bodies === 37,
      drafts: api.drafts === 24,
      fullBodies: api.fullBodies === 18,
      phoneRealmsRepaired: api.phoneRealmsRepaired === true,
      topFullBodies: String(topFull?.textContent || '').trim() === '18',
      topIntegrityBodies: String(topIntegrity?.textContent || '').trim() === '37',
      recoveryPass007: /Recovery Pass 007/.test(lead?.textContent || ''),
      proof37of37: /37\/37 earlier source bodies now open correctly/.test(proof?.textContent || ''),
      reconciledShell: Boolean(window.JMTheoryFirstStageT1ReconciliationV10),
      waveMarker: document.body?.dataset?.publicRouteWave === '01'
    };
    return {
      ready: true,
      pass: Object.values(checks).every(Boolean),
      checks,
      runtime: {
        version: String(api.version || ''),
        bodies: Number(api.bodies || 0),
        drafts: Number(api.drafts || 0),
        fullBodies: Number(api.fullBodies || 0),
        phoneRealmsRepaired: api.phoneRealmsRepaired === true
      },
      rendered: {
        topFullBodies: String(topFull?.textContent || '').trim(),
        topIntegrityBodies: String(topIntegrity?.textContent || '').trim(),
        sourcePassLead: String(lead?.textContent || '').trim(),
        proofText: String(proof?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 500)
      },
      href: location.href,
      title: document.title
    };
  })()`;

  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: false
    });
    last = result?.result?.value ?? result;
    if (last?.ready && last?.pass) {
      const receipt = {
        schema: 'JM.TheoryWave01ChromeRuntimeProof/1.0',
        status: 'PASS',
        target: target.url,
        verifiedAt: new Date().toISOString(),
        ...last
      };
      console.log(JSON.stringify(receipt, null, 2));
      ws.close();
      return;
    }
    if (last?.ready && last?.pass === false) {
      console.error(JSON.stringify({ status: 'READY_BUT_CHECK_FAILED', ...last }, null, 2));
      ws.close();
      process.exit(2);
    }
    await sleep(500);
  }

  console.error(JSON.stringify({
    schema: 'JM.TheoryWave01ChromeRuntimeProof/1.0',
    status: 'TIMEOUT',
    target: target.url,
    last
  }, null, 2));
  ws.close();
  process.exit(3);
}

main().catch(error => {
  console.error(JSON.stringify({
    schema: 'JM.TheoryWave01ChromeRuntimeProof/1.0',
    status: 'ERROR',
    error: String(error),
    stack: String(error?.stack || '')
  }, null, 2));
  process.exit(1);
});
