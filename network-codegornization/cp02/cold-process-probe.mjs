import { JMDurableSpool } from './jm-durable-spool.mjs';
const snapshot=await new JMDurableSpool(process.argv[2]).recover();
console.log(JSON.stringify({count:snapshot.records.length,ids:snapshot.records.map(x=>x.id),scope:snapshot.scope,orphans:snapshot.orphanPartials}));
