# 🤖 StrataHu Discord Közösségi Bot & AI Agent Híd

Ez a modul a **StrataHu** magyar fejlesztői közösség hivatalos Discord botja és szervermenedzsment-eszköze. A helyi Agentic AI (Antigravity) közvetlen hozzáféréssel rendelkezik ehhez az eszközhöz, így képes automatikusan felépíteni a szervert, moderálni, bejelentéseket tenni, és új projekteket bemutatni.

---

## ⚡ 1 perces beállítási útmutató

### 1. Bot létrehozása a Discordon
1. Nyisd meg a [Discord Developer Portal](https://discord.com/developers/applications) oldalt.
2. Kattints a **„New Application”** gombra (név: pl. `StrataHu Community Bot`).
3. Menj a bal oldali menüben a **„Bot”** fülre:
   - Kattints a **„Reset Token”** gombra, majd másold ki a tokent.
   - Görgess le a **„Privileged Gateway Intents”** szekcióhoz, és kapcsold be mindhárom kapcsolót:
     - ✅ **Presence Intent**
     - ✅ **Server Members Intent**
     - ✅ **Message Content Intent**
   - Mentsd el a változtatásokat (**Save Changes**).
4. Menj a **„General Information”** fülre, és másold ki az **Application ID**-t.

### 2. A bot meghívása a Discord szerveredre
Illeszd be az alábbi linkbe a saját `APPLICATION_ID`-dat, és nyisd meg a böngésződben:
```
https://discord.com/api/oauth2/authorize?client_id=IDE_JON_AZ_APPLICATION_ID&permissions=8&scope=bot%20applications.commands
```
Válaszd ki a frissen létrehozott szerveredet, és add meg a jogosultságokat.

### 3. Környezeti változók megadása
Másold a `.env.example` fájlt `.env`-re a `discord-bot` mappában (vagy a projekt gyökerében):
```bash
cp .env.example .env
```
Majd töltsd ki:
```ini
DISCORD_BOT_TOKEN=a_kimásolt_bot_token
DISCORD_GUILD_ID=a_szerver_id (Jobb klikk a Discord szerver nevére -> Copy Server ID)
DISCORD_CLIENT_ID=az_application_id
```

---

## 🚀 Szerver automatikus felépítése

Miután beállítottad a tokent, vagy szólsz az AI ügynöknek, hogy végezze el a felépítést, vagy lefutathatod kézzel:

```bash
cd discord-bot
bun run setup
```

Ez a parancs azonnal:
- Létrehozza a hivatalos szerepköröket színkódokkal: `👑 Alapító`, `🤖 Strata AI Operátor`, `🚀 Kiemelt Fejlesztő`, `🛠️ Nyílt Forráskódú Alkotó`, `👥 Közösségi Tag`.
- Létrehozza a kategóriákat és szobákat jogosultságokkal (pl. tájékoztató csatornák írásvédettek a tagok számára):
  - `📢 │ TÁJÉKOZTATÁS` (`#👋・üdvözlet-és-szabályzat`, `#📢・bejelentések`, `#🔗・hasznos-linkek`)
  - `💬 │ KÖZÖSSÉGI TÉR` (`#💬・általános-társalgó`, `#💡・ötletelés-és-visszajelzés`, `#🤝・csapattárs-kereső`, `#☕・offtopic`)
  - `🚀 │ PROJEKT BEMUTATÓK` (`#🔥・új-projektek`, `#⭐・hét-projektje`, `#❓・fejlesztői-segítség`)
  - `🤖 │ AI & RENDSZER` (`#🤖・ai-parancsok`, `#📜・audit-napló`)
- Közzéteszi a szabályzatot és a hivatalos linkeket tartalmazó beágyazott kártyákat.

---

## 🛠️ Az AI Agent CLI parancsai

A helyi agentic AI a következő parancsokkal tudja menedzselni a közösséget a háttérben:

| Parancs | Leírás |
|---|---|
| `bun run src/cli.ts status` | Ellenőrzi a kapcsolatot, kiírja a tagok és csatornák számát |
| `bun run src/cli.ts setup` | Automatikusan felépíti / szinkronizálja a szerverstruktúrát |
| `bun run src/cli.ts announce --title "..." --content "..."` | Hivatalos bejelentést tesz a `#📢・bejelentések` csatornába |
| `bun run src/cli.ts post-project Pala` | Projektbemutató kártyát küld a `#🔥・új-projektek` csatornába gombokkal |
| `bun run src/cli.ts post-seed-projects 5` | Közzéteszi a StrataHu top 5 kiemelt projektjét |

---

## 🤖 A 24/7 Bot Daemon indítása

```bash
cd discord-bot
bun run start
```
Beépített slash parancsok:
- `/projekt [név]` – Keresés a StrataHu 1 000 hazai projektje között.
- `/top10` – A legfrissebb magyar ranglista megjelenítése.
- `/uj-bekuldes` – Útmutató saját projekt hozzáadásához a platformra.
- `/ping` – Bot válaszidő mérése.
