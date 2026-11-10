# Sablon 02: Hivatalos Állami / Intézményi (B2G) Tárgyalási & Pilot Javaslat

Használd ezt a sablont, amikor minisztériumi államtitkársággal, digitális ügynökséggel (pl. DMÜ), tankerületi központtal, vagy oktatási/önkormányzati intézménnyel egyeztettek egy hazai diákfejlesztés (pl. **Firka / Pala** mintájú oktatási platform) tesztüzeméről vagy bevezetéséről.

> [!TIP]
> **Tárgyalási aranyszabály kormányzati szereplőkkel:** Soha ne mondd azt, hogy *„minden jelenlegi rendszer rossz, cseréljük le holnap”*. Mondd azt: *„Egy kockázatmentes, költséghatékony, fiatal magyar mérnökök által fejlesztett kísérleti pilotot (Proof of Concept) ajánlunk 1–3 intézményben, amely már több tízezer felhasználó előtt bizonyított.”*

---

## HIVATALOS SZAKMAI JAVASLAT ÉS PILOT PROGRAM TERV

**Címzett:** `[Intézmény / Minisztérium / Tankerület neve, Felelős vezető neve és beosztása]`
**Küldő:** `[StrataHu Közösségi Szövetkezet / Egyesület neve]` & `[Projekt fejlesztői csapata]`
**Tárgy:** Kockázatmentes kísérleti pilot-program javaslat a hazai digitális `[oktatási / közszolgáltatási]` felhasználói élmény modernizálására (`[Projekt neve]`)
**Dátum:** `[2026. ...]`

---

### 1. Vezetői összefoglaló (Executive Summary)
A **StrataHu Magyar Fejlesztői Közösség** olyan hazai szoftvermérnököket és tehetséges egyetemi/középiskolás fejlesztőket fog össze, akik saját szabadidejükben, nyílt forráskódú alapokon hoztak létre nemzetközi színvonalú digitális megoldásokat.

Jelen dokumentumban egy olyan, **a gyakorlatban már `[X ezer]` hazai felhasználó által napi szinten használt magyar fejlesztés (`[Projekt neve]`)** intézményi szintű, **kockázatmentes pilot tesztelésére** teszünk javaslatot, amely:
* Jelentősen csökkenti a felhasználók (diákok, szülők, pedagógusok) napi digitális adminisztrációs idejét,
* Hazai tulajdonú, átlátható, idegen technológiai kitettségtől mentes forráskódon alapul,
* A jelenlegi külső licenc- és fejlesztési költségek töredékéért fenntartható és skálázható.

---

### 2. A jelenlegi kihívás és a magyar közösségi megoldás

| Összehasonlítási szempont | Jelenlegi hagyományos rendszer | `[Projekt neve]` Javasolt Modern Rendszer |
| :--- | :--- | :--- |
| **Felhasználói élmény (UX)** | Nehézkes, lassú mobilos elérés, elavult felület | Villámgyors, modern reszponzív web, natív mobil és asztali kliens |
| **Valós elfogadottság** | Kötelező használat melletti elégedetlenség | **`[pl. X ezer]` önkéntes aktív napi használó (`4.9/5` értékelés)** |
| **Adatbiztonság & Átláthatóság** | Zárt forráskódú fekete doboz | Auditálható nyílt forráskód, zéró reklám és külső nyomkövetés |
| **Hazai tehetségmegtartás** | Külső vagy drága alvállalkozói modell | Helyben tartja a legjobb magyar fiatal mérnököket |

---

### 3. Műszaki, Adatvédelmi és Biztonsági Garanciák
Tisztában vagyunk azzal, hogy közintézményi környezetben kizárólag maximálisan biztonságos rendszer alkalmazható. A pilot során vállaljuk az alábbi követelmények teljesítését:
1. **GDPR és Kibervédelmi Megfelelőség (IBTV / NIS2 alapelvek):** Személyes adatok nem hagyják el az Európai Unió / Magyarország területét; kizárólag titkosított csatornán kommunikál a rendszer.
2. **Hivatalos API Integráció (Nem „scraping”):** A pilot során kizárólag az intézmény/üzemeltető által biztosított hivatalos, jogosultságkezelt interfészhez (vagy izolált tesztadatbázishoz) csatlakozunk.
3. **Független Biztonsági Audit:** A kódbázis nyíltan auditálható, és a tesztüzem előtt állami/független penetrációs vizsgálatnak vethető alá.
4. **WCAG 2.1 AA Akadálymentesség:** Látássérült és speciális igényű diákok/pedagógusok számára is teljes körűen használható felület.

---

### 4. Kockázatmentes 90 Napos Pilot Program Javaslat (3 Lépésben)

Azonnali országos átállás helyett egy **kontrollált, ingyenes / minimális költségű 90 napos tesztüzemet** javaslunk:

* **Pilot hatóköre:** `[1–3 db önkéntesen jelentkező középiskola / 1 tankerületi intézmény / max. 500 tesztfelhasználó]`
* **1. hónap (Felkészítés & Audit):** Tesztkörnyezet kialakítása izolált adatokkal, adatvédelmi tisztviselői (DPO) jóváhagyás.
* **2. hónap (Éles kontrollált próba):** A kijelölt iskolák tanárai és diákjai párhuzamosan használhatják a rendszert. Folyamatos hibaelhárítás 24 órás SLA-val.
* **3. hónap (Mérés és Értékelés):** Közös zárójelentés készítése mérhető adatokkal (betöltési idő, felhasználói elégedettség, adminisztrációs idő-megtakarítás).

**Kockázat az állam / intézmény oldalán:** Zéró — a meglévő rendszer zavartalanul párhuzamosan üzemel; a pilot bármikor leállítható, ugyanakkor siker esetén Magyarország egy világszínvonalú, saját fejlesztésű közszolgáltatási ökoszisztémát nyerhet.

---

### 5. Támogatási / Együttműködési Igényünk a Döntéshozóktól
1. Szakmai egyeztetés (30 perces online vagy személyes bemutató) a működő prototípusról.
2. Egy illetékes technikai kapcsolattartó kijelölése az API / biztonsági követelmények egyeztetésére.
3. Elvi támogatás egy izolált pilot-intézmény kijelöléséhez.

**Kapcsolattartó:** `[Név]`, `[E-mail]`, `[Telefonszám]`, `[StrataHu Piactér / GitHub link]`
