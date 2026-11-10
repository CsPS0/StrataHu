<script setup lang="ts">
import { TAKEDOWN_CONTACT_EMAIL } from '../services/api';

const emit = defineEmits<{
  selectCategory: [category: string];
  switchView: [view: 'explore' | 'tierlist' | 'top10'];
  openSubmitModal: [];
}>();

const currentYear = new Date().getFullYear();

const quickCategories = [
  'Web & Alkotói eszközök',
  'Infrastruktúra & DevOps',
  'Mesterséges intelligencia & NLP',
  'Parancssor & Fejlesztői eszközök',
  'Oktatás & e-Kréta'
];
</script>

<template>
  <footer
    id="footer-moderation"
    class="deferred-section mt-auto bg-[#213343] text-[#cbd6e2]"
  >
    <div class="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8">
      <!-- Top Multi-Column Directory Links (HubSpot Global Footer Structure) -->
      <div class="grid grid-cols-1 gap-8 border-b border-white/10 pb-10 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Brand Summary -->
        <div class="space-y-4">
          <div class="flex items-center gap-2.5">
            <img
              src="/icons/stratahu-icon.jpg"
              alt="StrataHu"
              width="32"
              height="32"
              class="h-8 w-8 rounded-lg object-cover ring-1 ring-white/15"
            />
            <span class="font-display text-lg font-bold text-white">StrataHu Piactér</span>
          </div>
          <p class="max-w-xs text-xs leading-relaxed text-[#99acc2]">
            A magyar fejlesztői közösség nyílt forráskódú projektjeinek, webes alkalmazásainak és eszközeinek kurátori tárháza.
          </p>
          <div class="flex items-center gap-2.5 pt-1">
            <a
              href="https://discord.gg/kNt5sqzM6w"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-[#2d3e50] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#3a4f66]"
            >
              Discord
            </a>
            <a
              href="https://github.com/CsPS0/StrataHu"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-[#2d3e50] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#3a4f66]"
            >
              GitHub
            </a>
          </div>
        </div>

        <!-- Column 2: Népszerű Kategóriák -->
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-white">
            Népszerű kategóriák
          </h3>
          <ul class="mt-3.5 space-y-2 text-xs">
            <li v-for="cat in quickCategories" :key="cat">
              <button
                type="button"
                class="cursor-pointer text-left text-[#b0c1d4] transition-colors hover:text-white hover:underline"
                @click="emit('selectCategory', cat)"
              >
                {{ cat }}
              </button>
            </li>
          </ul>
        </div>

        <!-- Column 3: Böngészés és Ranglisták -->
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-white">
            Kurátori nézetek
          </h3>
          <ul class="mt-3.5 space-y-2 text-xs">
            <li>
              <button
                type="button"
                class="cursor-pointer text-[#b0c1d4] transition-colors hover:text-white hover:underline"
                @click="emit('switchView', 'explore')"
              >
                Összes projekt a piactéren
              </button>
            </li>
            <li>
              <button
                type="button"
                class="cursor-pointer text-[#b0c1d4] transition-colors hover:text-white hover:underline"
                @click="emit('switchView', 'tierlist')"
              >
                S / A / B Tier List
              </button>
            </li>
            <li>
              <button
                type="button"
                class="cursor-pointer text-[#b0c1d4] transition-colors hover:text-white hover:underline"
                @click="emit('switchView', 'top10')"
              >
                Top 10 Magyar Fejlesztés
              </button>
            </li>
            <li>
              <button
                type="button"
                class="cursor-pointer font-semibold text-[#ff7a59] transition-colors hover:text-white hover:underline"
                @click="emit('openSubmitModal')"
              >
                + Új projekt beküldése
              </button>
            </li>
          </ul>
        </div>

        <!-- Column 4: Moderáció & Eltávolítás -->
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-white">
            Szellemi tulajdon &amp; Moderáció
          </h3>
          <div class="mt-3.5 rounded-xl border border-white/10 bg-[#2d3e50]/70 p-4 text-xs leading-relaxed">
            <p class="text-[#cbd6e2]">
              Minden bemutatott szoftver joga az eredeti alkotót illeti. Eltávolítási kérelem esetén
              <strong class="text-white">24 órán belül</strong> intézkedünk.
            </p>
            <a
              :href="`mailto:${TAKEDOWN_CONTACT_EMAIL}?subject=${encodeURIComponent('[MODERÁCIÓ] StrataHu megkeresés')}`"
              class="mt-3 inline-flex min-h-[34px] items-center rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            >
              {{ TAKEDOWN_CONTACT_EMAIL }}
            </a>
          </div>
        </div>
      </div>

      <!-- Bottom Copyright Line -->
      <div class="mt-8 flex flex-col items-start justify-between gap-4 text-xs text-[#99acc2] sm:flex-row sm:items-center">
        <div>
          &copy; {{ currentYear }} StrataHu Közösségi Piactér — Nyílt forráskódú projekt (MIT licenc)
        </div>
        <div class="flex flex-wrap items-center gap-4">
          <a href="#top" class="hover:text-white hover:underline">Ugrás a tetejére &uarr;</a>
        </div>
      </div>
    </div>
  </footer>
</template>
