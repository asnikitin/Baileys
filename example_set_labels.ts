import makeWASocket, { useMultiFileAuthState } from './lib';
import logger from './lib/Utils/logger';

const myService = new (class MyService {
  connectionOpen = false;
  sock: ReturnType<typeof makeWASocket>;

  constructor() {
    this.init();
  }

  async init() {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
    this.sock = await makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger,
    })

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
  await sock.setLabels(['foobar@s.whatsapp.net'], ['3', '5'], false);
}

run();
