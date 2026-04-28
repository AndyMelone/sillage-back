#!/bin/bash
# Script to seed collections and products into Medusa V2 backend

BASE="http://localhost:9000"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY3Rvcl9pZCI6InVzZXJfMDFLUTJKTjExUENBUjcxTkZQNFJKQThHWTIiLCJhY3Rvcl90eXBlIjoidXNlciIsImF1dGhfaWRlbnRpdHlfaWQiOiJhdXRoaWRfMDFLUTJKTjE0ODRaNEhINDdTVlIzUDA5WDgiLCJhcHBfbWV0YWRhdGEiOnsidXNlcl9pZCI6InVzZXJfMDFLUTJKTjExUENBUjcxTkZQNFJKQThHWTIiLCJyb2xlcyI6W119LCJ1c2VyX21ldGFkYXRhIjp7fSwiaWF0IjoxNzc3MTI5Mzk3LCJleHAiOjE3NzcyMTU3OTd9.rzOTICbvh14cP2yzxXxIljPFmBkW5x1W94zmryITQ8U"

# Helper function
api() {
  local method=$1
  local path=$2
  local data=$3
  curl -s -X "$method" "$BASE$path" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$data"
}

echo "=== Creating new collections ==="

ORIENTAL_ID=$(api POST /admin/collections '{"title":"Orientale","handle":"orientale","metadata":{"description":"Voyage olfactif au cœur des épices, de l'\''ambre et du musc."}}' | python3 -c "import sys,json;print(json.load(sys.stdin)['collection']['id'])")
echo "Created Orientale: $ORIENTAL_ID"

FRAICHE_ID=$(api POST /admin/collections '{"title":"Fraîche","handle":"fraiche","metadata":{"description":"La pureté cristalline des eaux, agrumes et herbes aromatiques."}}' | python3 -c "import sys,json;print(json.load(sys.stdin)['collection']['id'])")
echo "Created Fraîche: $FRAICHE_ID"

GOURMAND_ID=$(api POST /admin/collections '{"title":"Gourmande","handle":"gourmande","metadata":{"description":"L'\''ivresse sucrée de la vanille, du caramel et du chocolat."}}' | python3 -c "import sys,json;print(json.load(sys.stdin)['collection']['id'])")
echo "Created Gourmande: $GOURMAND_ID"

CUIR_ID=$(api POST /admin/collections '{"title":"Cuirée","handle":"cuiree","metadata":{"description":"La noblesse du cuir tanné mêlée au tabac et au vétiver."}}' | python3 -c "import sys,json;print(json.load(sys.stdin)['collection']['id'])")
echo "Created Cuirée: $CUIR_ID"

# Dynamic fetch of existing seeded collections
BOISE_ID=$(api GET /admin/collections?title=Bois%C3%A9 | python3 -c "import sys,json;print(json.load(sys.stdin).get('collections',[{}])[0].get('id'))")
FRUITE_ID=$(api GET /admin/collections?title=Fruit%C3%A9 | python3 -c "import sys,json;print(json.load(sys.stdin).get('collections',[{}])[0].get('id'))")
FLORALE_ID=$(api GET /admin/collections?title=Florale | python3 -c "import sys,json;print(json.load(sys.stdin).get('collections',[{}])[0].get('id'))")

echo "Boise: $BOISE_ID, Fruite: $FRUITE_ID, Florale: $FLORALE_ID"
echo ""
echo "=== Creating products ==="

# ─── ORIENTALE ───────────────────────────
api POST /admin/products '{
  "title": "Ambre Sacré",
  "handle": "ambre-sacre",
  "description": "Un parfum mystique mêlant ambre, encens et bois de santal.",
  "status": "published",
  "collection_id": "'$ORIENTAL_ID'",
  "options": [{"title": "Taille", "values": ["50ml", "100ml"]}],
  "variants": [
    {"title": "50ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 85000}], "options": {"Taille": "50ml"}},
    {"title": "100ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 125000}], "options": {"Taille": "100ml"}}
  ]
}' > /dev/null && echo "✓ Ambre Sacré"

api POST /admin/products '{
  "title": "Oud Royal",
  "handle": "oud-royal",
  "description": "L'\''essence noble du oud, l'\''or noir de la parfumerie.",
  "status": "published",
  "collection_id": "'$ORIENTAL_ID'",
  "options": [{"title": "Taille", "values": ["50ml", "100ml"]}],
  "variants": [
    {"title": "50ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 150000}], "options": {"Taille": "50ml"}},
    {"title": "100ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 220000}], "options": {"Taille": "100ml"}}
  ]
}' > /dev/null && echo "✓ Oud Royal"

api POST /admin/products '{
  "title": "Épices du Nil",
  "handle": "epices-du-nil",
  "description": "Un voyage au fil du Nil. Cardamome, poivre noir et bois de cèdre s'\''entrelacent.",
  "status": "published",
  "collection_id": "'$ORIENTAL_ID'",
  "options": [{"title": "Taille", "values": ["50ml"]}],
  "variants": [
    {"title": "50ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 95000}], "options": {"Taille": "50ml"}}
  ]
}' > /dev/null && echo "✓ Épices du Nil"

# ─── FRAÎCHE ───────────────────────────
api POST /admin/products '{
  "title": "Citron de Menton",
  "handle": "citron-de-menton",
  "description": "L'\''éclat zesté du citron de Menton, tempéré par la verveine et le thé vert.",
  "status": "published",
  "collection_id": "'$FRAICHE_ID'",
  "options": [{"title": "Taille", "values": ["50ml", "100ml"]}],
  "variants": [
    {"title": "50ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 65000}], "options": {"Taille": "50ml"}},
    {"title": "100ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 95000}], "options": {"Taille": "100ml"}}
  ]
}' > /dev/null && echo "✓ Citron de Menton"

api POST /admin/products '{
  "title": "Brise Marine",
  "handle": "brise-marine",
  "description": "Un souffle d'\''air marin, notes de sel, de mousse aquatique et de bois flotté.",
  "status": "published",
  "collection_id": "'$FRAICHE_ID'",
  "options": [{"title": "Taille", "values": ["50ml", "100ml"]}],
  "variants": [
    {"title": "50ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 75000}], "options": {"Taille": "50ml"}},
    {"title": "100ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 110000}], "options": {"Taille": "100ml"}}
  ]
}' > /dev/null && echo "✓ Brise Marine"

api POST /admin/products '{
  "title": "Jardin d'\''Émeraude",
  "handle": "jardin-emeraude",
  "description": "La fraîcheur verte d'\''un jardin après la pluie.",
  "status": "published",
  "collection_id": "'$FRAICHE_ID'",
  "options": [{"title": "Taille", "values": ["50ml"]}],
  "variants": [
    {"title": "50ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 70000}], "options": {"Taille": "50ml"}}
  ]
}' > /dev/null && echo "✓ Jardin d'Émeraude"

# ─── GOURMANDE ───────────────────────────
api POST /admin/products '{
  "title": "Vanille Absolue",
  "handle": "vanille-absolue",
  "description": "La vanille de Madagascar dans sa plus pure expression.",
  "status": "published",
  "collection_id": "'$GOURMAND_ID'",
  "options": [{"title": "Taille", "values": ["50ml", "100ml"]}],
  "variants": [
    {"title": "50ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 89000}], "options": {"Taille": "50ml"}},
    {"title": "100ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 135000}], "options": {"Taille": "100ml"}}
  ]
}' > /dev/null && echo "✓ Vanille Absolue"

api POST /admin/products '{
  "title": "Caramel Tonka",
  "handle": "caramel-tonka",
  "description": "La gourmandise du caramel beurre-salé sublimée par la fève Tonka.",
  "status": "published",
  "collection_id": "'$GOURMAND_ID'",
  "options": [{"title": "Taille", "values": ["50ml"]}],
  "variants": [
    {"title": "50ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 79000}], "options": {"Taille": "50ml"}}
  ]
}' > /dev/null && echo "✓ Caramel Tonka"

api POST /admin/products '{
  "title": "Chocolat Noir",
  "handle": "chocolat-noir",
  "description": "L'\''intensité du cacao amer mariée à la douceur du café torréfié.",
  "status": "published",
  "collection_id": "'$GOURMAND_ID'",
  "options": [{"title": "Taille", "values": ["50ml", "100ml"]}],
  "variants": [
    {"title": "50ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 92000}], "options": {"Taille": "50ml"}},
    {"title": "100ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 140000}], "options": {"Taille": "100ml"}}
  ]
}' > /dev/null && echo "✓ Chocolat Noir"

# ─── CUIRÉE ───────────────────────────
api POST /admin/products '{
  "title": "Cuir Impérial",
  "handle": "cuir-imperial",
  "description": "Un cuir noble et chaud, tanné par le soleil d'\''Italie.",
  "status": "published",
  "collection_id": "'$CUIR_ID'",
  "options": [{"title": "Taille", "values": ["50ml", "100ml"]}],
  "variants": [
    {"title": "50ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 110000}], "options": {"Taille": "50ml"}},
    {"title": "100ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 165000}], "options": {"Taille": "100ml"}}
  ]
}' > /dev/null && echo "✓ Cuir Impérial"

api POST /admin/products '{
  "title": "Tabac Doré",
  "handle": "tabac-dore",
  "description": "L'\''élégance du tabac virginie, rehaussée de miel fumé.",
  "status": "published",
  "collection_id": "'$CUIR_ID'",
  "options": [{"title": "Taille", "values": ["50ml"]}],
  "variants": [
    {"title": "50ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 98000}], "options": {"Taille": "50ml"}}
  ]
}' > /dev/null && echo "✓ Tabac Doré"

# ─── Produits supplémentaires dans collections existantes ───────

# BOISÉ
if [ "$BOISE_ID" != "None" ] && [ ! -z "$BOISE_ID" ]; then
api POST /admin/products '{
  "title": "Vétiver du Bengale",
  "handle": "vetiver-du-bengale",
  "description": "Un vétiver terreux et humide, transportant au cœur des forêts du Bengale.",
  "status": "published",
  "collection_id": "'$BOISE_ID'",
  "options": [{"title": "Taille", "values": ["50ml", "100ml"]}],
  "variants": [
    {"title": "50ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 88000}], "options": {"Taille": "50ml"}},
    {"title": "100ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 130000}], "options": {"Taille": "100ml"}}
  ]
}' > /dev/null && echo "✓ Vétiver du Bengale"

api POST /admin/products '{
  "title": "Cèdre Atlas",
  "handle": "cedre-atlas",
  "description": "La noblesse du cèdre de l'\''Atlas, sec et majestueux.",
  "status": "published",
  "collection_id": "'$BOISE_ID'",
  "options": [{"title": "Taille", "values": ["50ml"]}],
  "variants": [
    {"title": "50ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 76000}], "options": {"Taille": "50ml"}}
  ]
}' > /dev/null && echo "✓ Cèdre Atlas"
fi

# FRUITÉ
if [ "$FRUITE_ID" != "None" ] && [ ! -z "$FRUITE_ID" ]; then
api POST /admin/products '{
  "title": "Mangue & Passion",
  "handle": "mangue-passion",
  "description": "L'\''exotisme tropical dans son expression la plus pure.",
  "status": "published",
  "collection_id": "'$FRUITE_ID'",
  "options": [{"title": "Taille", "values": ["50ml", "100ml"]}],
  "variants": [
    {"title": "50ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 68000}], "options": {"Taille": "50ml"}},
    {"title": "100ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 105000}], "options": {"Taille": "100ml"}}
  ]
}' > /dev/null && echo "✓ Mangue & Passion"

api POST /admin/products '{
  "title": "Cassis Velours",
  "handle": "cassis-velours",
  "description": "Le cassis noir dans un écrin de musc blanc et de rose.",
  "status": "published",
  "collection_id": "'$FRUITE_ID'",
  "options": [{"title": "Taille", "values": ["50ml"]}],
  "variants": [
    {"title": "50ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 72000}], "options": {"Taille": "50ml"}}
  ]
}' > /dev/null && echo "✓ Cassis Velours"
fi

# FLORALE
if [ "$FLORALE_ID" != "None" ] && [ ! -z "$FLORALE_ID" ]; then
api POST /admin/products '{
  "title": "Iris de Florence",
  "handle": "iris-de-florence",
  "description": "L'\''iris dans sa forme la plus précieuse.",
  "status": "published",
  "collection_id": "'$FLORALE_ID'",
  "options": [{"title": "Taille", "values": ["50ml", "100ml"]}],
  "variants": [
    {"title": "50ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 120000}], "options": {"Taille": "50ml"}},
    {"title": "100ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 180000}], "options": {"Taille": "100ml"}}
  ]
}' > /dev/null && echo "✓ Iris de Florence"

api POST /admin/products '{
  "title": "Jasmin de Grasse",
  "handle": "jasmin-de-grasse",
  "description": "Le jasmin grandiflorum de Grasse, cueilli à l'\''aube.",
  "status": "published",
  "collection_id": "'$FLORALE_ID'",
  "options": [{"title": "Taille", "values": ["50ml"]}],
  "variants": [
    {"title": "50ml", "manage_inventory": false, "prices": [{"currency_code": "xof", "amount": 99000}], "options": {"Taille": "50ml"}}
  ]
}' > /dev/null && echo "✓ Jasmin de Grasse"
fi

echo ""
echo "=== Seeding complete! ==="
echo "Total: 4 new collections + 15 new products added."
