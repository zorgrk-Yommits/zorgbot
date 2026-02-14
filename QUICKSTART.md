# 🚀 Mistral Discord Bot - Quick Start

**Status:** ⚠️ Waiting for Discord Bot Token

---

## Was du brauchst (5 Minuten Setup!)

### 1️⃣ Discord Bot Token holen

👉 **Folge:** `DISCORD-SETUP.md` Step 1 (Bot erstellen + Token kopieren)

### 2️⃣ Token eintragen

```bash
cd /data/.openclaw/workspace/mistral-manager
nano .env
```

**Füge hinzu:**
```env
DISCORD_BOT_TOKEN=your_bot_token_here
SUPRA_HEROS_SERVER_ID=your_server_id_here
```

**Speichern:** `Ctrl+O` → Enter → `Ctrl+X`

### 3️⃣ Bot einladen

Kopiere die Invite-URL aus dem Discord Developer Portal und öffne sie:
```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=534723950656&scope=bot
```

Wähle **Supra Heros Server** → **Autorisieren**

### 4️⃣ Test-Channel anlegen

Erstelle `#mistral-bot-testing` im Supra Heros Server:
- Rechtsklick Server → "Channel erstellen"
- Name: `mistral-bot-testing`
- Privat: Nur du + Bot

---

## Bot starten (über Bandit)

Sage mir einfach:
```
"Bandit, starte den Mistral Discord Bot!"
```

Ich mache dann:
1. ✅ Check ob Token vorhanden
2. ✅ Bot-Process starten
3. ✅ Im Test-Channel ankündigen
4. ✅ Erste Test-Message senden

---

## Bot starten (manuell)

```bash
cd /data/.openclaw/workspace/skills/mistral
./discord-control.sh start
```

**Commands:**
- `./discord-control.sh start` - Bot starten
- `./discord-control.sh stop` - Bot stoppen
- `./discord-control.sh status` - Status + Logs
- `./discord-control.sh logs` - Live logs folgen

---

## Testen

Im `#mistral-bot-testing` Channel:

```
@Mistral Bot hey, bist du da?
```

**Test-Fragen:**
1. "What's up?" (simple → cheap)
2. "Explain Supra blockchain architecture" (complex → expensive)
3. Multi-turn: "Hi" → "Tell me more" → "Thanks!"

---

## Monitoring

**Cost Tracking:**
```bash
# Logs checken
./discord-control.sh logs

# Stats im Bot-Output:
# 📊 Status: 42 responses | $0.0234 cost | 2h 15m uptime
```

**Erwartete Kosten:**
- Simple replies: ~$0.00002/message
- Complex replies: ~$0.006/message
- Mit Auto-Routing: ~85% Ersparnis!

---

## Production Deployment

**Nach erfolgreichem Test:**

1. **Announce im Supra Heros Haupt-Chat:**
   ```
   Hey @everyone, wir haben einen neuen AI-Bot! 🤖
   Probiert ihn aus: @Mistral Bot [eure Frage]
   ```

2. **Permissions erweitern:**
   - Bot kann jetzt in allen Channels antworten (wo erlaubt)
   - Oder: Nur in bestimmten Channels (z.B. #general, #tech)

3. **Monitoring aktivieren:**
   - Daily cost reports via Bandit
   - Alerts wenn >$5/month

---

## Ready Checklist

- [ ] Bot-Token geholt (Discord Developer Portal)
- [ ] Token in `.env` eingetragen
- [ ] Bot zum Server eingeladen
- [ ] Test-Channel `#mistral-bot-testing` angelegt
- [ ] Bandit gesagt: "Starte den Bot!"
- [ ] Im Test-Channel getestet
- [ ] Production Deployment (nach Test)

---

## Next Steps

**Du bist hier:** ⚠️ Brauche Discord Bot Token

**Dann:**
1. Token eintragen → Mir Bescheid sagen
2. Ich starte den Bot → Test im Test-Channel
3. Alles gut? → Production Deployment! 🚀

---

**Fragen?** Frag mich (Bandit)! 🦝
