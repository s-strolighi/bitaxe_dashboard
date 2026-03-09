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
3. Avvia in locale:
```bash
npm run dev
```

Se Firebase non e configurato, la dashboard usa dati mock per test UI.

## Schema atteso dati Firebase
Collezione: `telemetry` (configurabile con `VITE_FIREBASE_COLLECTION`)

Ogni documento dovrebbe avere:
- `timestamp` (epoch in millisecondi)
- `hashrateGh` (numero)
- `temperatureC` (numero)
- `powerW` (numero)
- `fanPercent` (numero, opzionale)
- `acceptedShares` (numero, opzionale)
- `rejectedShares` (numero, opzionale)

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
