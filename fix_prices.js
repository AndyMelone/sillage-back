const fs = require('fs');

// Fix seed.ts
let seed = fs.readFileSync('src/scripts/seed.ts', 'utf8');

// Replace currency_code: "eur" with "xof" and "usd" with "xof" (then deduplicate)
// Actually, it's easier to just match the prices array
seed = seed.replace(/prices:\s*\[[\s\S]*?\]/g, (match) => {
    if (match.includes('amount: 2500') || match.includes('amount: 5000')) {
        return match; // shipping options are already fixed
    }
    return `prices: [
            {
              currency_code: "xof",
              amount: 85000,
            },
          ]`;
});
fs.writeFileSync('src/scripts/seed.ts', seed);

// Fix seed-products.sh
let sh = fs.readFileSync('seed-products.sh', 'utf8');
sh = sh.replace(/"amount": 8500/g, '"amount": 85000');
sh = sh.replace(/"currency_code": "eur"/g, '"currency_code": "xof"');
fs.writeFileSync('seed-products.sh', sh);
console.log("Prices fixed!");
