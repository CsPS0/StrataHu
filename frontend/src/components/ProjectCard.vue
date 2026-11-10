<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  buildTakedownMailtoUrl,
  getProjectShowcaseImage,
  type ProjectRecord
} from '../services/api';

const props = defineProps<{
  project: ProjectRecord;
  selectedTags: string[];
  viewMode: 'list' | 'grid';
  priorityLoad?: boolean;
  isOwner?: boolean;
}>();

const emit = defineEmits<{
  toggleTag: [tag: string];
  openDetails: [project: ProjectRecord, startEditing?: boolean];
}>();

const imageFailed = ref(false);

const coverImage = computed(() => {
  if (imageFailed.value) return null;
  return getProjectShowcaseImage(props.project);
});

const hasCoverImage = computed(() => !!coverImage.value);

const mailtoHref = computed(() => buildTakedownMailtoUrl(props.project));

const ratingInfo = computed(() => {
  const tier = props.project.tier || 'A';
  if (tier === 'S') {
    return { score: '5.0/5', label: 'S Tier', stars: 5 };
  }
  if (tier === 'A') {
    return { score: '4.8/5', label: 'A Tier', stars: 5 };
  }
  return { score: '4.5/5', label: 'B Tier', stars: 4 };
});

const featureBullets = computed(() => {
  if (props.project.highlights && props.project.highlights.length > 0) {
    return props.project.highlights.slice(0, 4);
  }
  const list: string[] = [];
  if (props.project.verdict) {
    list.push(props.project.verdict);
  }
  if (props.project.description) {
    list.push(props.project.description);
  }
  if (props.project.techStack.length > 0) {
    list.push(`Technológiák: ${props.project.techStack.slice(0, 4).join(', ')}`);
  }
  return list.slice(0, 3);
});

function isTagSelected(tag: string) {
  return props.selectedTags.some((t) => t.toLowerCase() === tag.toLowerCase());
}
</script>

<template>
  <!-- ================================================================== -->
  <!-- LIST VIEW (HubSpot Marketplace Default Horizontal Card)            -->
  <!-- ================================================================== -->
  <article
    v-if="viewMode === 'list'"
    class="group flex flex-col gap-5 rounded-2xl border border-[#dbe4ed] bg-white p-5 shadow-2xs transition-all duration-200 hover:border-[#b6c7d9] hover:shadow-md md:flex-row md:items-stretch lg:gap-7 lg:p-6"
  >
    <!-- Column 1: Showcase Thumbnail / Isometric Window Mockup -->
    <div class="w-full shrink-0 md:w-[236px]">
      <button
        type="button"
        class="relative block aspect-[16/10] w-full cursor-pointer overflow-hidden rounded-xl border border-[#e3eaf2] bg-[#f5f8fa] text-left focus-visible:outline-offset-2"
        @click="emit('openDetails', project)"
      >
        <img
          v-if="hasCoverImage"
          :src="coverImage!"
          :alt="`${project.name} képernyőkép és előnézet`"
          width="800"
          height="500"
          decoding="async"
          :fetchpriority="priorityLoad ? 'high' : undefined"
          :loading="priorityLoad ? undefined : 'lazy'"
          class="block h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
          @error="imageFailed = true"
        />
        <div
          v-else
          class="relative flex h-full w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-[#213343] via-[#2b4257] to-[#00565b] p-4 text-white"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="flex gap-1" aria-hidden="true">
              <span class="h-1.5 w-1.5 rounded-full bg-white/40"></span>
              <span class="h-1.5 w-1.5 rounded-full bg-white/40"></span>
              <span class="h-1.5 w-1.5 rounded-full bg-white/40"></span>
            </span>
            <span class="rounded bg-white/15 px-2 py-0.5 font-mono text-[10px] font-medium text-white/90">
              {{ project.techStack[0] || 'OSS' }}
            </span>
          </div>
          <div class="my-auto">
            <p class="font-display line-clamp-1 text-base font-bold tracking-tight text-white">
              {{ project.name }}
            </p>
            <p class="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/75">
              {{ project.description }}
            </p>
          </div>
          <div class="flex items-center justify-between text-[10px] text-white/70">
            <span class="truncate">{{ project.category || 'Magyar projekt' }}</span>
          </div>
        </div>

        <span
          v-if="project.rank && project.rank <= 10"
          class="absolute left-2.5 top-2.5 rounded-full bg-[#213343]/90 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-xs"
        >
          Top #{{ project.rank }}
        </span>
      </button>
    </div>

    <!-- Column 2: Title, Author, Purple Badge, Highlights -->
    <div class="flex min-w-0 flex-1 flex-col justify-between">
      <div>
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h3 class="font-display text-xl font-bold tracking-tight text-[#213343]">
            <button
              type="button"
              class="cursor-pointer text-left transition-colors hover:text-[#00565b]"
              @click="emit('openDetails', project)"
            >
              {{ project.name }}
            </button>
          </h3>
        </div>

        <p class="mt-0.5 text-xs font-medium text-[#516f90]">
          Készítő: <span class="text-[#33475b]">{{ project.authorHandle }}</span>
        </p>

        <!-- Purple Type / Category Pill (HubSpot signature) -->
        <div class="mt-2.5 flex flex-wrap items-center gap-2">
          <span
            class="inline-flex items-center rounded-full bg-[#6a55fa] px-3 py-0.5 text-[11px] font-semibold text-white"
          >
            {{ project.category || 'Szoftver' }}
          </span>
          <span
            v-if="isOwner"
            class="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800"
          >
            Saját projekt
          </span>
          <span
            v-if="project.liveDemoUrl"
            class="inline-flex items-center rounded-full border border-[#dbe4ed] bg-[#f5f8fa] px-2.5 py-0.5 text-[11px] font-medium text-[#00565b]"
          >
            Élő Demó
          </span>
        </div>

        <!-- Bulleted Features (matches HubSpot Theme Cards) -->
        <ul class="mt-3 space-y-1.5 text-[13px] leading-snug text-[#33475b]">
          <li
            v-for="(bullet, bIdx) in featureBullets"
            :key="bIdx"
            class="flex items-start gap-2"
          >
            <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#33475b]" aria-hidden="true"></span>
            <span class="line-clamp-2">{{ bullet }}</span>
          </li>
        </ul>
      </div>

      <!-- Interactive Tech Tags Footer inside Middle Column -->
      <div class="mt-4 flex flex-wrap items-center gap-1.5">
        <button
          v-for="tag in project.techStack.slice(0, 6)"
          :key="tag"
          type="button"
          class="cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors"
          :class="
            isTagSelected(tag)
              ? 'bg-[#00565b] text-white'
              : 'bg-[#f5f8fa] text-[#516f90] hover:bg-[#eaf0f6] hover:text-[#213343]'
          "
          :aria-pressed="isTagSelected(tag)"
          @click="emit('toggleTag', tag)"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <!-- Column 3: Status/Tier, Gold Rating Stars & Primary CTA Actions -->
    <div
      class="flex w-full shrink-0 flex-col justify-between border-t border-[#edf1f5] pt-4 md:w-[225px] md:items-end md:border-l md:border-t-0 md:pl-6 md:pt-0 md:text-right"
    >
      <div class="flex flex-wrap items-center justify-between gap-2 md:flex-col md:items-end">
        <div class="font-display text-lg font-bold text-[#213343]">
          Ingyenes • OSS
        </div>

        <!-- Gold Stars + Tier Rating -->
        <div class="flex items-center gap-1.5">
          <div class="flex items-center text-[#d68f00]" aria-hidden="true">
            <svg
              v-for="star in 5"
              :key="star"
              class="h-4 w-4"
              :class="star <= ratingInfo.stars ? 'fill-current' : 'fill-[#dbe4ed]'"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <span class="text-xs font-semibold text-[#516f90]">
            {{ ratingInfo.score }} ({{ ratingInfo.label }})
          </span>
        </div>

        <div class="text-xs text-[#516f90]">
          {{ project.rank ? `Rangsor: #${project.rank}` : 'Közösségi katalógus' }}
        </div>
      </div>

      <div class="mt-5 flex w-full flex-col gap-2 sm:flex-row md:flex-wrap md:justify-end">
        <button
          v-if="isOwner"
          type="button"
          class="inline-flex min-h-[38px] flex-1 cursor-pointer items-center justify-center rounded-full border border-[#00565b] bg-[#f0f7f7] px-3.5 py-2 text-xs font-semibold text-[#00565b] transition-all hover:bg-[#00565b] hover:text-white active:scale-[0.98] md:flex-initial"
          @click="emit('openDetails', project, true)"
        >
          Szerkesztés
        </button>

        <button
          type="button"
          class="inline-flex min-h-[38px] flex-1 cursor-pointer items-center justify-center rounded-full bg-[#00565b] px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-[#004246] active:scale-[0.98] md:flex-initial"
          @click="emit('openDetails', project)"
        >
          Részletek
        </button>

        <a
          :href="project.liveDemoUrl || project.repositoryUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex min-h-[38px] flex-1 items-center justify-center rounded-full border border-[#7c98b6] bg-white px-4 py-2 text-xs font-semibold text-[#33475b] transition-all hover:bg-[#f5f8fa] hover:text-[#213343] active:scale-[0.98] md:flex-initial"
        >
          {{ project.liveDemoUrl ? 'Előnézet' : 'Forráskód' }}
        </a>

        <a
          :href="mailtoHref"
          class="self-center px-2 py-1 text-[11px] font-medium text-[#7c98b6] transition-colors hover:text-[#d93b00] md:mt-1"
          :aria-label="`${project.name} eltávolítási kérelem`"
        >
          Jelentés
        </a>
      </div>
    </div>
  </article>

  <!-- ================================================================== -->
  <!-- GRID VIEW (HubSpot 2-Column Marketplace Card)                      -->
  <!-- ================================================================== -->
  <article
    v-else
    class="group flex flex-col overflow-hidden rounded-2xl border border-[#dbe4ed] bg-white shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#b6c7d9] hover:shadow-md"
  >
    <!-- Top Full-Bleed Preview -->
    <button
      type="button"
      class="relative block aspect-[16/10] w-full cursor-pointer overflow-hidden border-b border-[#edf1f5] bg-[#f5f8fa] text-left"
      @click="emit('openDetails', project)"
    >
      <img
        v-if="hasCoverImage"
        :src="coverImage!"
        :alt="`${project.name} képernyőkép és előnézet`"
        width="800"
        height="500"
        decoding="async"
        :fetchpriority="priorityLoad ? 'high' : undefined"
        :loading="priorityLoad ? undefined : 'lazy'"
        class="block h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
        @error="imageFailed = true"
      />
      <div
        v-else
        class="relative flex h-full w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-[#213343] via-[#2b4257] to-[#00565b] p-5 text-white"
      >
        <div class="flex items-center justify-between">
          <span class="rounded bg-white/15 px-2.5 py-0.5 font-mono text-[11px] font-medium">
            {{ project.techStack[0] || 'OSS' }}
          </span>
          <span class="text-xs font-medium text-white/80">
            {{ ratingInfo.label }}
          </span>
        </div>
        <div class="my-auto py-2">
          <p class="font-display text-xl font-bold tracking-tight text-white">
            {{ project.name }}
          </p>
          <p class="mt-1 line-clamp-2 text-xs text-white/80">
            {{ project.description }}
          </p>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="t in project.techStack.slice(0, 3)"
            :key="t"
            class="rounded bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white"
          >
            {{ t }}
          </span>
        </div>
      </div>

      <span
        v-if="project.rank && project.rank <= 10"
        class="absolute left-3 top-3 rounded-full bg-[#213343]/90 px-3 py-1 text-xs font-bold text-white backdrop-blur-xs"
      >
        Top #{{ project.rank }}
      </span>
    </button>

    <!-- Card Body -->
    <div class="flex min-w-0 flex-1 flex-col justify-between p-5 sm:p-6">
      <div>
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-display text-lg font-bold tracking-tight text-[#213343]">
            <button
              type="button"
              class="cursor-pointer text-left transition-colors hover:text-[#00565b]"
              @click="emit('openDetails', project)"
            >
              {{ project.name }}
            </button>
          </h3>
          <span class="shrink-0 text-sm font-bold text-[#213343]">Ingyenes</span>
        </div>

        <p class="mt-0.5 text-xs font-medium text-[#516f90]">
          Készítő: {{ project.authorHandle }}
        </p>

        <div class="mt-2.5 flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center rounded-full bg-[#6a55fa] px-3 py-0.5 text-[11px] font-semibold text-white">
            {{ project.category || 'Szoftver' }}
          </span>
          <span
            v-if="isOwner"
            class="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
          >
            Saját
          </span>
          <span class="text-[11px] font-semibold text-[#00565b]">
            {{ ratingInfo.label }}
          </span>
        </div>

        <p class="mt-3 line-clamp-2 text-sm leading-relaxed text-[#33475b]">
          {{ project.description }}
        </p>

        <div class="mt-3 flex flex-wrap gap-1.5">
          <button
            v-for="tag in project.techStack.slice(0, 4)"
            :key="tag"
            type="button"
            class="cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors"
            :class="
              isTagSelected(tag)
                ? 'bg-[#00565b] text-white'
                : 'bg-[#f5f8fa] text-[#516f90] hover:bg-[#eaf0f6] hover:text-[#213343]'
            "
            :aria-pressed="isTagSelected(tag)"
            @click="emit('toggleTag', tag)"
          >
            {{ tag }}
          </button>
        </div>
      </div>

      <!-- Bottom Row matching HubSpot Grid View -->
      <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f5] pt-4">
        <div class="flex items-center gap-1" :aria-label="`Értékelés: ${ratingInfo.score}`">
          <div class="flex items-center text-[#d68f00]" aria-hidden="true">
            <svg
              v-for="star in 5"
              :key="star"
              class="h-4 w-4"
              :class="star <= ratingInfo.stars ? 'fill-current' : 'fill-[#dbe4ed]'"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <span class="text-xs font-medium text-[#516f90]">{{ ratingInfo.score }}</span>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="min-h-[36px] cursor-pointer rounded-full bg-[#00565b] px-4 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#004246] active:scale-[0.98]"
            @click="emit('openDetails', project)"
          >
            Részletek
          </button>
          <a
            :href="project.liveDemoUrl || project.repositoryUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-[36px] items-center rounded-full border border-[#7c98b6] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#33475b] transition-all hover:bg-[#f5f8fa] hover:text-[#213343] active:scale-[0.98]"
          >
            {{ project.liveDemoUrl ? 'Előnézet' : 'Forrás' }}
          </a>
        </div>
      </div>
    </div>
  </article>
</template>
