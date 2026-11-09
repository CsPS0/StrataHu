<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  buildTakedownMailtoUrl,
  getProjectShowcaseImage,
  type ProjectRecord
} from '../services/api';

const props = defineProps<{
  project: ProjectRecord;
  selectedTag: string;
  priorityLoad?: boolean;
}>();

const emit = defineEmits<{
  selectTag: [tag: string];
  openDetails: [project: ProjectRecord];
}>();

const imageFailed = ref(false);

const coverImage = computed(() => {
  if (imageFailed.value) return null;
  return getProjectShowcaseImage(props.project);
});

const hasCoverImage = computed(() => !!coverImage.value);

const mailtoHref = computed(() => buildTakedownMailtoUrl(props.project));

const tierBadgeStyle = computed(() => {
  switch (props.project.tier) {
    case 'S':
      return 'bg-amber-400/20 text-amber-200 border-amber-400/40';
    case 'A':
      return 'bg-indigo-400/20 text-indigo-200 border-indigo-400/40';
    default:
      return 'bg-emerald-400/20 text-emerald-200 border-emerald-400/40';
  }
});
</script>

<template>
  <article
    class="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#131722] shadow-lg shadow-black/25 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.18] hover:shadow-xl"
  >
    <!-- Header Showcase Image / Real Screenshot or Instant CSS Card Cover -->
    <div
      class="relative aspect-[16/10] w-full cursor-pointer overflow-hidden border-b border-white/[0.06] bg-[#0b0e16]"
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
        class="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
        @error="imageFailed = true"
      />
      <div
        v-else
        class="relative flex h-full w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-[#121622] via-[#0d1017] to-[#181d2a] p-5"
      >
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px] opacity-10"></div>
        <div class="relative z-10 flex items-center justify-between">
          <span class="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
            {{ project.category || 'Projekt' }}
          </span>
          <span class="text-[11px] font-mono text-slate-500">
            {{ project.techStack[0] || 'Code' }}
          </span>
        </div>
        <div class="relative z-10 my-auto py-2">
          <p class="text-xl font-bold tracking-tight text-white transition-colors group-hover:text-indigo-300">
            {{ project.name }}
          </p>
          <p class="mt-1 line-clamp-1 text-xs text-slate-400">
            {{ project.description }}
          </p>
        </div>
        <div class="relative z-10 flex flex-wrap gap-1.5">
          <span
            v-for="tech in project.techStack.slice(0, 3)"
            :key="tech"
            class="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-slate-300"
          >
            {{ tech }}
          </span>
        </div>
      </div>

      <!-- Subtle gradient vignette for top badge readability when image is present -->
      <div
        v-if="hasCoverImage"
        class="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-slate-950/70 to-transparent"
      ></div>

      <!-- Top Floating Badges -->
      <div
        v-if="hasCoverImage"
        class="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between gap-2"
      >
        <span
          class="rounded-full border border-white/15 bg-slate-950/80 px-3 py-1 text-[11px] font-medium text-slate-100 backdrop-blur-md"
        >
          {{ project.category || 'Magyar projekt' }}
        </span>

        <div class="flex items-center gap-1.5">
          <span
            v-if="project.rank && project.rank <= 10"
            class="rounded-full border border-white/15 bg-slate-950/85 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md"
          >
            #{{ project.rank }}
          </span>
          <span
            v-if="project.tier"
            class="rounded-full border px-2.5 py-0.5 text-[11px] font-bold backdrop-blur-md"
            :class="tierBadgeStyle"
          >
            {{ project.tier }} Tier
          </span>
        </div>
      </div>
      <div
        v-else
        class="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5"
      >
        <span
          v-if="project.rank && project.rank <= 10"
          class="rounded-full border border-white/15 bg-slate-950/85 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md"
        >
          #{{ project.rank }}
        </span>
        <span
          v-if="project.tier"
          class="rounded-full border px-2.5 py-0.5 text-[11px] font-bold backdrop-blur-md"
          :class="tierBadgeStyle"
        >
          {{ project.tier }} Tier
        </span>
      </div>
    </div>

    <!-- Card Body: Name, Short Description, Tags -->
    <div class="flex flex-1 flex-col justify-between p-5 sm:p-6">
      <div>
        <!-- Project Title & Creator -->
        <div class="flex items-baseline justify-between gap-2">
          <h2 class="text-lg font-bold tracking-tight text-white group-hover:text-indigo-300">
            <button
              type="button"
              class="cursor-pointer text-left focus:outline-none"
              @click="emit('openDetails', project)"
            >
              {{ project.name }}
            </button>
          </h2>
          <span class="shrink-0 text-xs font-medium text-slate-400">
            {{ project.authorHandle }}
          </span>
        </div>

        <!-- Short Description -->
        <p class="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-300">
          {{ project.description }}
        </p>

        <!-- Tech Stack Pills -->
        <ul class="mt-4 flex flex-wrap gap-1.5" aria-label="Használt technológiák">
          <li v-for="tag in project.techStack" :key="tag">
            <button
              type="button"
              class="cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
              :class="
                selectedTag.toLowerCase() === tag.toLowerCase()
                  ? 'bg-indigo-500/25 text-indigo-200 ring-1 ring-indigo-400/50'
                  : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1] hover:text-white'
              "
              @click="emit('selectTag', tag)"
            >
              {{ tag }}
            </button>
          </li>
        </ul>
      </div>

      <!-- Card Footer: "Tovább" (Read More) Button & Quick Links -->
      <div class="mt-6 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
        <button
          type="button"
          class="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-500/15 px-4 py-2 text-xs font-semibold text-indigo-200 ring-1 ring-indigo-400/30 transition-all hover:bg-indigo-500 hover:text-white hover:ring-indigo-500"
          @click="emit('openDetails', project)"
        >
          <span>Tovább</span>
          <svg
            class="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </button>

        <div class="flex items-center gap-2">
          <a
            :href="project.repositoryUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-white/[0.18] hover:text-white"
            title="Forráskód megnyitása"
          >
            Forrás
          </a>

          <a
            v-if="project.liveDemoUrl"
            :href="project.liveDemoUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-white/[0.18] hover:text-white"
            title="Weboldal vagy élő demó megnyitása"
          >
            Weboldal
          </a>

          <a
            :href="mailtoHref"
            class="rounded-lg px-2 py-1.5 text-[11px] text-slate-500 transition-colors hover:text-rose-300"
            :title="`Eltávolítási kérelem küldése (${project.name})`"
          >
            Jelentés
          </a>
        </div>
      </div>
    </div>
  </article>
</template>
