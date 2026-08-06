#!/usr/bin/env node

const port = Number(process.argv[2] || 9222);
const timeoutMs = Number(process.argv[3] || 60000);
const expectedPath = process.argv[4] || '/theory/';
const base = `http://127.0.0.1:${port}`;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const bounded = (value, limit = 1200) => String(value ?? '').slice(0, limit);

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
  const events = [];

  const keepEvent = event => {
    events.push({ at: new Date().toISOString(), ...event });
    if (events.length > 100) events.shift();
  };

  ws.addEventListener('message', event => {
    const message = JSON.parse(String(event.data));

    if (message.method === 'Runtime.consoleAPICalled') {
      const params = message.params || {};
      const args = (params.args || []).map(arg => bounded(arg.value ?? arg.description ?? arg.unserializableValue, 500));
      keepEvent({ type: `console.${params.type || 'log'}`, text: args.join(' ') });
    } else if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params?.exceptionDetails || {};
      keepEvent({
        type: 'exception',
        text: bounded(details.exception?.description || details.text || 'Runtime exception'),
        url: bounded(details.url, 300),
        line: details.lineNumber,
        column: details.columnNumber
      });
    } else if (message.method === 'Log.entryAdded') {
      const entry = message.params?.entry || {};
      keepEvent({
        type: `log.${entry.level || 'info'}`,
        text: bounded(entry.text),
        url: bounded(entry.url, 300),
        line: entry.lineNumber
      });
    }

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
  await send('Log.enable');

  const expression = String.raw`(() => {
    const api = window.JMTheorySourceIntegrityV12;
    const proof = document.querySelector('[data-v11-proof]');
    const lead = document.getElementById('sourcePassLead');
    const topFull = document.getElementById('topFullBodies');
    const topIntegrity = document.getElementById('topIntegrityBodies');
    let dataRecords = null;
    let dataDistricts = null;
    try {
      dataRecords = typeof DATA !== 'undefined' && Array.isArray(DATA.records) ? DATA.records.length : null;
      dataDistricts = typeof DATA !== 'undefined' && Array.isArray(DATA.districts) ? DATA.districts.length : null;
    } catch (_) {}
    const globals = {
      chatGraftV3: Boolean(window.JMTheoryChatGraftV3),
      chatGraftV4: Boolean(window.JMTheoryChatGraftV4),
      fullBodyRecoveryV5: Boolean(window.JMTheoryFullBodyRecoveryV5),
      chatRoomRecoveryV6: Boolean(window.JMTheoryChatRoomRecoveryV6),
      projectRouteRecoveryV7: Boolean(window.JMTheoryProjectRouteRecoveryV7),
      deepRecoveryV8: Boolean(window.JMTheoryFirstStageDeepRecoveryV8),
      t2RecoveryV9: Boolean(window.JMTheoryFirstStageT2RecoveryV9),
      t1ReconciliationV10: Boolean(window.JMTheoryFirstStageT1ReconciliationV10),
      sourceIntegrityV12: Boolean(window.JMTheorySourceIntegrityV12),
      t2Payload: typeof window.JMFirstStageT2Gzip === 'string',
      t1Payload: typeof window.JMFirstStageT1Gzip === 'string'
    };
    const loading = document.getElementById('loading');
    const loadStatus = document.getElementById('loadStatus');
    const loadError = document.getElementById('loadError');
    const diagnostics = {
      readyState: document.readyState,
      dataRecords,
      dataDistricts,
      decompressionStream: 'DecompressionStream' in window,
      globals,
      loading: {
        hidden: Boolean(loading?.hidden),
        className: String(loading?.className || ''),
        status: String(loadStatus?.textContent || '').trim(),
        error: String(loadError?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 1000)
      },
      scriptSources: Array.from(document.scripts).map(script => script.src).filter(Boolean),
      resources: performance.getEntriesByType('resource')
        .filter(entry => /(?:theory|estate-head-public-consumer|registry)/.test(entry.name))
        .map(entry => ({
          name: entry.name,
          initiatorType: entry.initiatorType,
          duration: Math.round(entry.duration),
          transferSize: entry.transferSize,
          encodedBodySize: entry.encodedBodySize,
          decodedBodySize: entry.decodedBodySize,
          responseStatus: entry.responseStatus || null
        }))
    };

    if (!api) {
      return {
        ready: false,
        href: location.href,
        title: document.title,
        waveMarker: document.body?.dataset?.publicRouteWave || null,
        shellObject: globals.t1ReconciliationV10,
        lead: String(lead?.textContent || '').slice(0, 300),
        diagnostics
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
      reconciledShell: globals.t1ReconciliationV10,
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
      diagnostics,
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
        schema: 'JM.TheoryWave01ChromeRuntimeProof/1.1',
        status: 'PASS',
        target: target.url,
        verifiedAt: new Date().toISOString(),
        events,
        ...last
      };
      console.log(JSON.stringify(receipt, null, 2));
      ws.close();
      return;
    }
    if (last?.ready && last?.pass === false) {
      console.error(JSON.stringify({
        schema: 'JM.TheoryWave01ChromeRuntimeProof/1.1',
        status: 'READY_BUT_CHECK_FAILED',
        target: target.url,
        verifiedAt: new Date().toISOString(),
        events,
        ...last
      }, null, 2));
      ws.close();
      process.exit(2);
    }
    await sleep(500);
  }

  console.error(JSON.stringify({
    schema: 'JM.TheoryWave01ChromeRuntimeProof/1.1',
    status: 'TIMEOUT',
    target: target.url,
    events,
    last
  }, null, 2));
  ws.close();
  process.exit(3);
}

main().catch(error => {
  console.error(JSON.stringify({
    schema: 'JM.TheoryWave01ChromeRuntimeProof/1.1',
    status: 'ERROR',
    error: String(error),
    stack: String(error?.stack || '')
  }, null, 2));
  process.exit(1);
});
