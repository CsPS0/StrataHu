<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  searchQuery: string;
  selectedCategory: string;
  selectedTag: string;
  categories: string[];
  availableTags: string[];
}>();

const emit = defineEmits<{
  'update:searchQuery': [value: string];
  'update:selectedCategory': [value: string];
  'update:selectedTag': [value: string];
  resetFilters: [];
}>();

const localSearch = ref(props.searchQuery);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.searchQuery,
  (newVal) => {
    localSearch.value = newVal;
  }
);

function onSearchInput(event: Event) {
  const target = event.target as HTMLInputElement;
  localSearch.value = target.value;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    emit('update:searchQuery', localSearch.value);
  }, 160);
}

function handleReset() {
  localSearch.value = '';
  if (debounceTimer) clearTimeout(debounceTimer);
  emit('resetFilters');
}

function toggleCategory(cat: string, current: string) {
  emit('update:selectedCategory', current === cat ? '' : cat);
}

function toggleTag(tag: string, current: string) {
  emit('update:selectedTag', current.toLowerCase() === tag.toLowerCase() ? '' : tag);
}

const showAllTags = ref(false);

const displayedTags = computed(() => {
  if (showAllTags.value) {
    return props.availableTags;
  }
  const top = props.availableTags.slice(0, 16);
  if (props.selectedTag && !top.some((t) => t.toLowerCase() === props.selectedTag.toLowerCase())) {
    return [...top, props.selectedTag];
  }
  return top;
});
</script>

<template>
  <search aria-label="Magyar projektek keresése és szűrése" class="border-b border-white/[0.06] bg-[#0e1118]">
    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <form class="space-y-4" @submit.prevent>
        <!-- Search Input Bar -->
        <div class="relative">
          <label for="directory-search-input" class="sr-only">
            Keresés projekt neve, leírása, készítője vagy technológia alapján
          </label>
          <div
            class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400"
            aria-hidden="true"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <path stroke-linecap="round" d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <input
            id="directory-search-input"
            type="search"
            name="q"
            :value="localSearch"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            enterkeyhint="search"
            placeholder="Keresés név, leírás, készítő vagy technológia alapján (pl. .NET 10, Rust, Vue 3, NAV, BKK)..."
            class="min-h-[50px] w-full rounded-2xl border border-white/[0.09] bg-[#141822] pl-12 pr-28 text-sm text-white placeholder-slate-400 shadow-inner transition-colors focus:border-indigo-400"
            @input="onSearchInput"
          />
          <button
            v-if="localSearch || selectedCategory || selectedTag"
            type="button"
            class="absolute inset-y-2 right-2 cursor-pointer rounded-xl bg-white/[0.08] px-3.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/[0.14]"
            @click="handleReset"
          >
            Szűrők törlése
          </button>
        </div>

        <!-- Category Pills -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="mr-1 text-xs font-medium text-slate-400">Kategóriák:</span>
          <button
            type="button"
            class="cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all"
            :class="
              selectedCategory === ''
                ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/25'
                : 'border border-white/[0.07] bg-[#141822] text-slate-300 hover:border-white/[0.15] hover:text-white'
            "
            :aria-pressed="selectedCategory === ''"
            @click="emit('update:selectedCategory', '')"
          >
            Összes kategória
          </button>

          <button
            v-for="cat in categories"
            :key="cat"
            type="button"
            class="cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all"
            :class="
              selectedCategory === cat
                ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/25'
                : 'border border-white/[0.07] bg-[#141822] text-slate-300 hover:border-white/[0.15] hover:text-white'
            "
            :aria-pressed="selectedCategory === cat"
            @click="toggleCategory(cat, selectedCategory)"
          >
            {{ cat }}
          </button>
        </div>

        <!-- Secondary Tech Stack Filter Pills -->
        <div v-if="availableTags.length > 0" class="flex flex-wrap items-center gap-1.5 pt-1">
          <span class="mr-1 text-xs text-slate-500">Technológiák:</span>
          <button
            v-for="tag in displayedTags"
            :key="tag"
            type="button"
            class="cursor-pointer rounded-lg px-2.5 py-1 text-xs transition-colors"
            :class="
              selectedTag.toLowerCase() === tag.toLowerCase()
                ? 'bg-indigo-500/20 font-semibold text-indigo-300 ring-1 ring-indigo-400/50'
                : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200'
            "
            :aria-pressed="selectedTag.toLowerCase() === tag.toLowerCase()"
            @click="toggleTag(tag, selectedTag)"
          >
            {{ tag }}
          </button>

          <button
            v-if="availableTags.length > 16"
            type="button"
            class="cursor-pointer rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-2.5 py-1 text-xs font-medium text-indigo-300 hover:bg-white/[0.06]"
            @click="showAllTags = !showAllTags"
          >
            {{ showAllTags ? 'Kevesebb (-)' : `+${availableTags.length - 16} további...` }}
          </button>
        </div>
      </form>
    </div>
  </search>
</template>
