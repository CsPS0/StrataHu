<script setup lang="ts">
export type ActiveViewMode = 'explore' | 'tierlist' | 'top10' | 'incubator';

const props = defineProps<{
  activeView: ActiveViewMode;
  totalProjects: number;
  searchQuery: string;
  showStickySearch?: boolean;
}>();

const emit = defineEmits<{
  'update:activeView': [view: ActiveViewMode];
  'update:searchQuery': [query: string];
  openSubmitModal: [];
  jumpToCollections: [];
}>();

const navItems: Array<{ id: ActiveViewMode; label: string }> = [
  { id: 'explore', label: 'Piactér' },
  { id: 'tierlist', label: 'Tier List' },
  { id: 'top10', label: 'Top 10 Ranglista' },
  { id: 'incubator', label: 'Alapítás & Inkubátor' }
];
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-[#dfe5ec] bg-white shadow-xs">
    <a href="#marketplace-main" class="skip-link visually-hidden">
      Ugrás a fő tartalomhoz
    </a>

    <!-- Utility Top Strip (visible before compact scroll mode) -->
    <div
      v-if="!showStickySearch"
      class="border-b border-[#edf1f5] bg-white text-xs text-[#33475b]"
    >
      <div class="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <div class="flex items-center gap-4">
          <span class="inline-flex items-center gap-1.5 font-medium text-[#213343]">
            <svg class="h-3.5 w-3.5 text-[#516f90]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span>Magyar (HU)</span>
          </span>
          <a
            href="https://discord.gg/kNt5sqzM6w"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 font-medium text-[#516f90] transition-colors hover:text-[#00565b]"
          >
            <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <span>Discord Közösség</span>
          </a>
          <a
            href="https://github.com/CsPS0/StrataHu"
            target="_blank"
            rel="noopener noreferrer"
            class="hidden items-center gap-1.5 font-medium text-[#516f90] transition-colors hover:text-[#00565b] sm:inline-flex"
          >
            <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub Repó</span>
          </a>
        </div>

        <div class="flex items-center gap-4 text-[#516f90]">
          <span class="hidden sm:inline">{{ totalProjects.toLocaleString('hu-HU') }} ellenőrzött magyar fejlesztés</span>
          <a href="#footer-moderation" class="font-medium hover:text-[#213343] hover:underline">
            Moderáció
          </a>
        </div>
      </div>
    </div>

    <!-- Primary Nav OR Scrolled Condensed Search Bar -->
    <div class="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
      <div
        v-if="!showStickySearch"
        class="flex flex-wrap items-center justify-between gap-4 py-3.5"
      >
        <!-- Brand + Primary Navigation -->
        <div class="flex flex-wrap items-center gap-6 lg:gap-8">
          <a
            href="#top"
            class="group flex items-center gap-2.5 text-left"
            @click.prevent="emit('update:activeView', 'explore')"
          >
            <img
              src="/icons/stratahu-icon.jpg?v=2d"
              alt="StrataHu"
              width="36"
              height="36"
              class="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-black/10 transition-transform group-hover:scale-105"
            />
            <span class="font-display text-xl font-bold tracking-tight text-[#213343]">
              StrataHu
            </span>
          </a>

          <nav aria-label="Elsődleges navigáció" class="flex flex-wrap items-center gap-1 sm:gap-2">
            <button
              v-for="item in navItems"
              :key="item.id"
              type="button"
              class="min-h-[38px] cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors active:scale-[0.98]"
              :class="
                props.activeView === item.id
                  ? 'bg-[#eaf0f6] font-semibold text-[#213343]'
                  : 'text-[#33475b] hover:bg-[#f5f8fa] hover:text-[#00565b]'
              "
              :aria-current="props.activeView === item.id ? 'page' : undefined"
              @click="emit('update:activeView', item.id)"
            >
              {{ item.label }}
            </button>
            <button
              type="button"
              class="hidden min-h-[38px] cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium text-[#33475b] transition-colors hover:bg-[#f5f8fa] hover:text-[#00565b] sm:inline-flex sm:items-center"
              @click="emit('jumpToCollections')"
            >
              Gyűjtemények
            </button>
          </nav>
        </div>

        <!-- Primary Orange HubSpot-Style CTA -->
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-full bg-[#d93b00] px-5 py-2 text-sm font-semibold text-white shadow-xs transition-all hover:bg-[#b83200] active:scale-[0.98]"
            @click="emit('openSubmitModal')"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
            </svg>
            <span>Projekt beküldése</span>
          </button>
        </div>
      </div>

      <!-- Condensed Scrolled Search Header (mirrors HubSpot sticky search bar) -->
      <div
        v-else
        class="flex items-center justify-between gap-4 py-2.5"
      >
        <a
          href="#top"
          class="flex shrink-0 items-center gap-2.5"
          @click.prevent="emit('update:activeView', 'explore')"
        >
          <img
            src="/icons/stratahu-icon.jpg?v=2d"
            alt="StrataHu"
            width="32"
            height="32"
            class="h-8 w-8 rounded-lg object-cover ring-1 ring-black/10"
          />
          <span class="hidden font-display text-base font-bold text-[#213343] md:inline">
            StrataHu Piactér
          </span>
        </a>

        <div class="relative min-w-0 flex-1 max-w-2xl">
          <label for="sticky-header-search" class="visually-hidden">
            Gyorskeresés projektek és technológiák között
          </label>
          <input
            id="sticky-header-search"
            type="search"
            :value="searchQuery"
            placeholder="Keresés magyar projektek és könyvtárak között..."
            class="min-h-[42px] w-full rounded-full border border-[#cbd6e2] bg-white pl-4 pr-10 text-sm text-[#213343] placeholder-[#516f90] transition-colors focus:border-[#00565b]"
            @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
          />
          <span class="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[#516f90]" aria-hidden="true">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="11" cy="11" r="8" />
              <path stroke-linecap="round" d="m21 21-4.3-4.3" />
            </svg>
          </span>
        </div>

        <button
          type="button"
          class="hidden min-h-[40px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[#d93b00] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#b83200] active:scale-[0.98] sm:inline-flex"
          @click="emit('openSubmitModal')"
        >
          <span>+ Beküldés</span>
        </button>
      </div>
    </div>
  </header>
</template>
