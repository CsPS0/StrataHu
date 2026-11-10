<script setup lang="ts">
import { ref } from 'vue';

type TemplateKey = 'incubator' | 'b2g' | 'onepager';

const activeTemplate = ref<TemplateKey>('b2g');

// Copy button state & accessible live announcement
const copyStatus = ref<'' | 'Másolva a vágólapra!' | 'Sikertelen másolás'>('');
const isCopied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;
let lastAnnouncement = '';

// Quick Founder & Incubator Draft Generators (syncing smoothly with Discord)
const founderName = ref('');
const founderRole = ref('Üzlet / B2G & Iskolai kapcsolatok');
const founderIntro = ref('');
const generatedFounderPitch = ref('');

const projectDraftName = ref('');
const projectDraftRepo = ref('');
const projectDraftGoal = ref('');
const generatedProjectPitch = ref('');

const templates: Record<
  TemplateKey,
  { id: TemplateKey; title: string; badge: string; filename: string; content: string }
> = {
  b2g: {
    id: 'b2g',
    title: 'Kormányzati & B2G Pilot Pitch',
    badge: 'Minisztérium / Tankerület',
    filename: '02_KORMANYZATI_ES_B2G_PITCH_SABLON.md',
    content: `# HIVATALOS SZAKMAI JAVASLAT ÉS 90 NAPOS PILOT PROGRAM TERV

Címzett: [Intézmény / Minisztérium / Tankerület neve]
Küldő: StrataHu Magyar Fejlesztői Szövetkezet / Egyesület & [Projekt csapata]
Tárgy: Kockázatmentes kísérleti pilot-program javaslat a hazai digitális oktatási élmény modernizálására ([Projekt neve])

1. VEZETŐI ÖSSZEFOGLALÓ
A StrataHu közösség tehetséges hazai fejlesztőket fog össze. Jelen javaslatunk egy már [X ezer] felhasználó által napi szinten használt magyar nyílt forráskódú megoldás ([pl. Firka / Pala]) kontrollált intézményi tesztelésére irányul.

2. MIÉRT JELENT ELŐRELÉPÉST?
• Felhasználói élmény: Villámgyors, reklámmentes modern webes/mobilos és asztali felület.
• Adatvédelem & Átláthatóság: Teljes GDPR és hazai adatszuverenitás, auditálható nyílt forráskód.
• Költséghatékonyság: A külső licenc- és fejlesztési kiadások töredékéért üzemeltethető és bővíthető.

3. BIZTONSÁGI GARANCIÁK
• GDPR és IBTV / NIS2 megfelelőség (magyar/EU adatközpont).
• Hivatalos, jogosultságkezelt API integráció.
• Független biztonsági audit és WCAG 2.1 akadálymentesség.

4. KOCKÁZATMENTES 90 NAPOS PILOT (1–3 önkéntes intézményben)
• 1. hónap: Izolált tesztkörnyezet és DPO jóváhagyás.
• 2. hónap: Éles próba 1–3 középiskolában 24 órás SLA támogatással.
• 3. hónap: Közös hatástanulmány (adminisztrációs idő-megtakarítás és felhasználói visszajelzések).`
  },
  incubator: {
    id: 'incubator',
    title: 'Projekt Inkubációs Adatlap',
    badge: 'Fejlesztőknek (0 Ft)',
    filename: '01_PROJEKT_INKUBACIOS_SABLON.md',
    content: `# PROJEKT INKUBÁCIÓS & SZÖVETKEZETI JELENTKEZÉS

• Projekt neve: [pl. Firka / Pala]
• Alkotó(k): [Név, @GitHub handle]
• Repó / Demó: [https://github.com/...]
• Kiváltott elavult rendszer: [Melyik lassú/rossz UX-ű szoftvert váltja le?]
• Bizonyított igény: [Aktív felhasználók / GitHub csillagok / visszajelzések]

SIKERDÍJAS EGYÜTTMŰKÖDÉSI MODELL (0 Ft előleg):
• Belépési költség a fejlesztőnek: 0 Ft
• A Szövetkezet adja: Jogi ernyő, számlázás, GDPR/biztonsági audit, B2B/B2G tárgyalások.
• Közös bevétel megosztása: 75–85% a fejlesztő csapaté | 15–25% a szövetkezeti inkubációs alap.`
  },
  onepager: {
    id: 'onepager',
    title: 'Alapítói & HSUP One-Pager',
    badge: 'Alapítóknak / HSUP',
    filename: '03_ALAPITO_ES_TOKEBEVONASI_ONE_PAGER.md',
    content: `# STRATAHU — Magyar Közösségi Tech Inkubátor & Szövetkezet

KÜLDETÉS: Összegyűjtjük, validáljuk és jogi-üzleti pajzzsal visszük piacra a legjobb magyar diák- és független fejlesztői projekteket — nulla induló tőkével.

ÜTEMTERV 0 FT ALAPTŐKÉVEL:
• 0. Fázis: Élő piactér (1000+ magyar projekt) és automatizált Discord közösség.
• 1. Fázis: Civil Egyesület (0 Ft törvényi tőke, 10 alapító tag) + HSUP egyetemi ösztöndíjak + KKV megbízások (Cooperative Dev Studio).
• 2. Fázis: Pilot eredményekre alapozott Általános Szövetkezet / projektcég a nagyvállalati és állami (B2G) szerződésekhez.`
  }
};

function fallbackExecCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.cssText = 'position:fixed;inset-block-start:0;opacity:0';
  document.body.append(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } finally {
    textarea.remove();
  }
}

async function handleCopyText(text: string) {
  if (!text.trim()) return;
  if (copyTimer) clearTimeout(copyTimer);

  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    ok = fallbackExecCopy(text);
  }

  let msg = ok ? 'Másolva a vágólapra!' : 'Sikertelen másolás';
  if (msg === lastAnnouncement) msg += '\u00A0';
  lastAnnouncement = msg;

  isCopied.value = ok;
  copyStatus.value = msg as any;

  copyTimer = setTimeout(() => {
    isCopied.value = false;
    copyStatus.value = '';
  }, 2400);
}

function createFounderDraft() {
  if (!founderName.value.trim() || !founderIntro.value.trim()) return;
  generatedFounderPitch.value =
    `🤝 ALAPÍTÓ TÁRS JELENTKEZÉS — StrataHu Szövetkezet\n` +
    `• Név / Discord: ${founderName.value.trim()}\n` +
    `• Vállalt szerepkör: ${founderRole.value}\n` +
    `• Motiváció & Tapasztalat: ${founderIntro.value.trim()}`;
}

function createProjectDraft() {
  if (!projectDraftName.value.trim() || !projectDraftRepo.value.trim()) return;
  generatedProjectPitch.value =
    `🚀 INKUBÁCIÓS PÁLYÁZAT — StrataHu Inkubátor\n` +
    `• Projekt: ${projectDraftName.value.trim()}\n` +
    `• Forráskód / Demó: ${projectDraftRepo.value.trim()}\n` +
    `• Célpiac & Támogatási igény: ${projectDraftGoal.value.trim() || 'Jogi/üzleti ernyő és B2G/KKV pilot'}`;
}
</script>

<template>
  <section aria-label="Szövetkezet alapítás és Inkubátor Központ" class="space-y-8">
    <!-- ================================================================ -->
    <!-- 1. LAUNCHPAD EXECUTIVE SUMMARY CARD                              -->
    <!-- ================================================================ -->
    <div class="rounded-2xl border border-[#dbe4ed] bg-white p-6 shadow-2xs sm:p-8">
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-full bg-[#d93b00] px-3 py-0.5 text-xs font-bold text-white">
          0 Ft Alaptőke Modell
        </span>
        <span class="rounded-full bg-[#6a55fa] px-3 py-0.5 text-xs font-bold text-white">
          Alapításra Kész Terv
        </span>
        <span class="rounded-full border border-[#dbe4ed] bg-[#f5f8fa] px-3 py-0.5 text-xs font-semibold text-[#00565b]">
          Magyar Fejlesztők → Nagypiac &amp; B2G
        </span>
      </div>

      <h3 class="font-display mt-4 text-2xl font-bold tracking-tight text-[#213343] sm:text-3xl">
        StrataHu Közösségi Szövetkezet &amp; Tech Inkubátor
      </h3>
      <p class="mt-2.5 max-w-[70ch] text-sm leading-relaxed text-[#33475b] sm:text-base">
        Magyarországon rengeteg kiváló diák- és független projekt születik (mint például a <strong>Firka</strong> vagy a <strong>Pala</strong>), amelyek felhasználói élményben messze lekörözik az elavult intézményi rendszereket — mégsem jutnak el a nagyvállalatokhoz vagy állami döntéshozókhoz jogi háttér és tőke hiányában. A StrataHu pontosan ezt a <strong>jogi, biztonsági és B2B/B2G hidat</strong> építi fel 0 Ft előlegből!
      </p>

      <!-- 3-Phase Roadmap Cards -->
      <div class="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div class="rounded-xl border border-[#dbe4ed] bg-[#f8fafc] p-5">
          <div class="text-xs font-bold uppercase tracking-wider text-[#00565b]">
            0. Fázis • Aktív (0 Ft)
          </div>
          <h4 class="font-display mt-1.5 text-base font-bold text-[#213343]">
            Piactér &amp; Discord Validáció
          </h4>
          <p class="mt-2 text-xs leading-relaxed text-[#516f90]">
            Élő katalógus 1 000+ hazai projekttel, GitHub hitelesítéssel és automatizált Discord inkubátor szobákkal (<code class="font-mono text-[#213343]">#📋・alapítási-terv-és-társak</code>), ahol kiderül, melyik ötletre van valós igény.
          </p>
        </div>

        <div class="rounded-xl border border-[#dbe4ed] bg-[#f8fafc] p-5">
          <div class="text-xs font-bold uppercase tracking-wider text-[#6a55fa]">
            1. Fázis • Civil &amp; HSUP (0 Ft)
          </div>
          <h4 class="font-display mt-1.5 text-base font-bold text-[#213343]">
            Egyesület + Ösztöndíjak
          </h4>
          <p class="mt-2 text-xs leading-relaxed text-[#516f90]">
            <strong>Egyesület alapítása (0 Ft törvényi tőke, min. 10 fő)</strong> a Discord magcsapatból + jelentkezés egyetemista tagokkal a <strong>HSUP</strong> programba (havi ösztöndíj, Top 15: 1M Ft/fő, Growth Fund).
          </p>
        </div>

        <div class="rounded-xl border border-[#dbe4ed] bg-[#f8fafc] p-5">
          <div class="text-xs font-bold uppercase tracking-wider text-[#d93b00]">
            2. Fázis • Nagypiac &amp; B2G
          </div>
          <h4 class="font-display mt-1.5 text-base font-bold text-[#213343]">
            90 Napos Pilot &amp; Szövetkezet
          </h4>
          <p class="mt-2 text-xs leading-relaxed text-[#516f90]">
            Kockázatmentes <strong>90 napos iskolai/intézményi pilot</strong> (GDPR, API és WCAG audit után), majd a megnyert bevételekből teljes jogú <strong>Általános Szövetkezet</strong> létrehozása (75–85% fejlesztői részesedés!).
          </p>
        </div>
      </div>

      <!-- Legal Comparison Note -->
      <div class="mt-5 rounded-xl border border-amber-300/70 bg-amber-50/70 p-4 text-xs leading-relaxed text-[#33475b]">
        <strong class="text-[#213343]">Jogi tipp induláshoz (Magyarországon):</strong>
        A sima <em>Iskolaszövetkezethez</em> kötelező egy iskola/egyetem alapító tagsága és 90%-os ottani diákarány, ráadásul diákmunkára szabták — ezért indulásnak a <strong>0 Ft-os Egyesület (10 alapítóval)</strong> vagy a <strong>HSUP startup keret</strong> a legokosabb lépcsőfok az <strong>Általános Szövetkezet / Kft.</strong> előtt!
      </div>
    </div>

    <!-- ================================================================ -->
    <!-- 2. INTERACTIVE SIGNUP: FOUNDING CO-FOUNDER & INCUBATOR SUBMIT    -->
    <!-- ================================================================ -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Card A: Join the Founding Team -->
      <div class="flex flex-col justify-between rounded-2xl border border-[#dbe4ed] bg-white p-6 shadow-2xs">
        <div>
          <div class="flex items-center justify-between gap-2">
            <span class="rounded-full bg-[#d93b00]/10 px-3 py-1 text-xs font-bold text-[#d93b00]">
              Alapító Magcsapat (Cél: 10 fő)
            </span>
          </div>
          <h4 class="font-display mt-3 text-xl font-bold text-[#213343]">
            🤝 Jelentkezz Alapító Társnak
          </h4>
          <p class="mt-1.5 text-sm text-[#516f90]">
            Nincs szükség pénzre — keresünk senior fejlesztőket, üzleti/B2G tárgyalókat és jogi/pályázati érdeklődőket az induló csapatba.
          </p>

          <form class="mt-5 space-y-3.5" @submit.prevent="createFounderDraft">
            <div>
              <label for="inc-founder-name" class="block text-xs font-semibold text-[#213343]">
                Neved vagy Discord / GitHub azonosítód *
              </label>
              <input
                id="inc-founder-name"
                v-model="founderName"
                type="text"
                required
                placeholder="pl. @peter_dev"
                class="mt-1 min-h-[40px] w-full rounded-xl border border-[#cbd6e2] bg-[#f8fafc] px-3.5 py-2 text-sm text-[#213343] focus:border-[#00565b] focus:bg-white"
              />
            </div>

            <div>
              <label for="inc-founder-role" class="block text-xs font-semibold text-[#213343]">
                Melyik területen segítenél?
              </label>
              <select
                id="inc-founder-role"
                v-model="founderRole"
                class="mt-1 min-h-[40px] w-full rounded-xl border border-[#cbd6e2] bg-[#f8fafc] px-3.5 py-2 text-sm text-[#213343] focus:border-[#00565b] focus:bg-white"
              >
                <option value="Üzlet / B2G & Iskolai kapcsolatok">Üzlet / B2G &amp; Iskolai kapcsolatok</option>
                <option value="Senior Fejlesztő / Biztonsági Mentor">Senior Fejlesztő / Biztonsági Mentor</option>
                <option value="Jog, GDPR & Szervezetalapítás">Jog, GDPR &amp; Szervezetalapítás</option>
                <option value="HSUP Pályázat & Marketing">HSUP Pályázat &amp; Marketing</option>
              </select>
            </div>

            <div>
              <label for="inc-founder-intro" class="block text-xs font-semibold text-[#213343]">
                Rövid motiváció és háttér *
              </label>
              <textarea
                id="inc-founder-intro"
                v-model="founderIntro"
                rows="2"
                required
                placeholder="Mivel tudod előrelendíteni a magyar fejlesztők piacra jutását?"
                class="mt-1 w-full rounded-xl border border-[#cbd6e2] bg-[#f8fafc] px-3.5 py-2 text-sm text-[#213343] focus:border-[#00565b] focus:bg-white"
              ></textarea>
            </div>

            <div class="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="submit"
                class="min-h-[40px] cursor-pointer rounded-full bg-[#d93b00] px-5 py-2 text-xs font-semibold text-white transition-all hover:bg-[#b83200] active:scale-[0.98]"
              >
                Jelentkezési szöveg összeállítása
              </button>
              <a
                href="https://discord.gg/kNt5sqzM6w"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex min-h-[40px] items-center rounded-full border border-[#7c98b6] bg-white px-4 py-2 text-xs font-semibold text-[#33475b] hover:bg-[#f5f8fa]"
              >
                Megnyitás Discordon &rarr;
              </a>
            </div>
          </form>

          <div
            v-if="generatedFounderPitch"
            class="mt-4 rounded-xl border border-[#00565b]/30 bg-[#f0f7f7] p-4 text-xs text-[#213343]"
          >
            <p class="font-bold text-[#00565b]">Kész az üzenet! Másold ki és kattints a „Jelentkezek Alapító Társnak” gombra a Discord #📋・alapítási-terv-és-társak szobájában:</p>
            <pre class="mt-2 whitespace-pre-wrap font-sans text-xs text-[#33475b]">{{ generatedFounderPitch }}</pre>
            <button
              type="button"
              class="mt-2.5 cursor-pointer rounded-full bg-[#00565b] px-3.5 py-1 text-[11px] font-semibold text-white hover:bg-[#004246]"
              @click="handleCopyText(generatedFounderPitch)"
            >
              Szöveg másolása
            </button>
          </div>
        </div>
      </div>

      <!-- Card B: Submit Project to Incubator -->
      <div class="flex flex-col justify-between rounded-2xl border border-[#dbe4ed] bg-white p-6 shadow-2xs">
        <div>
          <div class="flex items-center justify-between gap-2">
            <span class="rounded-full bg-[#00565b]/10 px-3 py-1 text-xs font-bold text-[#00565b]">
              0 Ft Előleg • 75–85% Fejlesztői Bevétel
            </span>
          </div>
          <h4 class="font-display mt-3 text-xl font-bold text-[#213343]">
            🚀 Jelents be Projektet Inkubációra
          </h4>
          <p class="mt-1.5 text-sm text-[#516f90]">
            Készítettél egy alkalmazást (mint a Firka vagy Pala), ami túlmutat a hobbi szinten? Állítsd össze a pályázati vázlatot másodpercek alatt!
          </p>

          <form class="mt-5 space-y-3.5" @submit.prevent="createProjectDraft">
            <div>
              <label for="inc-proj-name" class="block text-xs font-semibold text-[#213343]">
                Projekt neve *
              </label>
              <input
                id="inc-proj-name"
                v-model="projectDraftName"
                type="text"
                required
                placeholder="pl. Firka, Pala vagy saját eszközöd"
                class="mt-1 min-h-[40px] w-full rounded-xl border border-[#cbd6e2] bg-[#f8fafc] px-3.5 py-2 text-sm text-[#213343] focus:border-[#00565b] focus:bg-white"
              />
            </div>

            <div>
              <label for="inc-proj-repo" class="block text-xs font-semibold text-[#213343]">
                GitHub repó vagy Élő demó link *
              </label>
              <input
                id="inc-proj-repo"
                v-model="projectDraftRepo"
                type="url"
                required
                placeholder="https://github.com/..."
                class="mt-1 min-h-[40px] w-full rounded-xl border border-[#cbd6e2] bg-[#f8fafc] px-3.5 py-2 text-sm text-[#213343] focus:border-[#00565b] focus:bg-white"
              />
            </div>

            <div>
              <label for="inc-proj-goal" class="block text-xs font-semibold text-[#213343]">
                Célpiac &amp; Miben segítsen a Szövetkezet?
              </label>
              <textarea
                id="inc-proj-goal"
                v-model="projectDraftGoal"
                rows="2"
                placeholder="pl. Iskolai e-napló kliens modernizálása — GDPR audit és 90 napos iskolai pilot indítása."
                class="mt-1 w-full rounded-xl border border-[#cbd6e2] bg-[#f8fafc] px-3.5 py-2 text-sm text-[#213343] focus:border-[#00565b] focus:bg-white"
              ></textarea>
            </div>

            <div class="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="submit"
                class="min-h-[40px] cursor-pointer rounded-full bg-[#00565b] px-5 py-2 text-xs font-semibold text-white transition-all hover:bg-[#004246] active:scale-[0.98]"
              >
                Inkubációs kártya generálása
              </button>
              <a
                href="https://discord.gg/kNt5sqzM6w"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex min-h-[40px] items-center rounded-full border border-[#7c98b6] bg-white px-4 py-2 text-xs font-semibold text-[#33475b] hover:bg-[#f5f8fa]"
              >
                Beküldés a /inkubacio paranccsal &rarr;
              </a>
            </div>
          </form>

          <div
            v-if="generatedProjectPitch"
            class="mt-4 rounded-xl border border-[#00565b]/30 bg-[#f0f7f7] p-4 text-xs text-[#213343]"
          >
            <p class="font-bold text-[#00565b]">Elkészült a pályázati kivonat! Másold ki, vagy futtasd Discordon az /inkubacio parancsot:</p>
            <pre class="mt-2 whitespace-pre-wrap font-sans text-xs text-[#33475b]">{{ generatedProjectPitch }}</pre>
            <button
              type="button"
              class="mt-2.5 cursor-pointer rounded-full bg-[#00565b] px-3.5 py-1 text-[11px] font-semibold text-white hover:bg-[#004246]"
              @click="handleCopyText(generatedProjectPitch)"
            >
              Szöveg másolása
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ================================================================ -->
    <!-- 3. INTERACTIVE TEMPLATE CENTER (B2G, INCUBATION, ONE-PAGER)      -->
    <!-- ================================================================ -->
    <div class="rounded-2xl border border-[#dbe4ed] bg-white p-6 shadow-2xs sm:p-8">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf1f5] pb-4">
        <div>
          <span class="rounded-full bg-[#0066cc] px-3 py-0.5 text-[11px] font-bold text-white">
            Sablonközpont
          </span>
          <h4 class="font-display mt-2 text-xl font-bold text-[#213343]">
            Használatra kész hivatalos alapítási és B2G sablonok
          </h4>
        </div>
        <a
          href="https://github.com/CsPS0/StrataHu/tree/main/docs"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs font-semibold text-[#00565b] hover:underline"
        >
          Teljes dokumentáció megnyitása GitHubon &rarr;
        </a>
      </div>

      <!-- Accessible Tabs with Shape Underline Indicator (per Modern Web Guidance tabs rule) -->
      <div
        role="tablist"
        aria-label="Inkubációs sablonok"
        class="mt-4 flex flex-nowrap gap-6 overflow-x-auto border-b border-[#dbe4ed]"
      >
        <button
          v-for="tpl in Object.values(templates)"
          :key="tpl.id"
          :id="`tab-${tpl.id}`"
          type="button"
          role="tab"
          :aria-selected="activeTemplate === tpl.id"
          class="incubator-tab relative shrink-0 cursor-pointer pb-3 pt-1 text-sm font-semibold transition-colors"
          :class="
            activeTemplate === tpl.id
              ? 'text-[#00565b]'
              : 'text-[#516f90] hover:text-[#213343]'
          "
          @click="activeTemplate = tpl.id"
        >
          <span>{{ tpl.title }}</span>
        </button>
      </div>

      <!-- Active Template Viewer + Accessible Copy Control -->
      <div
        v-for="tpl in Object.values(templates)"
        :key="'panel-' + tpl.id"
        role="tabpanel"
        :aria-labelledby="`tab-${tpl.id}`"
        :hidden="activeTemplate !== tpl.id"
        class="mt-5"
      >
        <div class="overflow-hidden rounded-xl border border-[#dbe4ed] bg-[#f8fafc]">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#dbe4ed] bg-white px-4 py-3">
            <div class="flex items-center gap-2.5">
              <span class="font-mono text-xs font-semibold text-[#213343]">
                docs/templates/{{ tpl.filename }}
              </span>
              <span class="rounded-full bg-[#eaf0f6] px-2.5 py-0.5 text-[11px] font-medium text-[#33475b]">
                {{ tpl.badge }}
              </span>
            </div>

            <!-- Copy Button + Accessible Live Region OUTSIDE button -->
            <div class="relative flex items-center gap-2">
              <span
                role="status"
                aria-live="polite"
                class="rounded-full bg-[#213343] px-2.5 py-1 text-[11px] font-semibold text-white transition-opacity duration-150"
                :class="copyStatus ? 'opacity-100' : 'pointer-events-none opacity-0'"
              >
                {{ copyStatus }}
              </span>
              <button
                type="button"
                class="inline-flex min-h-[34px] min-w-[34px] cursor-pointer items-center gap-1.5 rounded-full border border-[#7c98b6] bg-white px-3.5 py-1 text-xs font-semibold text-[#213343] transition-colors hover:bg-[#f0f2f5]"
                :aria-label="`${tpl.title} tartalmának másolása`"
                @click="handleCopyText(tpl.content)"
              >
                <svg
                  v-if="!isCopied"
                  class="h-3.5 w-3.5 text-[#00565b]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <svg
                  v-else
                  class="h-3.5 w-3.5 text-emerald-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5" />
                </svg>
                <span>{{ isCopied ? 'Másolva' : 'Sablon másolása' }}</span>
              </button>
            </div>
          </div>

          <pre class="overflow-x-auto whitespace-pre-wrap p-5 font-mono text-xs leading-relaxed text-[#213343]"><code>{{ tpl.content }}</code></pre>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Indicating selected tab cleanly via shape underline (WCAG 1.4.1 non-color indicator) */
.incubator-tab[aria-selected="true"]::after {
  content: "";
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  border-block-end: 3px solid var(--accent-teal);
}
</style>
