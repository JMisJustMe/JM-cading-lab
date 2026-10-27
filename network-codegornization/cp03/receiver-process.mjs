import {startPrivateReceiver} from './jm-private-contact.mjs';
const key=process.env.JM_CP03_TEST_KEY;
const root=process.argv[2];
const instance=await startPrivateReceiver({root,key});
process.stdout.write('JM_LOOPBACK_PORT='+instance.port+'\n');
process.on('SIGTERM',()=>{instance.close().then(()=>process.exit(0)).catch(()=>process.exit(1));});
