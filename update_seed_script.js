const fs = require('fs');
let sh = fs.readFileSync('seed-products.sh', 'utf8');

// Multiply all amounts by 10
sh = sh.replace(/"amount":\s*(\d+)/g, (match, p1) => {
    return `"amount": ${parseInt(p1) * 10}`;
});

// Replace hardcoded collection IDs with API calls
sh = sh.replace(/BOISE_ID=".+"/g, 'BOISE_ID=$(api GET /admin/collections?title=Boisé | python3 -c "import sys,json;print(json.load(sys.stdin)[\'collections\'][0][\'id\'])")');
sh = sh.replace(/FRUITE_ID=".+"/g, 'FRUITE_ID=$(api GET /admin/collections?title=Fruité | python3 -c "import sys,json;print(json.load(sys.stdin)[\'collections\'][0][\'id\'])")');
sh = sh.replace(/FLORALE_ID=".+"/g, 'FLORALE_ID=$(api GET /admin/collections?title=Florale | python3 -c "import sys,json;print(json.load(sys.stdin)[\'collections\'][0][\'id\'])")');

// Wait! The token needs to be regenerated!
// Wait, is there a login in the script? No, it uses a hardcoded JWT token!
// A hardcoded JWT token will be INVALID after DB reset because JWT_SECRET might not have changed, but the user ID changed!
