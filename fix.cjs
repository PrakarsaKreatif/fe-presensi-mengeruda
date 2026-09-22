const fs = require('fs');
const files = [
  'src/routes/presensi/riwayat/+page.svelte',
  'src/routes/presensi/+page.svelte',
  'src/routes/auth-receiver/+page.svelte',
  'src/routes/admin/+page.svelte',
  'src/lib/components/Sidebar.svelte'
];
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/'http:\/\/localhost:5176'/g, "(import.meta.env.VITE_PUBLIC_SSO_URL || 'http://localhost:5176')");
  fs.writeFileSync(f, c);
  console.log('Fixed ' + f);
});
