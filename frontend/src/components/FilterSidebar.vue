<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ProjectTier } from '../services/api';

export interface FacetOption {
  label: string;
  count: number;
}

const props = defineProps<{
  categories: FacetOption[];
  selectedCategories: string[];
  selectedTiers: ProjectTier[];
  tags: FacetOption[];
  selectedTags: string[];
  onlyWithDemo: boolean;
  onlyTop10: boolean;
  onlyWithImage: boolean;
  activeFilterCount: number;
}>();

const emit = defineEmits<{
  toggleCategory: [category: string];
  toggleTier: [tier: ProjectTier];
  toggleTag: [tag: string];
  'update:onlyWithDemo': [val: boolean];
  'update:onlyTop10': [val: boolean];
  'update:onlyWithImage': [val: boolean];
  resetFilters: [];
}>();

const mobileOpen = ref(false);
const tagSearch = ref('');

const openSections = ref({
  categories: true,
  tiers: true,
  tags: true,
  features: true
});

const tierOptions: Array<{ id: ProjectTier; label: string; hint: string }> = [
  { id: 'S', label: 'S Tier', hint: 'Kategóriagyőztesek' },
  { id: 'A', label: 'A Tier', hint: 'Különösen ajánlott' },
  { id: 'B', label: 'B Tier', hint: 'Ígéretes kezdeményezések' }
];

const filteredTags = computed(() => {
  const q = tagSearch.value.trim().toLowerCase();
  if (!q) return props.tags;
  return props.tags.filter((t) => t.label.toLowerCase().includes(q));
});
</script>

<template>
  <aside aria-label="Találatok szűrése" class="w-full min-w-0 shrink-0 lg:w-[272px]">
    <!-- Mobile Collapsible Trigger -->
    <div class="mb-4 flex items-center justify-between gap-3 lg:hidden">
      <button
        type="button"
        class="inline-flex min-h-[42px] w-full cursor-pointer items-center justify-between rounded-xl border border-[#cbd6e2] bg-white px-4 py-2.5 text-sm font-semibold text-[#213343] shadow-2xs"
        :aria-expanded="mobileOpen"
        @click="mobileOpen = !mobileOpen"
      >
        <span class="flex items-center gap-2">
          <svg class="h-4 w-4 text-[#00565b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M7 12h10M10 18h4" />
          </svg>
          <span>Szűrők és kategóriák</span>
          <span
            v-if="activeFilterCount > 0"
            class="rounded-full bg-[#00565b] px-2 py-0.5 text-[11px] font-bold text-white"
          >
            {{ activeFilterCount }}
          </span>
        </span>
        <svg
          class="h-4 w-4 transition-transform duration-200"
          :class="mobileOpen ? 'rotate-180' : ''"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>

    <!-- Filter Groups Panel (always visible on lg+, collapsible on mobile) -->
    <div :class="mobileOpen ? 'block space-y-5' : 'hidden space-y-5 lg:block'">
      <!-- Active Filters Header + Clear All -->
      <div
        v-if="activeFilterCount > 0"
        class="flex items-center justify-between rounded-xl border border-[#dbe4ed] bg-white px-4 py-2.5"
      >
        <span class="text-xs font-semibold text-[#213343]">
          {{ activeFilterCount }} aktív szűrő
        </span>
        <button
          type="button"
          class="cursor-pointer text-xs font-semibold text-[#d93b00] hover:underline"
          @click="emit('resetFilters')"
        >
          Összes törlése
        </button>
      </div>

      <!-- 1. Categories Group -->
      <fieldset class="w-full min-w-0 space-y-2.5">
        <button
          type="button"
          class="flex w-full cursor-pointer items-center justify-between py-1 text-left text-sm font-bold text-[#213343]"
          :aria-expanded="openSections.categories"
          @click="openSections.categories = !openSections.categories"
        >
          <span class="flex items-center gap-2">
            <svg
              class="h-3.5 w-3.5 text-[#516f90] transition-transform duration-150"
              :class="openSections.categories ? 'rotate-180' : ''"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
            </svg>
            <span>Kategóriák</span>
          </span>
        </button>

        <div
          v-show="openSections.categories"
          class="relative w-full min-w-0 overflow-hidden rounded-xl border border-[#dbe4ed] bg-white p-2.5"
        >
          <div class="filter-scroll-box w-full min-w-0 space-y-0.5 pr-1">
            <label
              v-for="cat in categories"
              :key="cat.label"
              class="flex min-h-[34px] w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors hover:bg-[#f5f8fa]"
            >
              <span class="flex min-w-0 flex-1 items-start gap-2.5">
                <input
                  type="checkbox"
                  :checked="selectedCategories.includes(cat.label)"
                  class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-full border-[#7c98b6] text-[#00565b]"
                  @change="emit('toggleCategory', cat.label)"
                />
                <span class="min-w-0 flex-1 break-words leading-snug text-[#33475b]">{{ cat.label }}</span>
              </span>
              <span class="shrink-0 text-[11px] font-medium text-[#7c98b6]">
                {{ cat.count }}
              </span>
            </label>
          </div>
          <div
            class="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-white to-transparent"
            aria-hidden="true"
          ></div>
        </div>
      </fieldset>

      <!-- 2. Curated Tier Group -->
      <fieldset class="w-full min-w-0 space-y-2.5">
        <button
          type="button"
          class="flex w-full cursor-pointer items-center justify-between py-1 text-left text-sm font-bold text-[#213343]"
          :aria-expanded="openSections.tiers"
          @click="openSections.tiers = !openSections.tiers"
        >
          <span class="flex items-center gap-2">
            <svg
              class="h-3.5 w-3.5 text-[#516f90] transition-transform duration-150"
              :class="openSections.tiers ? 'rotate-180' : ''"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
            </svg>
            <span>Kurátori besorolás</span>
          </span>
        </button>

        <div
          v-show="openSections.tiers"
          class="rounded-xl border border-[#dbe4ed] bg-white p-2.5"
        >
          <div class="space-y-0.5">
            <label
              v-for="t in tierOptions"
              :key="t.id"
              class="flex min-h-[36px] cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1 text-[13px] transition-colors hover:bg-[#f5f8fa]"
            >
              <span class="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  :checked="selectedTiers.includes(t.id)"
                  class="h-4 w-4 shrink-0 cursor-pointer rounded border-[#7c98b6] text-[#00565b]"
                  @change="emit('toggleTier', t.id)"
                />
                <span class="font-medium text-[#213343]">{{ t.label }}</span>
              </span>
              <span class="text-[11px] text-[#516f90]">{{ t.hint }}</span>
            </label>
          </div>
        </div>
      </fieldset>

      <!-- 3. Technologies (Searchable Facet List) -->
      <fieldset class="w-full min-w-0 space-y-2.5">
        <button
          type="button"
          class="flex w-full cursor-pointer items-center justify-between py-1 text-left text-sm font-bold text-[#213343]"
          :aria-expanded="openSections.tags"
          @click="openSections.tags = !openSections.tags"
        >
          <span class="flex items-center gap-2">
            <svg
              class="h-3.5 w-3.5 text-[#516f90] transition-transform duration-150"
              :class="openSections.tags ? 'rotate-180' : ''"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
            </svg>
            <span>Technológiák</span>
          </span>
        </button>

        <div
          v-show="openSections.tags"
          class="relative overflow-hidden rounded-xl border border-[#dbe4ed] bg-white p-2.5"
        >
          <div class="mb-2">
            <label for="sidebar-tag-search" class="visually-hidden">Technológia szűrése</label>
            <input
              id="sidebar-tag-search"
              v-model="tagSearch"
              type="search"
              placeholder="Technológia szűrése..."
              class="min-h-[34px] w-full rounded-lg border border-[#cbd6e2] bg-[#f5f8fa] px-2.5 py-1 text-xs text-[#213343] placeholder-[#7c98b6] focus:border-[#00565b] focus:bg-white"
            />
          </div>

          <div class="filter-scroll-box space-y-0.5 pr-1">
            <label
              v-for="tagItem in filteredTags"
              :key="tagItem.label"
              class="flex min-h-[32px] cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1 text-[13px] transition-colors hover:bg-[#f5f8fa]"
            >
              <span class="flex min-w-0 items-center gap-2.5">
                <input
                  type="checkbox"
                  :checked="selectedTags.some((s) => s.toLowerCase() === tagItem.label.toLowerCase())"
                  class="h-4 w-4 shrink-0 cursor-pointer rounded border-[#7c98b6] text-[#00565b]"
                  @change="emit('toggleTag', tagItem.label)"
                />
                <span class="truncate text-[#33475b]">{{ tagItem.label }}</span>
              </span>
              <span class="shrink-0 text-[11px] font-medium text-[#7c98b6]">
                {{ tagItem.count }}
              </span>
            </label>
            <p v-if="filteredTags.length === 0" class="px-2 py-3 text-center text-xs text-[#7c98b6]">
              Nincs találat erre a technológiára.
            </p>
          </div>
          <div
            class="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-white to-transparent"
            aria-hidden="true"
          ></div>
        </div>
      </fieldset>

      <!-- 4. Extra Features / Availability -->
      <fieldset class="w-full min-w-0 space-y-2.5">
        <button
          type="button"
          class="flex w-full cursor-pointer items-center justify-between py-1 text-left text-sm font-bold text-[#213343]"
          :aria-expanded="openSections.features"
          @click="openSections.features = !openSections.features"
        >
          <span class="flex items-center gap-2">
            <svg
              class="h-3.5 w-3.5 text-[#516f90] transition-transform duration-150"
              :class="openSections.features ? 'rotate-180' : ''"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
            </svg>
            <span>Tulajdonságok</span>
          </span>
        </button>

        <div
          v-show="openSections.features"
          class="rounded-xl border border-[#dbe4ed] bg-white p-2.5"
        >
          <div class="space-y-0.5">
            <label class="flex min-h-[34px] cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 text-[13px] text-[#33475b] hover:bg-[#f5f8fa]">
              <input
                type="checkbox"
                :checked="onlyWithDemo"
                class="h-4 w-4 shrink-0 cursor-pointer rounded border-[#7c98b6] text-[#00565b]"
                @change="emit('update:onlyWithDemo', ($event.target as HTMLInputElement).checked)"
              />
              <span>Élő demóval rendelkezik</span>
            </label>
            <label class="flex min-h-[34px] cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 text-[13px] text-[#33475b] hover:bg-[#f5f8fa]">
              <input
                type="checkbox"
                :checked="onlyTop10"
                class="h-4 w-4 shrink-0 cursor-pointer rounded border-[#7c98b6] text-[#00565b]"
                @change="emit('update:onlyTop10', ($event.target as HTMLInputElement).checked)"
              />
              <span>Top 10 kiemelt rangsor</span>
            </label>
            <label class="flex min-h-[34px] cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 text-[13px] text-[#33475b] hover:bg-[#f5f8fa]">
              <input
                type="checkbox"
                :checked="onlyWithImage"
                class="h-4 w-4 shrink-0 cursor-pointer rounded border-[#7c98b6] text-[#00565b]"
                @change="emit('update:onlyWithImage', ($event.target as HTMLInputElement).checked)"
              />
              <span>Valódi képernyőképpel</span>
            </label>
          </div>
        </div>
      </fieldset>
    </div>
  </aside>
</template>
