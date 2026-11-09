<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Header, { type ActiveViewMode } from './components/Header.vue';
import SearchFilterBar from './components/SearchFilterBar.vue';
import ProjectCard from './components/ProjectCard.vue';
import SubmissionModal from './components/SubmissionModal.vue';
import Footer from './components/Footer.vue';
import {
  buildTakedownMailtoUrl,
  fetchProjects,
  submitTakedownNotice,
  type ProjectRecord,
  type ProjectTier
} from './services/api';

const projects = ref<ProjectRecord[]>([]);
const isLoading = ref(true);
const loadError = ref<string | null>(null);
const toastMessage = ref<string | null>(null);

const activeView = ref<ActiveViewMode>('explore');
const searchQuery = ref('');
const selectedCategory = ref('');
const selectedTag = ref('');

const submissionModalRef = ref<InstanceType<typeof SubmissionModal> | null>(null);

// Project Details ("Tovább") Modal State
const detailsDialogRef = ref<HTMLDialogElement | null>(null);
const selectedProject = ref<ProjectRecord | null>(null);
const activeGalleryImage = ref<string>('');
const showTakedownDrawer = ref(false);
const requesterContact = ref('');
const takedownReason = ref('');
const isSubmittingTakedown = ref(false);
const takedownFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null);

const categories = computed(() => {
  const set = new Set<string>();
  for (const p of projects.value) {
    if (p.category) set.add(p.category);
  }
  return Array.from(set);
});

const availableTags = computed(() => {
  const tagCount = new Map<string, { tag: string; count: number }>();
  for (const project of projects.value) {
    for (const tag of project.techStack) {
      const key = tag.toLowerCase();
      const existing = tagCount.get(key);
      if (existing) {
        existing.count++;
      } else {
        tagCount.set(key, { tag, count: 1 });
      }
    }
  }
  return Array.from(tagCount.values())
    .sort((a, b) => b.count - a.count)
    .map((item) => item.tag);
});

const filteredProjects = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  const catFilter = selectedCategory.value.trim();
  const tagFilter = selectedTag.value.trim().toLowerCase();

  return projects.value.filter((project) => {
    if (catFilter && project.category !== catFilter) {
      return false;
    }

    if (tagFilter && !project.techStack.some((t) => t.toLowerCase() === tagFilter)) {
      return false;
    }

    if (!query) {
      return true;
    }

    const matchesName = project.name.toLowerCase().includes(query);
    const matchesDescription = project.description.toLowerCase().includes(query);
    const matchesAuthor = project.authorHandle.toLowerCase().includes(query);
    const matchesCategory = (project.category || '').toLowerCase().includes(query);
    const matchesStack = project.techStack.some((t) => t.toLowerCase().includes(query));

    return matchesName || matchesDescription || matchesAuthor || matchesCategory || matchesStack;
  });
});

const visibleExploreCount = ref(24);
const tierLimits = ref<Record<string, number>>({ S: 50, A: 30, B: 30 });

watch([searchQuery, selectedCategory, selectedTag], () => {
  visibleExploreCount.value = 24;
});

const visibleProjects = computed(() => {
  return filteredProjects.value.slice(0, visibleExploreCount.value);
});

// Tier List Groups (S, A, B) inspired by opinionated software curation
const tierGroups = computed(() => {
  const definitions: Array<{
    tier: ProjectTier;
    title: string;
    subtitle: string;
    badgeBg: string;
    borderAccent: string;
  }> = [
    {
      tier: 'S',
      title: 'S Tier — Kategóriagyőztesek',
      subtitle:
        'A saját területükön kiemelkedő, éles környezetben bizonyított, kiváló architektúrájú magyar projektek.',
      badgeBg: 'from-amber-400 to-orange-500 text-slate-950',
      borderAccent: 'border-amber-400/25'
    },
    {
      tier: 'A',
      title: 'A Tier — Különösen ajánlott',
      subtitle:
        'Stabil, átgondolt és aktívan fejlesztett hazai szoftverek, amelyeket bátran ajánlunk mindennapi használatra.',
      badgeBg: 'from-indigo-400 to-violet-500 text-white',
      borderAccent: 'border-indigo-400/25'
    },
    {
      tier: 'B',
      title: 'B Tier — Ígéretes kezdeményezések',
      subtitle:
        'Hasznos rétegproblémákat megoldó vagy gyorsan fejlődő nyílt forráskódú eszközök és könyvtárak.',
      badgeBg: 'from-emerald-400 to-teal-500 text-slate-950',
      borderAccent: 'border-emerald-400/25'
    }
  ];

  return definitions.map((def) => ({
    ...def,
    items: filteredProjects.value.filter((p) => (p.tier || 'A') === def.tier)
  }));
});

// Top 10 Ranked Projects
const top10Projects = computed(() => {
  return [...filteredProjects.value]
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .slice(0, 10);
});

async function loadDirectory() {
  isLoading.value = true;
  loadError.value = null;

  try {
    projects.value = await fetchProjects();
  } catch (err) {
    loadError.value =
      err instanceof Error ? err.message : 'Nem sikerült betölteni a projekteket.';
  } finally {
    isLoading.value = false;
  }
}

function handleOpenSubmitModal() {
  submissionModalRef.value?.openModal();
}

function handleProjectCreated(newProject: ProjectRecord) {
  projects.value = [newProject, ...projects.value];
  toastMessage.value = `A(z) „${newProject.name}” projekt sikeresen bekerült a gyűjteménybe!`;
  setTimeout(() => {
    toastMessage.value = null;
  }, 6000);
}

function handleSelectTag(tag: string) {
  selectedTag.value = selectedTag.value.toLowerCase() === tag.toLowerCase() ? '' : tag;
}

function handleResetFilters() {
  searchQuery.value = '';
  selectedCategory.value = '';
  selectedTag.value = '';
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
</script>

<template>
  <div id="top" class="flex min-h-screen flex-col bg-[#0b0d12] text-slate-100">
    <!-- Top Navigation Header -->
    <Header
      v-model:active-view="activeView"
      :total-projects="projects.length"
      @open-submit-modal="handleOpenSubmitModal"
    />

    <!-- Hero Intro Banner -->
    <section class="border-b border-white/[0.06] bg-gradient-to-b from-indigo-950/20 via-[#0b0d12] to-[#0b0d12] py-10 sm:py-12">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-2 rounded-full border border-indigo-400/25 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-300">
            <span>Magyar fejlesztések kurátori tárháza</span>
          </div>
          <h1 class="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            A legjobb hazai szoftverek és nyílt forráskódú projektek egy helyen.
          </h1>
          <p class="mt-3 text-base leading-relaxed text-slate-300 sm:text-lg">
            Válogatott magyar fejlesztői eszközök, könyvtárak és alkalmazások — őszinte szerkesztői
            értékelésekkel, <button type="button" class="cursor-pointer font-semibold text-indigo-300 underline decoration-indigo-400/40 underline-offset-4 hover:text-indigo-200" @click="activeView = 'tierlist'">Tier List</button> besorolással és
            <button type="button" class="cursor-pointer font-semibold text-indigo-300 underline decoration-indigo-400/40 underline-offset-4 hover:text-indigo-200" @click="activeView = 'top10'">Top 10</button> rangsorral.
          </p>

          <!-- Quick Action Links -->
          <div class="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition-all hover:bg-indigo-400 active:scale-[0.99]"
              @click="handleOpenSubmitModal"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
              </svg>
              <span>Projekt beküldése</span>
            </button>

            <a
              href="https://discord.gg/kNt5sqzM6w"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-sm font-semibold text-indigo-300 transition-all hover:border-indigo-400 hover:bg-indigo-500/20 hover:text-white"
            >
              <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              <span>Discord Közösség</span>
            </a>

            <a
              href="https://github.com/CsPS0/StrataHu"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-300 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub Repó</span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Search & Category Filter Bar -->
    <SearchFilterBar
      v-model:search-query="searchQuery"
      v-model:selected-category="selectedCategory"
      v-model:selected-tag="selectedTag"
      :categories="categories"
      :available-tags="availableTags"
      @reset-filters="handleResetFilters"
    />

    <!-- Main Content -->
    <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <!-- Confirmation Toast Banner -->
      <div
        v-if="toastMessage"
        role="status"
        aria-live="polite"
        class="mb-8 flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-950/40 px-5 py-3.5 text-sm text-emerald-200"
      >
        <span>{{ toastMessage }}</span>
        <button
          type="button"
          class="cursor-pointer rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-medium hover:bg-emerald-500/30"
          @click="toastMessage = null"
        >
          Rendben
        </button>
      </div>

      <!-- Loading Skeleton -->
      <div
        v-if="isLoading"
        class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        aria-busy="true"
        aria-label="Projektek betöltése"
      >
        <div
          v-for="n in 6"
          :key="n"
          class="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#131722]"
        >
          <div class="aspect-[16/10] w-full animate-pulse bg-white/[0.04]"></div>
          <div class="space-y-3 p-6">
            <div class="h-5 w-1/2 animate-pulse rounded-lg bg-white/[0.06]"></div>
            <div class="h-12 w-full animate-pulse rounded-lg bg-white/[0.04]"></div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="loadError"
        role="alert"
        class="rounded-2xl border border-rose-500/40 bg-[#141822] p-8 text-center"
      >
        <p class="text-base font-semibold text-rose-300">{{ loadError }}</p>
        <button
          type="button"
          class="mt-4 cursor-pointer rounded-xl bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-400"
          @click="loadDirectory"
        >
          Újrapróbálkozás
        </button>
      </div>

      <!-- Empty Filter State -->
      <div
        v-else-if="filteredProjects.length === 0"
        class="rounded-3xl border border-white/[0.08] bg-[#131722] p-12 text-center"
      >
        <h2 class="text-lg font-semibold text-white">Nincs a szűrésnek megfelelő projekt</h2>
        <p class="mt-2 text-sm text-slate-400">
          Próbálj más keresőszót választani, vagy töröld az aktív kategória- és technológiaszűrőket.
        </p>
        <div class="mt-6 flex justify-center gap-3">
          <button
            type="button"
            class="cursor-pointer rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10"
            @click="handleResetFilters"
          >
            Szűrők visszaállítása
          </button>
          <button
            type="button"
            class="cursor-pointer rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-400"
            @click="handleOpenSubmitModal"
          >
            Új projekt beküldése
          </button>
        </div>
      </div>

      <!-- ================================================================== -->
      <!-- VIEW 1: FELFEDEZÉS (Visual Showcase Cards Grid)                    -->
      <!-- ================================================================== -->
      <section
        v-else-if="activeView === 'explore'"
        aria-label="Magyar projektek kártyás áttekintése"
      >
        <div class="mb-6 flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold text-white">Projektbemutatók</h2>
            <p class="text-xs text-slate-400">
              Kattints bármelyik kártyán a „Tovább” gombra a részletes bemutatóhoz és értékeléshez.
            </p>
          </div>
          <span class="text-xs text-slate-400">{{ filteredProjects.length }} találat</span>
        </div>

        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <ProjectCard
            v-for="(project, idx) in visibleProjects"
            :key="project.id"
            :project="project"
            :selected-tag="selectedTag"
            :priority-load="idx < 2"
            @select-tag="handleSelectTag"
            @open-details="openProjectDetails"
          />
        </div>

        <!-- Pagination / Load More Bar for Explore View -->
        <div
          v-if="visibleProjects.length < filteredProjects.length"
          class="mt-10 flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.06] bg-[#121620] p-6 text-center"
        >
          <p class="text-xs font-medium text-slate-400">
            Megjelenítve: <span class="font-bold text-white">{{ visibleProjects.length }}</span> / {{ filteredProjects.length }} projekt
          </p>
          <div class="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              class="cursor-pointer rounded-xl bg-indigo-500 px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-indigo-400"
              @click="visibleExploreCount += 24"
            >
              További 24 projekt betöltése
            </button>
            <button
              type="button"
              class="cursor-pointer rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
              @click="visibleExploreCount = filteredProjects.length"
            >
              Összes megjelenítése ({{ filteredProjects.length }})
            </button>
          </div>
        </div>
      </section>

      <!-- ================================================================== -->
      <!-- VIEW 2: TIER LIST (S / A / B Curated Tier Board)                   -->
      <!-- ================================================================== -->
      <section
        v-else-if="activeView === 'tierlist'"
        aria-label="Magyar projektek Tier List besorolása"
        class="space-y-8"
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 class="text-2xl font-bold text-white">Magyar Szoftver Tier List</h2>
            <p class="mt-1 text-sm text-slate-400">
              Kurátori besorolás technikai kiforrottság, dokumentáció és gyakorlati hasznosság alapján.
            </p>
          </div>
        </div>

        <div
          v-for="group in tierGroups"
          :key="group.tier"
          class="overflow-hidden rounded-3xl border bg-[#121620] p-6 sm:p-7"
          :class="group.borderAccent"
        >
          <!-- Tier Header -->
          <div class="flex flex-col gap-3 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-4">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl font-extrabold shadow-md"
                :class="group.badgeBg"
              >
                {{ group.tier }}
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">{{ group.title }}</h3>
                <p class="text-xs text-slate-400 sm:text-sm">{{ group.subtitle }}</p>
              </div>
            </div>
            <span class="self-start rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-slate-300 sm:self-center">
              {{ group.items.length }} projekt
            </span>
          </div>

          <!-- Tier Cards Grid -->
          <div v-if="group.items.length > 0" class="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="project in group.items.slice(0, tierLimits[group.tier] ?? 30)"
              :key="project.id"
              class="group flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161b28] transition-all hover:border-white/[0.18]"
            >
              <div>
                <!-- Preview Image Header inside Tier Card -->
                <div
                  class="relative aspect-[16/9] w-full cursor-pointer overflow-hidden bg-[#0d1017]"
                  @click="openProjectDetails(project)"
                >
                  <img
                    v-if="project.imageUrl"
                    :src="project.imageUrl"
                    :alt="`${project.name} előnézet`"
                    width="800"
                    height="500"
                    decoding="async"
                    loading="lazy"
                    class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div
                    v-else
                    class="flex h-full w-full flex-col justify-between bg-gradient-to-br from-[#121622] via-[#0d1017] to-[#181d2a] p-4"
                  >
                    <div class="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{{ project.category }}</span>
                      <span class="font-mono text-indigo-400">{{ project.techStack[0] }}</span>
                    </div>
                    <p class="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">
                      {{ project.name }}
                    </p>
                    <div class="flex gap-1">
                      <span
                        v-for="t in project.techStack.slice(0, 2)"
                        :key="t"
                        class="rounded bg-white/[0.05] px-1.5 py-0.5 text-[9px] text-slate-300"
                      >
                        {{ t }}
                      </span>
                    </div>
                  </div>
                  <span class="absolute left-3 top-3 rounded-full bg-slate-950/75 px-2.5 py-0.5 text-[11px] font-medium text-slate-200 backdrop-blur-md">
                    {{ project.category }}
                  </span>
                </div>

                <!-- Content -->
                <div class="p-5">
                  <div class="flex items-center justify-between gap-2">
                    <h4 class="text-base font-bold text-white">{{ project.name }}</h4>
                    <span class="text-xs text-slate-400">{{ project.authorHandle }}</span>
                  </div>
                  <p v-if="project.verdict" class="mt-2 text-xs font-medium leading-relaxed text-indigo-200">
                    „{{ project.verdict }}”
                  </p>
                  <p class="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-400">
                    {{ project.description }}
                  </p>
                </div>
              </div>

              <div class="flex items-center justify-between border-t border-white/[0.06] px-5 py-3.5">
                <button
                  type="button"
                  class="cursor-pointer rounded-xl bg-white/[0.08] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
                  @click="openProjectDetails(project)"
                >
                  Tovább &rarr;
                </button>
                <a
                  :href="project.repositoryUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs font-medium text-slate-400 hover:text-white"
                >
                  GitHub
                </a>
              </div>
            </div>
          </div>

          <!-- Tier List Expand / Load More Button -->
          <div
            v-if="group.items.length > (tierLimits[group.tier] ?? 30)"
            class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4"
          >
            <span class="text-xs text-slate-400">
              Megjelenítve: {{ Math.min(tierLimits[group.tier] ?? 30, group.items.length) }} / {{ group.items.length }} {{ group.tier }}-tier projekt
            </span>
            <div class="flex gap-2">
              <button
                type="button"
                class="cursor-pointer rounded-xl bg-white/[0.08] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/[0.15]"
                @click="tierLimits[group.tier] = (tierLimits[group.tier] ?? 30) + 30"
              >
                További 30 projekt &darr;
              </button>
              <button
                type="button"
                class="cursor-pointer rounded-xl bg-indigo-500/20 px-3.5 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30"
                @click="tierLimits[group.tier] = group.items.length"
              >
                Összes ({{ group.items.length }})
              </button>
            </div>
          </div>

          <p v-else class="mt-5 text-xs text-slate-500">
            Ebben a besorolásban jelenleg nincs a szűrésnek megfelelő projekt.
          </p>
        </div>
      </section>

      <!-- ================================================================== -->
      <!-- VIEW 3: TOP 10 RANGLISTA (Editorial Ranked List)                   -->
      <!-- ================================================================== -->
      <section
        v-else-if="activeView === 'top10'"
        aria-label="Top 10 Magyar Szoftver Ranglista"
        class="space-y-6"
      >
        <div>
          <h2 class="text-2xl font-bold text-white">Top 10 Magyar Fejlesztés</h2>
          <p class="mt-1 text-sm text-slate-400">
            A legkiemelkedőbb hazai nyílt forráskódú eszközök és szoftverek rangsora.
          </p>
        </div>

        <div class="space-y-4">
          <article
            v-for="(project, index) in top10Projects"
            :key="project.id"
            class="group flex flex-col gap-5 rounded-2xl border border-white/[0.08] bg-[#131722] p-5 transition-all hover:border-white/[0.18] sm:flex-row sm:items-center sm:p-6"
          >
            <!-- Rank Badge -->
            <div class="flex items-center gap-4 sm:w-14 sm: flex-col sm:justify-center">
              <span
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base font-extrabold"
                :class="
                  index < 3
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'border border-white/10 bg-white/[0.05] text-slate-200'
                "
              >
                #{{ project.rank ?? index + 1 }}
              </span>
            </div>

            <!-- Showcase Thumbnail -->
            <div
              class="aspect-[16/10] w-full shrink-0 cursor-pointer overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d1017] sm:w-56"
              @click="openProjectDetails(project)"
            >
              <img
                v-if="project.imageUrl"
                :src="project.imageUrl"
                :alt="`${project.name} előnézet`"
                width="800"
                height="500"
                decoding="async"
                loading="lazy"
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div
                v-else
                class="flex h-full w-full flex-col justify-between bg-gradient-to-br from-[#121622] via-[#0d1017] to-[#181d2a] p-4"
              >
                <span class="text-[10px] font-mono text-indigo-400">{{ project.techStack[0] }}</span>
                <p class="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">
                  {{ project.name }}
                </p>
                <span class="text-[9px] text-slate-400">{{ project.category }}</span>
              </div>
            </div>

            <!-- Main Details -->
            <div class="flex-1 space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-bold text-white">{{ project.name }}</h3>
                <span class="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-medium text-slate-300">
                  {{ project.category }}
                </span>
                <span
                  v-if="project.tier"
                  class="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300"
                >
                  {{ project.tier }} Tier
                </span>
                <span class="text-xs text-slate-400">{{ project.authorHandle }}</span>
              </div>

              <p v-if="project.verdict" class="text-sm font-medium text-indigo-200">
                {{ project.verdict }}
              </p>

              <p class="text-sm leading-relaxed text-slate-300">
                {{ project.description }}
              </p>

              <div class="flex flex-wrap gap-1.5 pt-1">
                <span
                  v-for="tag in project.techStack"
                  :key="tag"
                  class="rounded-lg bg-white/[0.04] px-2.5 py-0.5 text-xs text-slate-300"
                >
                  {{ tag }}
                </span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex shrink-0 flex-row items-center gap-2.5 sm:flex-col sm:items-end">
              <button
                type="button"
                class="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-400"
                @click="openProjectDetails(project)"
              >
                <span>Tovább</span>
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
              </button>

              <a
                :href="project.repositoryUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
              >
                Forráskód
              </a>
            </div>
          </article>
        </div>
      </section>
    </main>

    <!-- ==================================================================== -->
    <!-- PROJECT DETAILS ("TOVÁBB") MODAL DIALOG                              -->
    <!-- ==================================================================== -->
    <dialog
      ref="detailsDialogRef"
      v-bind="{ closedby: 'any' }"
      aria-labelledby="project-details-title"
      class="m-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#121621] p-0 text-slate-100 shadow-2xl"
    >
      <div v-if="selectedProject">
        <!-- Showcase Cover Banner -->
        <div class="relative aspect-[16/9] w-full bg-[#0b0e16]">
          <img
            v-if="activeGalleryImage || selectedProject.imageUrl"
            :src="activeGalleryImage || selectedProject.imageUrl!"
            :alt="`${selectedProject.name} részletes előnézet`"
            width="800"
            height="500"
            fetchpriority="low"
            class="h-full w-full object-contain bg-[#080a10]"
          />
          <div
            v-else
            class="flex h-full w-full flex-col justify-between bg-gradient-to-br from-[#131826] via-[#0b0e16] to-[#1a2030] p-8"
          >
            <div class="flex items-center justify-between">
              <span class="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-medium text-slate-300">
                {{ selectedProject.category || 'Projekt' }}
              </span>
              <span class="font-mono text-xs text-indigo-400">
                {{ selectedProject.techStack.join(' • ') }}
              </span>
            </div>
            <div>
              <h3 class="text-3xl font-extrabold text-white">
                {{ selectedProject.name }}
              </h3>
              <p class="mt-2 text-sm text-slate-400">
                {{ selectedProject.description }}
              </p>
            </div>
            <div class="text-xs text-slate-500 font-mono">
              {{ selectedProject.authorHandle }}
            </div>
          </div>
          <button
            type="button"
            aria-label="Részletek ablak bezárása"
            class="absolute right-4 top-4 cursor-pointer rounded-full border border-white/15 bg-slate-950/80 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-slate-900"
            @click="closeProjectDetails"
          >
            Bezárás (ESC)
          </button>
        </div>

        <!-- Thumbnail Switcher when multiple real screenshots exist -->
        <div
          v-if="selectedProject.galleryImages && selectedProject.galleryImages.length > 1"
          class="flex items-center gap-2.5 overflow-x-auto border-b border-white/[0.07] bg-[#0e121b] px-6 py-3"
        >
          <span class="shrink-0 text-xs font-medium text-slate-400">Képernyőképek:</span>
          <button
            v-for="(shot, i) in selectedProject.galleryImages"
            :key="shot"
            type="button"
            class="h-12 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg border transition-all"
            :class="
              activeGalleryImage === shot
                ? 'border-indigo-400 ring-2 ring-indigo-400/40'
                : 'border-white/10 opacity-65 hover:opacity-100'
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
                <span class="rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-300">
                  {{ selectedProject.category || 'Magyar fejlesztés' }}
                </span>
                <span
                  v-if="selectedProject.tier"
                  class="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-300"
                >
                  {{ selectedProject.tier }} Tier
                </span>
                <span
                  v-if="selectedProject.rank"
                  class="rounded-full bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white"
                >
                  Top #{{ selectedProject.rank }}
                </span>
              </div>

              <h2 id="project-details-title" class="mt-3 text-2xl font-bold text-white sm:text-3xl">
                {{ selectedProject.name }}
              </h2>
              <p class="mt-1 text-sm text-slate-400">
                Készítő: <strong class="text-slate-200">{{ selectedProject.authorHandle }}</strong>
              </p>
            </div>

            <!-- Primary External Links -->
            <div class="flex flex-wrap items-center gap-2.5">
              <a
                :href="selectedProject.repositoryUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-sm transition-colors hover:bg-slate-200"
              >
                <span>GitHub Forráskód</span>
              </a>

              <a
                v-if="selectedProject.liveDemoUrl"
                :href="selectedProject.liveDemoUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-400"
              >
                <span>Élő demó megnyitása</span>
              </a>
            </div>
          </div>

          <!-- Editorial Verdict Box -->
          <div
            v-if="selectedProject.verdict"
            class="rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.08] p-4"
          >
            <div class="text-xs font-semibold text-indigo-300">Szerkesztői értékelés</div>
            <p class="mt-1 text-sm font-medium text-white">
              {{ selectedProject.verdict }}
            </p>
          </div>

          <!-- Detailed Overview -->
          <div class="space-y-3">
            <h3 class="text-sm font-semibold text-slate-200">A projektről részletesen</h3>
            <p class="text-sm leading-relaxed text-slate-300">
              {{ selectedProject.longDescription || selectedProject.description }}
            </p>
          </div>

          <!-- Key Highlights -->
          <div v-if="selectedProject.highlights && selectedProject.highlights.length > 0" class="space-y-2.5">
            <h3 class="text-sm font-semibold text-slate-200">Főbb erősségek és jellemzők</h3>
            <ul class="space-y-2">
              <li
                v-for="item in selectedProject.highlights"
                :key="item"
                class="flex items-start gap-2.5 text-sm text-slate-300"
              >
                <span class="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-indigo-400" aria-hidden="true"></span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>

          <!-- Tech Stack -->
          <div class="space-y-2">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Technológiai stack
            </h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tag in selectedProject.techStack"
                :key="tag"
                class="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200"
              >
                {{ tag }}
              </span>
            </div>
          </div>

          <!-- Takedown / Moderation Section -->
          <div class="border-t border-white/[0.08] pt-5">
            <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <span>
                Te vagy a projekt eredeti alkotója, és módosítást vagy eltávolítást kérsz?
              </span>
              <div class="flex items-center gap-2">
                <a
                  :href="buildTakedownMailtoUrl(selectedProject)"
                  class="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-rose-400/50 hover:text-rose-200"
                >
                  E-mail küldése
                </a>
                <button
                  type="button"
                  class="cursor-pointer rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-amber-400/50 hover:text-amber-200"
                  @click="showTakedownDrawer = !showTakedownDrawer"
                >
                  Eltávolítási űrlap
                </button>
              </div>
            </div>

            <form
              v-if="showTakedownDrawer"
              class="mt-4 space-y-3 rounded-2xl border border-white/10 bg-[#0d1018] p-4"
              @submit.prevent="handleDetailTakedownSubmit"
            >
              <p class="text-xs text-slate-300">
                Eltávolítási kérelem rögzítése a(z) <strong>{{ selectedProject.name }}</strong> projekthez (24 órás végrehajtás):
              </p>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label for="detail-takedown-contact" class="block text-xs text-slate-300">
                    Elérhetőség (e-mail vagy GitHub) *
                  </label>
                  <input
                    id="detail-takedown-contact"
                    v-model="requesterContact"
                    type="text"
                    required
                    minlength="3"
                    maxlength="160"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                    placeholder="alkoto@pelda.hu"
                    class="mt-1 w-full rounded-xl border border-white/10 bg-[#151926] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label for="detail-takedown-reason" class="block text-xs text-slate-300">
                    Indoklás / jogosultság igazolása *
                  </label>
                  <input
                    id="detail-takedown-reason"
                    v-model="takedownReason"
                    type="text"
                    required
                    minlength="10"
                    maxlength="1500"
                    placeholder="A repository tulajdonosaként kérem a törlést..."
                    class="mt-1 w-full rounded-xl border border-white/10 bg-[#151926] px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
              <div v-if="takedownFeedback" class="text-xs" :class="takedownFeedback.type === 'success' ? 'text-emerald-400' : 'text-rose-400'">
                {{ takedownFeedback.message }}
              </div>
              <div class="flex justify-end">
                <button
                  type="submit"
                  :disabled="isSubmittingTakedown"
                  class="cursor-pointer rounded-xl bg-rose-500/20 px-4 py-1.5 text-xs font-semibold text-rose-200 ring-1 ring-rose-500/40 hover:bg-rose-500/30"
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

    <!-- Hungarian Footer -->
    <Footer />
  </div>
</template>
