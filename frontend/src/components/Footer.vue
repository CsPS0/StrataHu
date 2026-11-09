<script setup lang="ts">
import { TAKEDOWN_CONTACT_EMAIL } from '../services/api';

const currentYear = new Date().getFullYear();
</script>

<template>
  <footer class="mt-auto border-t border-white/[0.07] bg-[#090b10] text-slate-400">
    <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <!-- Intellectual Property & 24h Takedown Notice -->
      <div class="rounded-2xl border border-white/[0.08] bg-[#121620] p-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="space-y-1.5">
            <div class="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <span class="inline-block h-2 w-2 rounded-full bg-amber-400" aria-hidden="true"></span>
              Szellemi tulajdonjog és moderációs tájékoztató
            </div>
            <p class="max-w-3xl text-xs leading-relaxed text-slate-300 sm:text-sm">
              Minden bemutatott szoftver, forráskód és védjegy szellemi tulajdonjoga kizárólag az eredeti alkotókat
              illeti meg. A StrataHu közösségi gyűjteményként működik: az eredeti készítők által benyújtott
              eltávolítási kérelmeket legfeljebb
              <strong class="font-semibold text-white">24 órán belül</strong> végrehajtjuk.
            </p>
          </div>

          <div class="shrink-0">
            <a
              :href="`mailto:${TAKEDOWN_CONTACT_EMAIL}?subject=${encodeURIComponent('[MODERÁCIÓ] StrataHu megkeresés')}`"
              class="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-slate-200 transition-colors hover:border-amber-400/50 hover:text-amber-200"
            >
              <span>{{ TAKEDOWN_CONTACT_EMAIL }}</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="mt-6 flex flex-col items-start justify-between gap-3 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center">
        <div>
          &copy; {{ currentYear }} StrataHu — Magyar fejlesztői projektek gyűjteménye (MIT licenc)
        </div>
        <div class="flex flex-wrap items-center gap-4 text-slate-400">
          <a
            href="https://discord.gg/kNt5sqzM6w"
            target="_blank"
            rel="noopener noreferrer"
            class="transition-colors hover:text-indigo-400"
          >
            Discord Szerver
          </a>
          <span aria-hidden="true">&bull;</span>
          <a
            href="https://github.com/CsPS0/StrataHu"
            target="_blank"
            rel="noopener noreferrer"
            class="transition-colors hover:text-white"
          >
            GitHub Repó
          </a>
          <span aria-hidden="true">&bull;</span>
          <span>Vue 3 &middot; .NET 10 &middot; PostgreSQL</span>
        </div>
      </div>
    </div>
  </footer>
</template>
