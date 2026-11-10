<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Header, { type ActiveViewMode } from './components/Header.vue';
import FilterSidebar, { type FacetOption } from './components/FilterSidebar.vue';
import IncubatorLaunchpad from './components/IncubatorLaunchpad.vue';
import ProjectCard from './components/ProjectCard.vue';
import SubmissionModal from './components/SubmissionModal.vue';
import Footer from './components/Footer.vue';
import {
  buildTakedownMailtoUrl,
  fetchProjects,
  INITIAL_SHOWCASE_PROJECTS,
  submitTakedownNotice,
  type ProjectRecord,
  type ProjectTier
} from './services/api';

type CardViewMode = 'list' | 'grid';
type SortOption = 'popular' | 'tier' | 'name' | 'newest';

const projects = ref<ProjectRecord[]>([...INITIAL_SHOWCASE_PROJECTS]);
const isLoading = ref(false);
const loadError = ref<string | null>(null);
const toastMessage = ref<string | null>(null);

const activeView = ref<ActiveViewMode>('explore');
const viewMode = ref<CardViewMode>('list');
const sortBy = ref<SortOption>('popular');

const searchQuery = ref('');
const selectedCategories = ref<string[]>([]);
const selectedTiers = ref<ProjectTier[]>([]);
const selectedTags = ref<string[]>([]);
const onlyWithDemo = ref(false);
const onlyTop10 = ref(false);
const onlyWithImage = ref(false);

const currentPage = ref(1);
const pageSize = 24;

// Sticky Header Search Trigger
const heroSearchContainerRef = ref<HTMLElement | null>(null);
const resultsTopRef = ref<HTMLElement | null>(null);
const collectionsRef = ref<HTMLElement | null>(null);
const showStickySearch = ref(false);
let heroObserver: IntersectionObserver | null = null;

// Modals
const submissionModalRef = ref<InstanceType<typeof SubmissionModal> | null>(null);
const detailsDialogRef = ref<HTMLDialogElement | null>(null);
const selectedProject = ref<ProjectRecord | null>(null);
const activeGalleryImage = ref<string>('');
const showTakedownDrawer = ref(false);
const requesterContact = ref('');
const takedownReason = ref('');
const isSubmittingTakedown = ref(false);
const takedownFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null);

const categoryFacets = computed<FacetOption[]>(() => {
  const counts = new Map<string, number>();
  for (const p of projects.value) {
    const cat = p.category || 'Egyéb';
    counts.set(cat, (counts.get(cat) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
});

const tagFacets = computed<FacetOption[]>(() => {
  const counts = new Map<string, { label: string; count: number }>();
  for (const project of projects.value) {
    for (const tag of project.techStack) {
      const key = tag.toLowerCase();
      const existing = counts.get(key);
      if (existing) {
        existing.count++;
      } else {
        counts.set(key, { label: tag, count: 1 });
      }
    }
  }
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 60);
});

const activeFilterCount = computed(() => {
  let count = 0;
  count += selectedCategories.value.length;
  count += selectedTiers.value.length;
  count += selectedTags.value.length;
  if (onlyWithDemo.value) count++;
  if (onlyTop10.value) count++;
  if (onlyWithImage.value) count++;
  if (searchQuery.value.trim().length > 0) count++;
  return count;
});

const filteredProjects = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  const matches = projects.value.filter((project) => {
    if (
      selectedCategories.value.length > 0 &&
      !selectedCategories.value.includes(project.category || 'Egyéb')
    ) {
      return false;
    }

    if (
      selectedTiers.value.length > 0 &&
      !selectedTiers.value.includes((project.tier || 'A') as ProjectTier)
    ) {
      return false;
    }

    if (selectedTags.value.length > 0) {
      const stackLower = project.techStack.map((t) => t.toLowerCase());
      const hasAnyTag = selectedTags.value.some((sel) => stackLower.includes(sel.toLowerCase()));
      if (!hasAnyTag) return false;
    }

    if (onlyWithDemo.value && !project.liveDemoUrl) {
      return false;
    }

    if (onlyTop10.value && (!project.rank || project.rank > 10)) {
      return false;
    }

    if (onlyWithImage.value && !project.imageUrl) {
      return false;
    }

    if (!query) return true;

    return (
      project.name.toLowerCase().includes(query) ||
      project.description.toLowerCase().includes(query) ||
      project.authorHandle.toLowerCase().includes(query) ||
      (project.category || '').toLowerCase().includes(query) ||
      project.techStack.some((t) => t.toLowerCase().includes(query))
    );
  });

  return [...matches].sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name, 'hu');
      case 'tier': {
        const order: Record<string, number> = { S: 0, A: 1, B: 2 };
        const diff = (order[a.tier || 'A'] ?? 3) - (order[b.tier || 'A'] ?? 3);
        return diff !== 0 ? diff : (a.rank ?? 9999) - (b.rank ?? 9999);
      }
      case 'newest':
        return new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime();
      case 'popular':
      default:
        return (a.rank ?? 9999) - (b.rank ?? 9999);
    }
  });
});

watch(
  [
    searchQuery,
    selectedCategories,
    selectedTiers,
    selectedTags,
    onlyWithDemo,
    onlyTop10,
    onlyWithImage,
    sortBy
  ],
  () => {
    currentPage.value = 1;
  },
  { deep: true }
);

const totalPages = computed(() => Math.max(1, Math.ceil(filteredProjects.value.length / pageSize)));

const paginatedProjects = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredProjects.value.slice(start, start + pageSize);
});

const resultRangeLabel = computed(() => {
  const total = filteredProjects.value.length;
  if (total === 0) return '0 találat';
  const start = (currentPage.value - 1) * pageSize + 1;
  const end = Math.min(currentPage.value * pageSize, total);
  return `${start}–${end} / ${total.toLocaleString('hu-HU')} találat`;
});

const visiblePageNumbers = computed(() => {
  const total = totalPages.value;
  const curr = currentPage.value;
  const pages: Array<number | '...'> = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  pages.push(1);
  if (curr > 3) pages.push('...');

  const start = Math.max(2, curr - 1);
  const end = Math.min(total - 1, curr + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (curr < total - 2) pages.push('...');
  pages.push(total);
  return pages;
});

// Tier List Groups
const tierLimits = ref<Record<string, number>>({ S: 24, A: 24, B: 24 });

const tierGroups = computed(() => {
  const definitions: Array<{
    tier: ProjectTier;
    title: string;
    subtitle: string;
    pillClass: string;
  }> = [
    {
      tier: 'S',
      title: 'S Tier — Kategóriagyőztesek',
      subtitle: 'Éles környezetben bizonyított, kiváló architektúrájú kiemelt magyar fejlesztések.',
      pillClass: 'bg-[#d93b00] text-white'
    },
    {
      tier: 'A',
      title: 'A Tier — Különösen ajánlott',
      subtitle: 'Stabil, átgondolt és aktívan fejlesztett hazai szoftverek és könyvtárak.',
      pillClass: 'bg-[#6a55fa] text-white'
    },
    {
      tier: 'B',
      title: 'B Tier — Ígéretes kezdeményezések',
      subtitle: 'Hasznos rétegproblémákat megoldó, feltörekvő nyílt forráskódú eszközök.',
      pillClass: 'bg-[#00565b] text-white'
    }
  ];

  return definitions.map((def) => ({
    ...def,
    items: filteredProjects.value.filter((p) => (p.tier || 'A') === def.tier)
  }));
});

const top10Projects = computed(() => {
  return [...filteredProjects.value]
    .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999))
    .slice(0, 10);
});

// Curated Collections Cards (HubSpot "Browse Theme Collections")
const curatedCollections = [
  {
    id: 'tier-s',
    title: 'S Tier — Legjobb magyar projektek',
    description:
      'A szerkesztőség által legmagasabbra értékelt, bizonyított hazai nyílt forráskódú alkalmazások.',
    actionText: 'S Tier megtekintése'
  },
  {
    id: 'top-10',
    title: 'Top 10 Közösségi Kedvenc',
    description:
      'A legaktívabb és legnépszerűbb magyar fejlesztői szoftverek válogatott toplistája.',
    actionText: 'Top 10 megnyitása'
  },
  {
    id: 'infra-ai',
    title: 'AI, DevOps & Rendszer Eszközök',
    description:
      'Önhosztolt infrastruktúra, Docker menedzserek és modern mesterséges intelligencia integrációk.',
    actionText: 'Kategóriák szűrése'
  }
];

function applyCollectionPreset(id: string) {
  handleResetFilters();
  activeView.value = 'explore';
  if (id === 'tier-s') {
    selectedTiers.value = ['S'];
  } else if (id === 'top-10') {
    onlyTop10.value = true;
  } else if (id === 'infra-ai') {
    selectedCategories.value = ['Infrastruktúra & DevOps', 'Mesterséges intelligencia & NLP'];
  }
  resultsTopRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function scrollToCollections() {
  collectionsRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  resultsTopRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleCategory(cat: string) {
  const idx = selectedCategories.value.indexOf(cat);
  if (idx >= 0) {
    selectedCategories.value.splice(idx, 1);
  } else {
    selectedCategories.value.push(cat);
  }
}

function selectSingleCategoryFromFooter(cat: string) {
  handleResetFilters();
  activeView.value = 'explore';
  selectedCategories.value = [cat];
  resultsTopRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleTier(tier: ProjectTier) {
  const idx = selectedTiers.value.indexOf(tier);
  if (idx >= 0) {
    selectedTiers.value.splice(idx, 1);
  } else {
    selectedTiers.value.push(tier);
  }
}

function toggleTag(tag: string) {
  const idx = selectedTags.value.findIndex((t) => t.toLowerCase() === tag.toLowerCase());
  if (idx >= 0) {
    selectedTags.value.splice(idx, 1);
  } else {
    selectedTags.value.push(tag);
  }
}

function handleResetFilters() {
  searchQuery.value = '';
  selectedCategories.value = [];
  selectedTiers.value = [];
  selectedTags.value = [];
  onlyWithDemo.value = false;
  onlyTop10.value = false;
  onlyWithImage.value = false;
  currentPage.value = 1;
}

async function loadDirectory() {
  if (projects.value.length === 0) {
    isLoading.value = true;
  }
  loadError.value = null;

  try {
    const remote = await fetchProjects();
    if (remote.length > 0) {
      projects.value = remote;
    }
  } catch (err) {
    if (projects.value.length === 0) {
      loadError.value =
        err instanceof Error ? err.message : 'Nem sikerült betölteni a projekteket.';
    }
  } finally {
    isLoading.value = false;
  }
}

function handleOpenSubmitModal() {
  submissionModalRef.value?.openModal();
}

function handleProjectCreated(newProject: ProjectRecord) {
  projects.value = [newProject, ...projects.value];
  toastMessage.value = `A(z) „${newProject.name}” projekt sikeresen bekerült a piactérre!`;
  setTimeout(() => {
    toastMessage.value = null;
  }, 6000);
}

function openProjectDetails(project: ProjectRecord) {
  selectedProject.value = project;
  activeGalleryImage.value = project.imageUrl || '';
  showTakedownDrawer.value = false;
  takedownFeedback.value = null;
  requesterContact.value = '';
  takedownReason.value = '';
  detailsDialogRef.value?.showModal();
}

function closeProjectDetails() {
  detailsDialogRef.value?.close();
}

async function handleDetailTakedownSubmit() {
  if (!selectedProject.value || isSubmittingTakedown.value) return;
  isSubmittingTakedown.value = true;
  takedownFeedback.value = null;

  try {
    const res = await submitTakedownNotice(selectedProject.value.id, {
      requesterContact: requesterContact.value.trim(),
      reason: takedownReason.value.trim()
    });
    takedownFeedback.value = {
      type: 'success',
      message: res.message
    };
    requesterContact.value = '';
    takedownReason.value = '';
  } catch (err) {
    takedownFeedback.value = {
      type: 'error',
      message: err instanceof Error ? err.message : 'Nem sikerült rögzíteni a kérelmet.'
    };
  } finally {
    isSubmittingTakedown.value = false;
  }
}

onMounted(() => {
  loadDirectory();

  if (heroSearchContainerRef.value && 'IntersectionObserver' in window) {
    heroObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        showStickySearch.value = entry ? !entry.isIntersecting : false;
      },
      { threshold: 0, rootMargin: '-70px 0px 0px 0px' }
    );
    heroObserver.observe(heroSearchContainerRef.value);
  }

  const dialog = detailsDialogRef.value;
  if (dialog && !('closedBy' in HTMLDialogElement.prototype)) {
    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      return (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      );
    };

    dialog.addEventListener('pointerdown', (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    });
    dialog.addEventListener('pointerup', (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
    });
  }
});

onBeforeUnmount(() => {
  heroObserver?.disconnect();
});
</script>

<template>
  <div id="top" class="flex min-h-screen flex-col bg-[#f0f2f5] text-[#213343]">
    <!-- Top Sticky Navigation Header (transforms into Sticky Search on Scroll) -->
    <Header
      v-model:active-view="activeView"
      v-model:search-query="searchQuery"
      :total-projects="projects.length"
      :show-sticky-search="showStickySearch"
      @open-submit-modal="handleOpenSubmitModal"
      @jump-to-collections="scrollToCollections"
    />

    <!-- ================================================================== -->
    <!-- HERO & CAPSULE CATEGORY TABS (Crisp White Marketplace Surface)     -->
    <!-- ================================================================== -->
    <section class="border-b border-[#dbe4ed] bg-white">
      <div class="mx-auto max-w-[1280px] px-4 pt-5 sm:px-6 lg:px-8">
        <!-- Breadcrumb Trail -->
        <nav aria-label="Morzsa navigáció" class="flex items-center gap-1.5 text-xs text-[#516f90]">
          <a href="#top" class="hover:text-[#00565b] hover:underline" @click.prevent="handleResetFilters">
            Piactér
          </a>
          <span aria-hidden="true">&rsaquo;</span>
          <span>Szoftver Katalógus</span>
          <span aria-hidden="true">&rsaquo;</span>
          <span class="font-semibold text-[#213343]">Magyar Projektek</span>
        </nav>

        <!-- Centered HubSpot-Style Marketplace Hero -->
        <div class="mx-auto max-w-3xl pb-10 pt-8 text-center sm:pt-10">
          <h1
            class="font-display font-bold tracking-tight text-[#213343]"
            style="font-size: clamp(1.85rem, 1.35rem + 2.1vw, 2.5rem);"
          >
            StrataHu Szoftver Piactér
          </h1>
          <p class="mx-auto mt-2.5 max-w-[60ch] text-base text-[#516f90] sm:text-lg">
            Találd meg mindazt, amire a fejlesztői projektednek vagy csapatodnak szüksége van
          </p>

          <!-- Giant Pill Search Bar -->
          <div ref="heroSearchContainerRef" class="mx-auto mt-7 max-w-[680px]">
            <search aria-label="Piactér keresés">
              <form class="relative" @submit.prevent>
                <label for="marketplace-hero-search" class="visually-hidden">
                  Keresés név, leírás, készítő vagy technológia alapján
                </label>
                <input
                  id="marketplace-hero-search"
                  v-model="searchQuery"
                  type="search"
                  name="q"
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false"
                  enterkeyhint="search"
                  placeholder="Keresés projektek, könyvtárak vagy technológiák között..."
                  class="min-h-[50px] w-full rounded-full border border-[#cbd6e2] bg-white pl-6 pr-14 text-sm text-[#213343] placeholder-[#7c98b6] shadow-2xs transition-colors focus:border-[#00565b] focus:shadow-sm"
                />
                <span
                  class="pointer-events-none absolute inset-y-0 right-5 flex items-center text-[#516f90]"
                  aria-hidden="true"
                >
                  <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1">
                    <circle cx="11" cy="11" r="8" />
                    <path stroke-linecap="round" d="m21 21-4.3-4.3" />
                  </svg>
                </span>
              </form>
            </search>
          </div>
        </div>
      </div>

      <!-- Centered Capsule Switcher Tabs (matching HubSpot's "Themes | Modules" row) -->
      <div class="border-t border-[#edf1f5] bg-white">
        <div class="mx-auto flex max-w-[1280px] items-center justify-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <div
            role="tablist"
            aria-label="Piactér nézetek"
            class="inline-flex flex-wrap items-center justify-center gap-1.5"
          >
            <button
              type="button"
              role="tab"
              :aria-selected="activeView === 'explore'"
              class="min-h-[38px] cursor-pointer rounded-full px-5 py-1.5 text-sm font-semibold transition-all active:scale-[0.98]"
              :class="
                activeView === 'explore'
                  ? 'border border-[#cbd6e2] bg-white text-[#213343] shadow-2xs'
                  : 'text-[#516f90] hover:bg-[#f5f8fa] hover:text-[#213343]'
              "
              @click="activeView = 'explore'"
            >
              Projektek ({{ projects.length }})
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="activeView === 'tierlist'"
              class="min-h-[38px] cursor-pointer rounded-full px-5 py-1.5 text-sm font-semibold transition-all active:scale-[0.98]"
              :class="
                activeView === 'tierlist'
                  ? 'border border-[#cbd6e2] bg-white text-[#213343] shadow-2xs'
                  : 'text-[#516f90] hover:bg-[#f5f8fa] hover:text-[#213343]'
              "
              @click="activeView = 'tierlist'"
            >
              Tier List (S / A / B)
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="activeView === 'top10'"
              class="min-h-[38px] cursor-pointer rounded-full px-5 py-1.5 text-sm font-semibold transition-all active:scale-[0.98]"
              :class="
                activeView === 'top10'
                  ? 'border border-[#cbd6e2] bg-white text-[#213343] shadow-2xs'
                  : 'text-[#516f90] hover:bg-[#f5f8fa] hover:text-[#213343]'
              "
              @click="activeView = 'top10'"
            >
              Top 10 Ranglista
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="activeView === 'incubator'"
              class="min-h-[38px] cursor-pointer rounded-full px-5 py-1.5 text-sm font-semibold transition-all active:scale-[0.98]"
              :class="
                activeView === 'incubator'
                  ? 'border border-[#cbd6e2] bg-white text-[#d93b00] shadow-2xs'
                  : 'text-[#516f90] hover:bg-[#f5f8fa] hover:text-[#d93b00]'
              "
              @click="activeView = 'incubator'"
            >
              Alapítás &amp; Inkubátor
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ================================================================== -->
    <!-- MAIN MARKETPLACE TWO-COLUMN BODY                                   -->
    <!-- ================================================================== -->
    <main
      id="marketplace-main"
      class="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-6 lg:px-8"
    >
      <!-- Confirmation Toast Banner -->
      <div
        v-if="toastMessage"
        role="status"
        aria-live="polite"
        class="mb-6 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-3.5 text-sm font-medium text-emerald-900"
      >
        <span>{{ toastMessage }}</span>
        <button
          type="button"
          class="cursor-pointer rounded-full bg-emerald-600 px-3.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
          @click="toastMessage = null"
        >
          Rendben
        </button>
      </div>

      <IncubatorLaunchpad v-if="activeView === 'incubator'" />

      <div v-else class="flex flex-col items-start gap-7 lg:flex-row lg:gap-8">
        <!-- LEFT SIDEBAR: Collapsible Faceted Filters -->
        <FilterSidebar
          :categories="categoryFacets"
          :selected-categories="selectedCategories"
          :selected-tiers="selectedTiers"
          :tags="tagFacets"
          :selected-tags="selectedTags"
          v-model:only-with-demo="onlyWithDemo"
          v-model:only-top-10="onlyTop10"
          v-model:only-with-image="onlyWithImage"
          :active-filter-count="activeFilterCount"
          @toggle-category="toggleCategory"
          @toggle-tier="toggleTier"
          @toggle-tag="toggleTag"
          @reset-filters="handleResetFilters"
        />

        <!-- RIGHT CONTENT AREA -->
        <div class="min-w-0 flex-1">
          <!-- Promo Alert Banner (mirrors HubSpot "Build your next website today!" white banner) -->
          <div
            class="mb-7 flex flex-col justify-between gap-4 rounded-xl border border-[#dbe4ed] bg-white p-5 shadow-2xs sm:flex-row sm:items-center sm:p-6"
          >
            <div>
              <h2 class="font-display text-base font-bold text-[#213343]">
                Mutasd be a következő szoftvered a magyar fejlesztőknek még ma!
              </h2>
              <p class="mt-1 text-sm text-[#516f90]">
                Ingyenes katalógus-megjelenés, GitHub alapú közösségi hitelesítés és azonnali szakmai visszajelzés Discordon.
              </p>
            </div>
            <div class="flex shrink-0 flex-wrap items-center gap-2.5">
              <button
                type="button"
                class="inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-full border border-[#d93b00] bg-white px-4 py-2 text-xs font-semibold text-[#d93b00] transition-all hover:bg-[#fff5f2] active:scale-[0.98]"
                @click="activeView = 'incubator'"
              >
                Alapítás &amp; Inkubátor &rarr;
              </button>
              <a
                href="https://discord.gg/kNt5sqzM6w"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex min-h-[40px] items-center justify-center rounded-full bg-[#00565b] px-5 py-2 text-xs font-semibold text-white transition-all hover:bg-[#004246] active:scale-[0.98]"
              >
                Csatlakozás a Discordra
              </a>
            </div>
          </div>

          <!-- Section Header Title -->
          <div ref="resultsTopRef" class="scroll-mt-24">
            <h2 class="font-display text-2xl font-bold tracking-tight text-[#213343] sm:text-[28px]">
              {{
                activeView === 'explore'
                  ? 'A legjobb magyar alkalmazások és nyílt forráskódú eszközök'
                  : activeView === 'tierlist'
                    ? 'Kurátori Magyar Szoftver Tier List'
                    : 'Top 10 Kiemelt Magyar Fejlesztés'
              }}
            </h2>
            <p class="mt-1.5 max-w-[65ch] text-sm text-[#516f90] sm:text-base">
              {{
                activeView === 'explore'
                  ? 'Válassz professzionális nyílt forráskódú könyvtárak, webes platformok és fejlesztői megoldások közül.'
                  : activeView === 'tierlist'
                    ? 'Technikai kiforrottság, dokumentáció és gyakorlati hasznosság alapján S, A és B kategóriába sorolt projektek.'
                    : 'A StrataHu közösségének és szerkesztőségének legkiemelkedőbb 10 hazai projektje.'
              }}
            </p>
          </div>

          <!-- Results Controls Bar (Count + List/Grid Segmented Toggle + Sort Dropdown) -->
          <div
            class="my-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#dbe4ed] pb-4"
          >
            <div class="text-sm font-medium text-[#33475b]">
              {{ resultRangeLabel }}
            </div>

            <div class="flex flex-wrap items-center gap-3 sm:gap-4">
              <!-- List / Grid Segmented Toggle (only shown in Explore mode) -->
              <div
                v-if="activeView === 'explore'"
                role="group"
                aria-label="Nézet elrendezés"
                class="inline-flex items-center rounded-full border border-[#cbd6e2] bg-white p-0.5 shadow-2xs"
              >
                <button
                  type="button"
                  aria-label="Lista nézet"
                  :aria-pressed="viewMode === 'list'"
                  class="flex h-8 w-9 cursor-pointer items-center justify-center rounded-full transition-colors"
                  :class="
                    viewMode === 'list'
                      ? 'bg-[#eaf0f6] text-[#213343]'
                      : 'text-[#516f90] hover:text-[#213343]'
                  "
                  @click="viewMode = 'list'"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Rács nézet"
                  :aria-pressed="viewMode === 'grid'"
                  class="flex h-8 w-9 cursor-pointer items-center justify-center rounded-full transition-colors"
                  :class="
                    viewMode === 'grid'
                      ? 'bg-[#eaf0f6] text-[#213343]'
                      : 'text-[#516f90] hover:text-[#213343]'
                  "
                  @click="viewMode = 'grid'"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                </button>
              </div>

              <!-- Sort Dropdown -->
              <div class="flex items-center gap-2 text-xs">
                <label for="marketplace-sort" class="font-medium text-[#516f90]">
                  Rendezés:
                </label>
                <select
                  id="marketplace-sort"
                  v-model="sortBy"
                  class="min-h-[36px] cursor-pointer rounded-full border border-[#cbd6e2] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#213343] focus:border-[#00565b]"
                >
                  <option value="popular">Legnépszerűbb / Rangsor</option>
                  <option value="tier">Tier besorolás (S &rarr; B)</option>
                  <option value="name">Név szerint (A–Z)</option>
                  <option value="newest">Legújabb beküldések</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Active Filter Chips Strip -->
          <div v-if="activeFilterCount > 0" class="mb-5 flex flex-wrap items-center gap-2">
            <button
              v-for="cat in selectedCategories"
              :key="'c-' + cat"
              type="button"
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#eaf0f6] px-3 py-1 text-xs font-medium text-[#213343] hover:bg-[#dce5ef]"
              @click="toggleCategory(cat)"
            >
              <span>{{ cat }}</span>
              <span aria-hidden="true">&times;</span>
            </button>
            <button
              v-for="t in selectedTiers"
              :key="'t-' + t"
              type="button"
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#eaf0f6] px-3 py-1 text-xs font-medium text-[#213343] hover:bg-[#dce5ef]"
              @click="toggleTier(t)"
            >
              <span>{{ t }} Tier</span>
              <span aria-hidden="true">&times;</span>
            </button>
            <button
              v-for="tag in selectedTags"
              :key="'tag-' + tag"
              type="button"
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#00565b]/10 px-3 py-1 text-xs font-medium text-[#00565b] hover:bg-[#00565b]/20"
              @click="toggleTag(tag)"
            >
              <span>{{ tag }}</span>
              <span aria-hidden="true">&times;</span>
            </button>
            <button
              type="button"
              class="cursor-pointer px-2 py-1 text-xs font-semibold text-[#d93b00] hover:underline"
              @click="handleResetFilters"
            >
              Szűrők törlése
            </button>
          </div>

          <!-- Loading Skeleton -->
          <div v-if="isLoading" class="space-y-4" aria-busy="true" aria-label="Projektek betöltése">
            <div
              v-for="n in 4"
              :key="n"
              class="flex flex-col gap-5 rounded-2xl border border-[#dbe4ed] bg-white p-6 md:flex-row"
            >
              <div class="aspect-[16/10] w-full animate-pulse rounded-xl bg-[#eaf0f6] md:w-[236px]"></div>
              <div class="flex-1 space-y-3">
                <div class="h-5 w-1/3 animate-pulse rounded bg-[#eaf0f6]"></div>
                <div class="h-4 w-1/5 animate-pulse rounded bg-[#f5f8fa]"></div>
                <div class="h-14 w-full animate-pulse rounded bg-[#f5f8fa]"></div>
              </div>
            </div>
          </div>

          <!-- Error State -->
          <div
            v-else-if="loadError"
            role="alert"
            class="rounded-2xl border border-rose-300 bg-white p-8 text-center"
          >
            <p class="text-base font-semibold text-rose-700">{{ loadError }}</p>
            <button
              type="button"
              class="mt-4 cursor-pointer rounded-full bg-[#00565b] px-5 py-2 text-xs font-semibold text-white hover:bg-[#004246]"
              @click="loadDirectory"
            >
              Újrapróbálkozás
            </button>
          </div>

          <!-- Empty State -->
          <div
            v-else-if="filteredProjects.length === 0"
            class="rounded-2xl border border-[#dbe4ed] bg-white p-12 text-center shadow-2xs"
          >
            <h3 class="font-display text-lg font-bold text-[#213343]">
              Nincs a szűrésnek megfelelő projekt
            </h3>
            <p class="mx-auto mt-2 max-w-md text-sm text-[#516f90]">
              Próbálj más keresőszót választani, vagy állítsd alaphelyzetbe a kategória- és technológiaszűrőket.
            </p>
            <div class="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                class="min-h-[40px] cursor-pointer rounded-full border border-[#7c98b6] bg-white px-5 py-2 text-xs font-semibold text-[#33475b] hover:bg-[#f5f8fa]"
                @click="handleResetFilters"
              >
                Szűrők visszaállítása
              </button>
              <button
                type="button"
                class="min-h-[40px] cursor-pointer rounded-full bg-[#d93b00] px-5 py-2 text-xs font-semibold text-white hover:bg-[#b83200]"
                @click="handleOpenSubmitModal"
              >
                + Új projekt beküldése
              </button>
            </div>
          </div>

          <!-- ============================================================== -->
          <!-- VIEW 1: EXPLORE MARKETPLACE (List / Grid Cards + Pagination)   -->
          <!-- ============================================================== -->
          <template v-else-if="activeView === 'explore'">
            <div
              :class="
                viewMode === 'list'
                  ? 'space-y-4'
                  : 'grid grid-cols-1 gap-6 md:grid-cols-2'
              "
            >
              <ProjectCard
                v-for="(project, idx) in paginatedProjects"
                :key="project.id"
                :project="project"
                :selected-tags="selectedTags"
                :view-mode="viewMode"
                :priority-load="idx < 2"
                @toggle-tag="toggleTag"
                @open-details="openProjectDetails"
              />
            </div>

            <!-- HubSpot-Style Numbered Pagination -->
            <nav
              v-if="totalPages > 1"
              aria-label="Oldalszámozás"
              class="mt-10 flex flex-wrap items-center justify-center gap-2"
            >
              <button
                type="button"
                :disabled="currentPage <= 1"
                class="inline-flex min-h-[36px] cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-[#516f90] transition-colors hover:bg-white hover:text-[#213343] disabled:cursor-not-allowed disabled:opacity-40"
                @click="goToPage(currentPage - 1)"
              >
                <span>&lsaquo; Előző</span>
              </button>

              <template v-for="(page, idx) in visiblePageNumbers" :key="idx">
                <span v-if="page === '...'" class="px-1.5 text-xs text-[#7c98b6]">...</span>
                <button
                  v-else
                  type="button"
                  :aria-current="page === currentPage ? 'page' : undefined"
                  class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-xs font-semibold transition-all"
                  :class="
                    page === currentPage
                      ? 'border-2 border-[#00565b] bg-white text-[#213343] shadow-2xs'
                      : 'text-[#516f90] hover:bg-white hover:text-[#213343]'
                  "
                  @click="goToPage(page)"
                >
                  {{ page }}
                </button>
              </template>

              <button
                type="button"
                :disabled="currentPage >= totalPages"
                class="inline-flex min-h-[36px] cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-[#00565b] transition-colors hover:bg-white hover:text-[#004246] disabled:cursor-not-allowed disabled:opacity-40"
                @click="goToPage(currentPage + 1)"
              >
                <span>Következő &rsaquo;</span>
              </button>
            </nav>
          </template>

          <!-- ============================================================== -->
          <!-- VIEW 2: CURATED TIER LIST (S / A / B)                          -->
          <!-- ============================================================== -->
          <section
            v-else-if="activeView === 'tierlist'"
            aria-label="Magyar Szoftver Tier List"
            class="space-y-7"
          >
            <div
              v-for="group in tierGroups"
              :key="group.tier"
              class="rounded-2xl border border-[#dbe4ed] bg-white p-6 shadow-2xs"
            >
              <div class="flex flex-col gap-3 border-b border-[#edf1f5] pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex items-center gap-3.5">
                  <span
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold"
                    :class="group.pillClass"
                  >
                    {{ group.tier }}
                  </span>
                  <div>
                    <h3 class="font-display text-lg font-bold text-[#213343]">
                      {{ group.title }}
                    </h3>
                    <p class="text-xs text-[#516f90] sm:text-sm">{{ group.subtitle }}</p>
                  </div>
                </div>
                <span class="self-start rounded-full bg-[#f5f8fa] px-3 py-1 text-xs font-semibold text-[#516f90] sm:self-center">
                  {{ group.items.length }} projekt
                </span>
              </div>

              <div v-if="group.items.length > 0" class="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                <ProjectCard
                  v-for="project in group.items.slice(0, tierLimits[group.tier] ?? 24)"
                  :key="project.id"
                  :project="project"
                  :selected-tags="selectedTags"
                  view-mode="grid"
                  @toggle-tag="toggleTag"
                  @open-details="openProjectDetails"
                />
              </div>

              <div
                v-if="group.items.length > (tierLimits[group.tier] ?? 24)"
                class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f5] pt-4"
              >
                <span class="text-xs font-medium text-[#516f90]">
                  Megjelenítve: {{ Math.min(tierLimits[group.tier] ?? 24, group.items.length) }} / {{ group.items.length }}
                </span>
                <button
                  type="button"
                  class="min-h-[36px] cursor-pointer rounded-full border border-[#cbd6e2] bg-white px-4 py-1.5 text-xs font-semibold text-[#00565b] hover:bg-[#f5f8fa]"
                  @click="tierLimits[group.tier] = (tierLimits[group.tier] ?? 24) + 24"
                >
                  További 24 betöltése &darr;
                </button>
              </div>
              <p v-else-if="group.items.length === 0" class="mt-4 text-xs text-[#7c98b6]">
                Ebben a kategóriában nincs a szűrésnek megfelelő projekt.
              </p>
            </div>
          </section>

          <!-- ============================================================== -->
          <!-- VIEW 3: TOP 10 RANKED                                          -->
          <!-- ============================================================== -->
          <section
            v-else-if="activeView === 'top10'"
            aria-label="Top 10 Magyar Szoftver Ranglista"
            class="space-y-4"
          >
            <ProjectCard
              v-for="(project, idx) in top10Projects"
              :key="project.id"
              :project="project"
              :selected-tags="selectedTags"
              view-mode="list"
              :priority-load="idx < 2"
              @toggle-tag="toggleTag"
              @open-details="openProjectDetails"
            />
          </section>
        </div>
      </div>
    </main>

    <!-- ================================================================== -->
    <!-- FEATURED COLLECTIONS SECTION ("Browse Theme Collections")          -->
    <!-- ================================================================== -->
    <section
      ref="collectionsRef"
      aria-label="Válogatott gyűjtemények"
      class="deferred-section border-t border-[#dbe4ed] bg-white py-14"
    >
      <div class="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 class="font-display text-2xl font-bold tracking-tight text-[#213343] sm:text-3xl">
              Böngéssz a válogatott gyűjtemények között
            </h2>
            <p class="mt-1.5 text-sm text-[#516f90] sm:text-base">
              Szerkesztőségi listák és gyors szűrőcsomagok, hogy azonnal megtaláld a megfelelő magyar szoftvert.
            </p>
          </div>
          <button
            type="button"
            class="cursor-pointer self-start text-sm font-semibold text-[#00565b] hover:underline sm:self-end"
            @click="applyCollectionPreset('all')"
          >
            Összes projekt mutatása &rarr;
          </button>
        </div>

        <div class="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div
            v-for="col in curatedCollections"
            :key="col.id"
            class="group flex flex-col justify-between rounded-2xl border border-[#dbe4ed] bg-white p-6 shadow-2xs transition-all hover:border-[#00565b]/40 hover:shadow-md"
          >
            <div>
              <div class="flex items-start justify-between gap-3">
                <h3 class="font-display text-lg font-bold text-[#213343] group-hover:text-[#00565b]">
                  {{ col.title }}
                </h3>
                <!-- HubSpot Collection Vivid Blue Badge -->
                <span class="shrink-0 rounded-full bg-[#0066cc] px-3 py-0.5 text-[11px] font-bold text-white">
                  Gyűjtemény
                </span>
              </div>
              <p class="mt-3 text-sm leading-relaxed text-[#516f90]">
                {{ col.description }}
              </p>
            </div>

            <div class="mt-6 pt-3">
              <button
                type="button"
                class="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 text-xs font-bold text-[#00565b] transition-colors hover:text-[#004246] hover:underline"
                @click="applyCollectionPreset(col.id)"
              >
                <span>{{ col.actionText }}</span>
                <span aria-hidden="true">&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ================================================================== -->
    <!-- PROJECT DETAILS ("RÉSZLETEK") MODAL DIALOG                         -->
    <!-- ================================================================== -->
    <dialog
      ref="detailsDialogRef"
      v-bind="{ closedby: 'any' }"
      aria-labelledby="project-details-title"
      class="m-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-[#dbe4ed] bg-white p-0 text-[#213343] shadow-2xl"
    >
      <div v-if="selectedProject">
        <!-- Showcase Cover Banner -->
        <div class="relative aspect-[16/9] w-full bg-[#f5f8fa]">
          <img
            v-if="activeGalleryImage || selectedProject.imageUrl"
            :src="activeGalleryImage || selectedProject.imageUrl!"
            :alt="`${selectedProject.name} részletes előnézet`"
            width="800"
            height="500"
            fetchpriority="low"
            class="h-full w-full bg-[#eaf0f6] object-contain"
          />
          <div
            v-else
            class="flex h-full w-full flex-col justify-between bg-gradient-to-br from-[#213343] via-[#2b4257] to-[#00565b] p-8 text-white"
          >
            <div class="flex items-center justify-between">
              <span class="rounded-full bg-white/15 px-3.5 py-1 text-xs font-semibold">
                {{ selectedProject.category || 'Magyar projekt' }}
              </span>
              <span class="font-mono text-xs text-white/80">
                {{ selectedProject.techStack.join(' • ') }}
              </span>
            </div>
            <div>
              <h3 class="font-display text-3xl font-bold text-white">
                {{ selectedProject.name }}
              </h3>
              <p class="mt-2 max-w-xl text-sm text-white/85">
                {{ selectedProject.description }}
              </p>
            </div>
            <div class="font-mono text-xs text-white/75">
              {{ selectedProject.authorHandle }}
            </div>
          </div>

          <button
            type="button"
            aria-label="Részletek ablak bezárása"
            class="absolute right-4 top-4 min-h-[36px] cursor-pointer rounded-full border border-[#cbd6e2] bg-white/95 px-4 py-1.5 text-xs font-semibold text-[#213343] shadow-sm backdrop-blur-md transition-colors hover:bg-white"
            @click="closeProjectDetails"
          >
            Bezárás (ESC)
          </button>
        </div>

        <!-- Thumbnail Gallery Strip -->
        <div
          v-if="selectedProject.galleryImages && selectedProject.galleryImages.length > 1"
          class="flex items-center gap-2.5 overflow-x-auto border-b border-[#edf1f5] bg-[#f8fafc] px-6 py-3"
        >
          <span class="shrink-0 text-xs font-semibold text-[#516f90]">Képernyőképek:</span>
          <button
            v-for="(shot, i) in selectedProject.galleryImages"
            :key="shot"
            type="button"
            class="h-12 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg border transition-all"
            :class="
              activeGalleryImage === shot
                ? 'border-[#00565b] ring-2 ring-[#00565b]/30'
                : 'border-[#cbd6e2] opacity-70 hover:opacity-100'
            "
            @click="activeGalleryImage = shot"
          >
            <img
              :src="shot"
              :alt="`${selectedProject.name} képernyőkép ${i + 1}`"
              loading="lazy"
              class="h-full w-full object-cover"
            />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="space-y-6 p-6 sm:p-8">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full bg-[#6a55fa] px-3 py-0.5 text-xs font-semibold text-white">
                  {{ selectedProject.category || 'Magyar fejlesztés' }}
                </span>
                <span
                  v-if="selectedProject.tier"
                  class="rounded-full bg-[#d93b00] px-3 py-0.5 text-xs font-bold text-white"
                >
                  {{ selectedProject.tier }} Tier
                </span>
                <span
                  v-if="selectedProject.rank"
                  class="rounded-full bg-[#eaf0f6] px-3 py-0.5 text-xs font-bold text-[#213343]"
                >
                  Top #{{ selectedProject.rank }}
                </span>
              </div>

              <h2 id="project-details-title" class="font-display mt-3 text-2xl font-bold text-[#213343] sm:text-3xl">
                {{ selectedProject.name }}
              </h2>
              <p class="mt-1 text-sm text-[#516f90]">
                Készítő: <strong class="font-semibold text-[#213343]">{{ selectedProject.authorHandle }}</strong>
              </p>
            </div>

            <!-- External CTAs -->
            <div class="flex flex-wrap items-center gap-2.5">
              <a
                :href="selectedProject.repositoryUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[#7c98b6] bg-white px-4 py-2 text-xs font-semibold text-[#33475b] transition-colors hover:bg-[#f5f8fa] hover:text-[#213343]"
              >
                GitHub Forráskód
              </a>

              <a
                v-if="selectedProject.liveDemoUrl"
                :href="selectedProject.liveDemoUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-[#00565b] px-5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-[#004246]"
              >
                Élő demó megnyitása
              </a>
            </div>
          </div>

          <!-- Editorial Verdict Box -->
          <div
            v-if="selectedProject.verdict"
            class="rounded-xl border border-[#00565b]/20 bg-[#f0f7f7] p-4"
          >
            <div class="text-xs font-bold uppercase tracking-wider text-[#00565b]">
              Szerkesztői értékelés
            </div>
            <p class="mt-1 text-sm font-medium text-[#213343]">
              {{ selectedProject.verdict }}
            </p>
          </div>

          <!-- Detailed Overview -->
          <div class="space-y-2">
            <h3 class="font-display text-sm font-bold text-[#213343]">A projektről részletesen</h3>
            <p class="text-sm leading-relaxed text-[#33475b]">
              {{ selectedProject.longDescription || selectedProject.description }}
            </p>
          </div>

          <!-- Highlights -->
          <div v-if="selectedProject.highlights && selectedProject.highlights.length > 0" class="space-y-2">
            <h3 class="font-display text-sm font-bold text-[#213343]">Főbb erősségek és jellemzők</h3>
            <ul class="space-y-1.5">
              <li
                v-for="item in selectedProject.highlights"
                :key="item"
                class="flex items-start gap-2.5 text-sm text-[#33475b]"
              >
                <span class="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#00565b]" aria-hidden="true"></span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>

          <!-- Tech Stack -->
          <div class="space-y-2">
            <h3 class="text-xs font-bold uppercase tracking-wider text-[#516f90]">
              Technológiai stack
            </h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tag in selectedProject.techStack"
                :key="tag"
                class="rounded-full border border-[#dbe4ed] bg-[#f8fafc] px-3 py-1 text-xs font-medium text-[#33475b]"
              >
                {{ tag }}
              </span>
            </div>
          </div>

          <!-- Takedown / Moderation Section -->
          <div class="border-t border-[#edf1f5] pt-5">
            <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-[#516f90]">
              <span>Te vagy az alkotó, és módosítást vagy eltávolítást kérsz?</span>
              <div class="flex items-center gap-2">
                <a
                  :href="buildTakedownMailtoUrl(selectedProject)"
                  class="rounded-full border border-[#cbd6e2] bg-white px-3.5 py-1.5 text-xs font-medium text-[#33475b] hover:border-rose-400 hover:text-rose-700"
                >
                  E-mail küldése
                </a>
                <button
                  type="button"
                  class="cursor-pointer rounded-full border border-[#cbd6e2] bg-white px-3.5 py-1.5 text-xs font-medium text-[#33475b] hover:border-amber-500 hover:text-amber-700"
                  @click="showTakedownDrawer = !showTakedownDrawer"
                >
                  Eltávolítási űrlap
                </button>
              </div>
            </div>

            <form
              v-if="showTakedownDrawer"
              class="mt-4 space-y-3 rounded-xl border border-[#dbe4ed] bg-[#f8fafc] p-4"
              @submit.prevent="handleDetailTakedownSubmit"
            >
              <p class="text-xs text-[#33475b]">
                Eltávolítási kérelem rögzítése a(z) <strong>{{ selectedProject.name }}</strong> projekthez (24 órás végrehajtás):
              </p>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label for="detail-takedown-contact" class="block text-xs font-semibold text-[#213343]">
                    Elérhetőség (e-mail vagy GitHub) *
                  </label>
                  <input
                    id="detail-takedown-contact"
                    v-model="requesterContact"
                    type="text"
                    required
                    minlength="3"
                    maxlength="160"
                    placeholder="alkoto@pelda.hu"
                    class="mt-1 min-h-[38px] w-full rounded-lg border border-[#cbd6e2] bg-white px-3 py-1.5 text-xs text-[#213343]"
                  />
                </div>
                <div>
                  <label for="detail-takedown-reason" class="block text-xs font-semibold text-[#213343]">
                    Indoklás *
                  </label>
                  <input
                    id="detail-takedown-reason"
                    v-model="takedownReason"
                    type="text"
                    required
                    minlength="10"
                    maxlength="1500"
                    placeholder="A repository tulajdonosaként kérem a törlést..."
                    class="mt-1 min-h-[38px] w-full rounded-lg border border-[#cbd6e2] bg-white px-3 py-1.5 text-xs text-[#213343]"
                  />
                </div>
              </div>
              <div
                v-if="takedownFeedback"
                class="text-xs font-medium"
                :class="takedownFeedback.type === 'success' ? 'text-emerald-700' : 'text-rose-700'"
              >
                {{ takedownFeedback.message }}
              </div>
              <div class="flex justify-end">
                <button
                  type="submit"
                  :disabled="isSubmittingTakedown"
                  class="cursor-pointer rounded-full bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {{ isSubmittingTakedown ? 'Küldés...' : 'Kérelem beküldése' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </dialog>

    <!-- Project Submission Modal -->
    <SubmissionModal
      ref="submissionModalRef"
      @project-created="handleProjectCreated"
    />

    <!-- Global Dark Slate Footer -->
    <Footer
      @select-category="selectSingleCategoryFromFooter"
      @switch-view="activeView = $event"
      @open-submit-modal="handleOpenSubmitModal"
    />
  </div>
</template>
