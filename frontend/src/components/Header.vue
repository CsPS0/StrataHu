<script setup lang="ts">
export type ActiveViewMode = 'explore' | 'tierlist' | 'top10';

defineProps<{
  activeView: ActiveViewMode;
  totalProjects: number;
}>();

const emit = defineEmits<{
  'update:activeView': [view: ActiveViewMode];
  openSubmitModal: [];
}>();
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-white/[0.07] bg-[#0b0d12]/85 backdrop-blur-md">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
        <!-- Brand Logo & Subtitle -->
        <div class="flex items-center justify-between">
          <a
            href="#top"
            class="group flex items-center gap-3.5 text-left"
            @click.prevent="emit('update:activeView', 'explore')"
          >
            <img
              src="/icons/stratahu-icon.jpg"
              alt="StrataHu Logo"
              class="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-white/10 shadow-md shadow-indigo-500/20 transition-transform group-hover:scale-105"
            />
            <div>
              <div class="flex items-center gap-2">
                <span class="text-lg font-bold tracking-tight text-white">StrataHu</span>
                <span
                  class="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-slate-300"
                >
                  {{ totalProjects }} magyar projekt
                </span>
              </div>
              <p class="text-xs text-slate-400">
                Hazai fejlesztések, nyílt forráskódú eszközök és kurátori rangsor
              </p>
            </div>
          </a>

          <!-- Mobile CTA -->
          <button
            type="button"
            class="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-400 md:hidden"
            @click="emit('openSubmitModal')"
          >
            + Beküldés
          </button>
        </div>

        <!-- View Mode Navigation Pills -->
        <nav aria-label="Fő nézetek" class="flex items-center justify-center">
          <div class="inline-flex rounded-2xl border border-white/[0.08] bg-[#13161f] p-1">
            <button
              type="button"
              class="cursor-pointer rounded-xl px-4 py-2 text-xs font-medium transition-all sm:text-sm"
              :class="
                activeView === 'explore'
                  ? 'bg-white/[0.1] font-semibold text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              "
              :aria-pressed="activeView === 'explore'"
              @click="emit('update:activeView', 'explore')"
            >
              Felfedezés
            </button>

            <button
              type="button"
              class="flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium transition-all sm:text-sm"
              :class="
                activeView === 'tierlist'
                  ? 'bg-white/[0.1] font-semibold text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              "
              :aria-pressed="activeView === 'tierlist'"
              @click="emit('update:activeView', 'tierlist')"
            >
              <span>Tier List</span>
              <span class="rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                S–B
              </span>
            </button>

            <button
              type="button"
              class="flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium transition-all sm:text-sm"
              :class="
                activeView === 'top10'
                  ? 'bg-white/[0.1] font-semibold text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              "
              :aria-pressed="activeView === 'top10'"
              @click="emit('update:activeView', 'top10')"
            >
              <span>Top 10</span>
              <span class="rounded-md bg-indigo-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                Rangsor
              </span>
            </button>
          </div>
        </nav>

        <!-- Desktop CTA Button & Community Links -->
        <div class="hidden items-center gap-2.5 md:flex">
          <a
            href="https://discord.gg/kNt5sqzM6w"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2 text-xs font-semibold text-indigo-300 transition-all hover:border-indigo-400 hover:bg-indigo-500/20 hover:text-white"
            title="Csatlakozz a StrataHu Discord szerverhez (állandó meghívó)"
          >
            <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <span>Discord</span>
          </a>

          <a
            href="https://github.com/CsPS0/StrataHu"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-slate-300 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            title="GitHub forráskód megnyitása"
          >
            <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub</span>
          </a>

          <button
            type="button"
            class="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-400 active:scale-[0.99]"
            @click="emit('openSubmitModal')"
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
            </svg>
            Projekt beküldése
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
