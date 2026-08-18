import dns from 'dns';

function resolveHost(host: string) {
  return new Promise((resolve) => {
    dns.resolve(host, (err, addresses) => {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true, addresses });
      }
    });
  });
}

async function main() {
  const host = 'ep-rough-brook-at80fqp7-pooler.c-9.us-east-1.aws.neon.tech';
  
  console.log('--- Resolving WITH default system DNS ---');
  console.log('System DNS Servers:', dns.getServers());
  const res1 = await resolveHost(host);
  console.log('Result:', res1);

  console.log('\n--- Resolving WITH Google DNS (8.8.8.8) ---');
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
    console.log('Active DNS Servers:', dns.getServers());
    const res2 = await resolveHost(host);
    console.log('Result:', res2);
  } catch (e: any) {
    console.error('Error setting Google DNS:', e.message);
  }
}

main();
