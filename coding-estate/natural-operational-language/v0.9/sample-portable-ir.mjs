import { portableIRFromPhrase } from './portable-ir.mjs';

const { ir } = portableIRFromPhrase('open door then move chair', [
  { word: 'open' },
  { word: 'then' },
  { word: 'move', payload: { to: 'studio' } }
], { proof: 'v0.9-ci' });

process.stdout.write(JSON.stringify(ir));
