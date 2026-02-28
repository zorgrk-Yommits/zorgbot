# 🦝 Discord Bot Setup für Supra Heros

## Step 1: Discord Bot erstellen (Du machst das!)

### A) Bot im Discord Developer Portal anlegen

1. Gehe zu: https://discord.com/developers/applications
2. Klick **"New Application"**
3. Name: `Mistral Bot` (oder wie du willst)
4. Bestätige

### B) Bot-Token holen

1. In deiner Application → **"Bot"** Tab (linke Sidebar)
2. Klick **"Reset Token"** (oder "View Token" wenn neu)
3. **KOPIERE DEN TOKEN!** (wird nur EINMAL angezeigt!)
4. Speichere ihn sicher

### C) Permissions konfigurieren

Im **"Bot"** Tab:
- ✅ **Privileged Gateway Intents:**
  - ✅ `MESSAGE CONTENT INTENT` (wichtig!)
  - ✅ `SERVER MEMBERS INTENT` (optional)
  - ✅ `PRESENCE INTENT` (optional)

### D) Bot-Permissions festlegen

Im **"OAuth2 → URL Generator"** Tab:
- **SCOPES:**
  - ✅ `bot`
  - ✅ `applications.commands` (optional, für Slash Commands)

- **BOT PERMISSIONS:**
  - ✅ `Send Messages`
  - ✅ `Read Messages/View Channels`
  - ✅ `Read Message History`
  - ✅ `Add Reactions` (optional)
  - ✅ `Embed Links` (optional)
  - ✅ `Attach Files` (optional)

**Permissions-Integer:** ~3072 (minimal) oder ~534723950656 (full, empfohlen für Testing)

### E) Invite-Link generieren

1. Kopiere die URL aus dem **"URL Generator"**
2. Beispiel:
   ```
   https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=534723950656&scope=bot
   ```
3. Öffne den Link → Wähle **Supra Heros Server** → **Autorisieren**

---

## Step 2: Bot-Token in OpenClaw hinterlegen

**Erstelle/Update `.env` Datei:**

```bash
cd /data/.openclaw/workspace/mistral-manager
nano .env
```

**Füge hinzu:**
```env
MISTRAL_API_KEY=your_mistral_key_here
DISCORD_BOT_TOKEN=your_discord_bot_token_here
SUPRA_HEROS_SERVER_ID=your_server_id_here
```

**Server ID finden:**
1. Discord: Rechtsklick auf Supra Heros Server
2. "Server-ID kopieren" (falls nicht sichtbar: User Settings → Advanced → Developer Mode ON)

---

## Step 3: Test-Channel definieren

**Wichtig:** Starte erstmal in einem **Test-Channel**, nicht im Hauptchat!

**Test-Channel anlegen:**
1. Erstelle einen neuen Channel: `#mistral-bot-testing`
2. Nur du + Bot haben Zugriff
3. Hier können wir safe testen ohne andere zu nerven

**Channel-ID kopieren:**
- Rechtsklick auf Channel → "Channel-ID kopieren"

---

## Step 4: Bot deployen

### Option A: Über Bandit (empfohlen für Testing)

Sage mir:
```
"Bandit, starte den Mistral Discord Bot im Test-Channel"
```

Ich werde dann:
1. Bot-Process starten
2. Im Test-Channel ankündigen dass er online ist
3. Erste Test-Messages senden

### Option B: Manuell starten

```bash
cd /data/.openclaw/workspace/mistral-manager
node discord-bot-openclaw.js
```

(Dieses Script erstellen wir gleich!)

---

## Step 5: Testen

Im Test-Channel:

```
@Mistral Bot hey, bist du da?
```

Bot sollte antworten! 🎉

**Test-Szenarien:**
1. Simple Frage: "What's up?"
2. Tech-Frage: "Explain Supra blockchain"
3. Conversation: Mehrere Messages hintereinander

---

## Monitoring & Kosten

**Cost Tracking:**
```bash
# Check costs in real-time
node skills/mistral/mistral-cli.js stats
```

**Erwartete Kosten (Supra Heros):**
- ~1000 messages/month
- Mit Auto-Routing: **~$0.15/month**
- Ohne: $1.00/month

---

## Safety Features

✅ **Rate Limiting:** Max 1 response/second per user (verhindern von Spam)  
✅ **Cost Alerts:** Warning wenn >$5/month ausgegeben  
✅ **Test-Channel First:** Safe testing vor Production  
✅ **Auto-Routing:** 85% Kostenersparnis durch intelligente Model-Wahl  

---

## Nächste Schritte

1. **Du:** Bot-Token erstellen (Step 1)
2. **Du:** Token in `.env` eintragen (Step 2)
3. **Du:** Test-Channel anlegen (Step 3)
4. **Bandit:** Bot deployen (Step 4)
5. **Wir:** Zusammen testen! (Step 5)

---

## Troubleshooting

**"Missing Access"**
- Bot wurde noch nicht zum Server eingeladen
- Invite-Link verwenden aus Step 1E

**"Missing Permissions"**
- `MESSAGE CONTENT INTENT` im Bot-Tab aktivieren
- Bot-Permissions prüfen (Send Messages, Read Messages)

**Bot antwortet nicht**
- Check: Ist Bot online? (grüner Punkt)
- Check: Wurde Bot mit `@mention` getagt?
- Logs checken: `node discord-bot-openclaw.js`

**Hohe Kosten**
- Auto-Routing aktiviert? (sollte >80% small model nutzen)
- Cache aktivieren (Redis) für 30-50% weitere Ersparnis

---

## 🎯 Ready Checklist

- [ ] Discord Bot erstellt
- [ ] Bot-Token kopiert
- [ ] Token in `.env` eingetragen
- [ ] Bot zum Server eingeladen
- [ ] Test-Channel angelegt
- [ ] Bandit Bescheid gesagt "Los geht's!"

**Status:** Warte auf deine Bot-Token + Test-Channel Info! 🚀
