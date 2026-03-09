# Bitaxe Dashboard

Dashboard web moderna in stile BI per visualizzare telemetria Bitaxe da Firebase:
- KPI fissi (best hashrate, min/max temperatura, efficienza, reject rate)
- grafici interattivi (trend, aree, barre)
- tabella ultimi campioni
- deploy automatico su GitHub Pages

## Stack
- React + TypeScript + Vite
- Firebase Firestore
- Recharts

## Avvio locale
1. Installa dipendenze:
```bash
npm install
```
2. Crea file `.env` copiando `.env.example` e imposta le variabili Firebase.
   - In locale i campi minimi obbligatori sono:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_PROJECT_ID`
3. Avvia in locale:
```bash
npm run dev
```

Se Firebase non e configurato, la dashboard usa dati mock per test UI.

## Schema atteso dati Firebase
Collezione: `telemetry` (configurabile con `VITE_FIREBASE_COLLECTION`)

Ogni documento dovrebbe avere (anche con alias):
- `timestamp` (alias: `ts`, `uploadedAt`, anche Firestore Timestamp)
- `hashrateGh` (alias: `hashrate`, `hashRate`, `ghs`, `ghs5s`, `payload.decision.hashrate`, `payload.miner.hashRate`)
- `tempChipC` (alias: `tempChip`, `chipTemp`, `temp_chip`, `temp`, `payload.decision.chip`, `payload.miner.temp`)
- `tempVrC` (alias: `tempVr`, `vrTemp`, `temp_vr`, `payload.decision.vr`, `payload.miner.vrTemp`) opzionale
- `powerW` (alias: `power`, `watts`, `consumptionW`, `payload.decision.power`, `payload.miner.power`)
- `efficiencyWTh` (alias: `payload.decision.eff_w_per_gh` convertito automaticamente in W/TH) opzionale
- `fanPercent` (alias: `fan`, `fan_pct`, `payload.miner.fanspeed`) opzionale
- `acceptedShares` (alias: `sharesAccepted`, `shares`, `payload.miner.sharesAccepted`) opzionale
- `rejectedShares` (alias: `sharesRejected`, `payload.miner.sharesRejected`) opzionale

Se i dati sono annidati (es. `data.*` o `telemetry.*`) vengono comunque letti.

## Deploy su GitHub Pages
Il workflow e in `.github/workflows/deploy.yml` e fa deploy su ogni push su `main`.

Passi GitHub:
1. In repo -> `Settings` -> `Pages`, imposta `Build and deployment` su `GitHub Actions`.
2. In repo -> `Settings` -> `Secrets and variables` -> `Actions`, crea i secrets:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_COLLECTION` (opzionale, default `telemetry`)

## Setup git iniziale
```bash
git init
git branch -M main
git add .
git commit -m "feat: initial bitaxe analytics dashboard"
git remote add origin <URL_REPO>
git push -u origin main
```
