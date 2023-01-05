import makeWASocket, { fetchLatestBaileysVersion, makeInMemoryStore, useMultiFileAuthState } from './lib';
import logger from './lib/Utils/logger';

const myService = new (class MyService {
  connectionOpen = false;
  sock: ReturnType<typeof makeWASocket>;
  store = makeInMemoryStore({ logger });

  constructor() {
    this.init();
  }

  async init() {
    this.store?.readFromFile('./baileys_store_multi.json');
    setInterval(() => {
      this.store?.writeToFile('./baileys_store_multi.json');
    }, 10_000);

    const { version } = await fetchLatestBaileysVersion()
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
    this.sock = await makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      logger,
    });
    this.store?.bind(this.sock.ev);

    this.sock.ev.on('connection.update', (event) => {
      if (event.connection === 'open') {
        this.connectionOpen = true;
      }
      if (event.connection === 'close') {
        //@ts-ignore
        if (event.lastDisconnect.error.output.statusCode === 515) {
          logger.info('restart required');
          process.exit(0);
        }
      }
    })
    this.sock.ev.on('creds.update', async () => {
      await saveCreds();
    })
  }

  getSock() {
    return new Promise<typeof this.sock>((resolve) => {
      const interval = setInterval(() => {
        if (this.connectionOpen) {
          if (this.sock) {
            if (this.sock.authState.creds.myAppStateKeyId) {
              clearInterval(interval);
              resolve(this.sock);
            }
          }
        }
      }, 100);
    })
  }
});

async function run() {
  const sock = await myService.getSock();
  await sock.setLabels(['foobar@s.whatsapp.net'], ['3', '5'], true);
  logger.info(myService.store.getLabels('foobar@s.whatsapp.net'), 'getLabels');
}

run();
