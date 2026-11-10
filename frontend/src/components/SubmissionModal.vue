<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ApiError, submitProject, type ProjectRecord } from '../services/api';

const emit = defineEmits<{
  projectCreated: [project: ProjectRecord];
}>();

const dialogRef = ref<HTMLDialogElement | null>(null);
const formRef = ref<HTMLFormElement | null>(null);

const categories = [
  'Oktatás & e-Kréta',
  'Parancssor & Fejlesztői eszközök',
  'Web & Alkotói eszközök',
  'Infrastruktúra & DevOps',
  'Mesterséges intelligencia & NLP',
  'Játék & Klasszikusok'
];

const name = ref('');
const category = ref(categories[0]);
const description = ref('');
const longDescription = ref('');
const authorHandle = ref('');
const contactInfo = ref('');
const techStackInput = ref('');
const repositoryUrl = ref('');
const liveDemoUrl = ref('');
const imageUrl = ref('');

const isSubmitting = ref(false);
const errorMessage = ref('');
const fieldErrors = ref<Record<string, string[]>>({});

const interactionState = new WeakMap<
  HTMLInputElement | HTMLTextAreaElement,
  { hasInteracted: boolean; hasBlurred: boolean }
>();

function syncValidationState(el: EventTarget | null, phase: 'input' | 'blur') {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
    return;
  }

  const state = interactionState.get(el) || { hasInteracted: false, hasBlurred: false };
  if (phase === 'input') {
    state.hasInteracted = true;
  } else if (phase === 'blur') {
    state.hasBlurred = true;
  }
  interactionState.set(el, state);

  if (state.hasInteracted && state.hasBlurred) {
    const isValid = el.checkValidity();
    el.classList.toggle('user-invalid-fallback', !isValid);
    el.setAttribute('aria-invalid', isValid ? 'false' : 'true');
  } else if (el.hasAttribute('aria-invalid') && el.checkValidity()) {
    el.classList.remove('user-invalid-fallback');
    el.setAttribute('aria-invalid', 'false');
  }
}

function resetFormState() {
  name.value = '';
  category.value = categories[0];
  description.value = '';
  longDescription.value = '';
  authorHandle.value = '';
  contactInfo.value = '';
  techStackInput.value = '';
  repositoryUrl.value = '';
  liveDemoUrl.value = '';
  imageUrl.value = '';
  errorMessage.value = '';
  fieldErrors.value = {};

  if (formRef.value) {
    const controls = formRef.value.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input, textarea'
    );
    controls.forEach((control) => {
      interactionState.delete(control);
      control.classList.remove('user-invalid-fallback');
      control.removeAttribute('aria-invalid');
    });
  }
}

function openModal() {
  errorMessage.value = '';
  fieldErrors.value = {};
  dialogRef.value?.showModal();
}

function closeModal() {
  dialogRef.value?.close();
}

defineExpose({
  openModal,
  closeModal
});

onMounted(() => {
  const dialog = dialogRef.value;
  if (!dialog) return;

  if (!('closedBy' in HTMLDialogElement.prototype)) {
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

  dialog.addEventListener('close', () => {
    dialog.returnValue = '';
  });
});

async function handleSubmit() {
  if (isSubmitting.value) return;

  if (formRef.value && !formRef.value.checkValidity()) {
    const controls = formRef.value.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input, textarea'
    );
    controls.forEach((c) => {
      interactionState.set(c, { hasInteracted: true, hasBlurred: true });
      syncValidationState(c, 'blur');
    });
    const firstInvalid = formRef.value.querySelector<HTMLElement>(':invalid');
    firstInvalid?.focus();
    return;
  }

  const parsedTags = techStackInput.value
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (parsedTags.length === 0) {
    fieldErrors.value = { techStack: ['Kérjük, adj meg legalább egy technológiai címkét.'] };
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';
  fieldErrors.value = {};

  try {
    const created = await submitProject({
      name: name.value.trim(),
      category: category.value,
      description: description.value.trim(),
      longDescription: longDescription.value.trim() || null,
      imageUrl: imageUrl.value.trim() || null,
      authorHandle: authorHandle.value.trim(),
      contactInfo: contactInfo.value.trim(),
      techStack: parsedTags,
      repositoryUrl: repositoryUrl.value.trim(),
      liveDemoUrl: liveDemoUrl.value.trim() ? liveDemoUrl.value.trim() : null
    });

    resetFormState();
    closeModal();
    emit('projectCreated', created);
  } catch (err) {
    if (err instanceof ApiError) {
      errorMessage.value = err.message;
      if (err.fieldErrors) {
        fieldErrors.value = err.fieldErrors;
      }
    } else {
      errorMessage.value = 'Nem sikerült elérni a szervert. Kérjük, próbáld újra.';
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <dialog
    ref="dialogRef"
    v-bind="{ closedby: 'any' }"
    aria-labelledby="submission-dialog-title"
    class="m-auto w-full max-w-2xl rounded-2xl border border-[#dbe4ed] bg-white p-0 text-[#213343] shadow-2xl"
  >
    <!-- Dialog Header -->
    <div class="flex items-center justify-between border-b border-[#edf1f5] bg-[#f8fafc] px-6 py-5">
      <div>
        <span class="text-xs font-bold uppercase tracking-wider text-[#6a55fa]">Közösségi beküldés</span>
        <h2 id="submission-dialog-title" class="font-display mt-0.5 text-xl font-bold text-[#213343]">
          Magyar projekt beküldése a piactérre
        </h2>
      </div>
      <form method="dialog">
        <button
          type="submit"
          value="cancel"
          aria-label="Ablak bezárása"
          class="min-h-[36px] cursor-pointer rounded-full border border-[#cbd6e2] bg-white px-4 py-1.5 text-xs font-semibold text-[#33475b] transition-colors hover:bg-[#f0f2f5] hover:text-[#213343]"
        >
          Bezárás
        </button>
      </form>
    </div>

    <!-- Submission Form -->
    <form
      ref="formRef"
      method="post"
      class="space-y-5 p-6"
      novalidate
      @submit.prevent="handleSubmit"
      @input="syncValidationState($event.target, 'input')"
      @focusout="syncValidationState($event.target, 'blur')"
    >
      <div
        v-if="errorMessage"
        role="alert"
        aria-live="assertive"
        class="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-800"
      >
        <p class="font-semibold">{{ errorMessage }}</p>
        <ul v-if="Object.keys(fieldErrors).length > 0" class="mt-1.5 list-disc space-y-0.5 pl-4">
          <li v-for="(messages, field) in fieldErrors" :key="field">
            {{ messages.join(' ') }}
          </li>
        </ul>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <!-- Project Name -->
        <div>
          <label for="submit-project-name" class="block text-xs font-semibold text-[#213343]">
            Projekt neve *
          </label>
          <span id="hint-project-name" class="mt-0.5 block text-[11px] text-[#516f90]">
            2–120 karakter
          </span>
          <input
            id="submit-project-name"
            v-model="name"
            type="text"
            name="name"
            required
            minlength="2"
            maxlength="120"
            autofocus
            aria-describedby="hint-project-name"
            placeholder="pl. PannonKV"
            class="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#cbd6e2] bg-[#f8fafc] px-3.5 py-2 text-sm text-[#213343] placeholder-[#7c98b6] focus:border-[#00565b] focus:bg-white"
          />
          <p class="field-error-msg mt-1 hidden items-center gap-1 text-xs text-rose-600">
            <span aria-hidden="true">•</span> Add meg a projekt nevét (2–120 karakter).
          </p>
        </div>

        <!-- Category Select -->
        <div>
          <label for="submit-category" class="block text-xs font-semibold text-[#213343]">
            Kategória *
          </label>
          <span id="hint-category" class="mt-0.5 block text-[11px] text-[#516f90]">
            Fő témakör a piactérhez
          </span>
          <select
            id="submit-category"
            v-model="category"
            name="category"
            aria-describedby="hint-category"
            class="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#cbd6e2] bg-[#f8fafc] px-3.5 py-2 text-sm text-[#213343] focus:border-[#00565b] focus:bg-white"
          >
            <option v-for="cat in categories" :key="cat" :value="cat">
              {{ cat }}
            </option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <!-- Author Handle -->
        <div>
          <label for="submit-author-handle" class="block text-xs font-semibold text-[#213343]">
            Készítő / Fejlesztő (@handle) *
          </label>
          <span id="hint-author-handle" class="mt-0.5 block text-[11px] text-[#516f90]">
            GitHub vagy közösségi azonosító
          </span>
          <input
            id="submit-author-handle"
            v-model="authorHandle"
            type="text"
            name="authorHandle"
            required
            minlength="2"
            maxlength="80"
            autocomplete="username"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            aria-describedby="hint-author-handle"
            placeholder="pl. @kovacs_bence"
            class="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#cbd6e2] bg-[#f8fafc] px-3.5 py-2 text-sm text-[#213343] placeholder-[#7c98b6] focus:border-[#00565b] focus:bg-white"
          />
          <p class="field-error-msg mt-1 hidden items-center gap-1 text-xs text-rose-600">
            <span aria-hidden="true">•</span> Add meg a készítő azonosítóját.
          </p>
        </div>

        <!-- Contact Information -->
        <div>
          <label for="submit-contact-info" class="block text-xs font-semibold text-[#213343]">
            Kapcsolattartási e-mail *
          </label>
          <span id="hint-contact-info" class="mt-0.5 block text-[11px] text-[#516f90]">
            Csak moderációhoz, nem jelenik meg nyilvánosan
          </span>
          <input
            id="submit-contact-info"
            v-model="contactInfo"
            type="text"
            name="contactInfo"
            required
            minlength="3"
            maxlength="160"
            autocomplete="email"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            aria-describedby="hint-contact-info"
            placeholder="fejleszto@pelda.hu"
            class="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#cbd6e2] bg-[#f8fafc] px-3.5 py-2 text-sm text-[#213343] placeholder-[#7c98b6] focus:border-[#00565b] focus:bg-white"
          />
          <p class="field-error-msg mt-1 hidden items-center gap-1 text-xs text-rose-600">
            <span aria-hidden="true">•</span> Adj meg érvényes kapcsolattartási elérhetőséget.
          </p>
        </div>
      </div>

      <!-- Short Description -->
      <div>
        <label for="submit-description" class="block text-xs font-semibold text-[#213343]">
          Rövid összefoglaló (a kártyán jelenik meg) *
        </label>
        <span id="hint-description" class="mt-0.5 block text-[11px] text-[#516f90]">
          1–2 mondatos lényegretörő leírás (10–600 karakter)
        </span>
        <textarea
          id="submit-description"
          v-model="description"
          name="description"
          rows="2"
          required
          minlength="10"
          maxlength="600"
          aria-describedby="hint-description"
          placeholder="Milyen problémát old meg a projekt, és kiknek készült?"
          class="mt-1.5 w-full rounded-xl border border-[#cbd6e2] bg-[#f8fafc] px-3.5 py-2.5 text-sm text-[#213343] placeholder-[#7c98b6] focus:border-[#00565b] focus:bg-white"
        ></textarea>
        <p class="field-error-msg mt-1 hidden items-center gap-1 text-xs text-rose-600">
          <span aria-hidden="true">•</span> A rövid leírásnak 10 és 600 karakter között kell lennie.
        </p>
      </div>

      <!-- Long Description (for the Details modal) -->
      <div>
        <label for="submit-long-description" class="block text-xs font-semibold text-[#213343]">
          Részletes bemutatás (a „Részletek” ablakban jelenik meg) <span class="font-normal text-[#7c98b6]">(Opcionális)</span>
        </label>
        <span id="hint-long-description" class="mt-0.5 block text-[11px] text-[#516f90]">
          Architektúra, fő funkciók és technikai érdekességek bővebben
        </span>
        <textarea
          id="submit-long-description"
          v-model="longDescription"
          name="longDescription"
          rows="3"
          maxlength="2400"
          aria-describedby="hint-long-description"
          placeholder="Írd le részletesebben a projekt működését, előnyeit és használati eseteit..."
          class="mt-1.5 w-full rounded-xl border border-[#cbd6e2] bg-[#f8fafc] px-3.5 py-2.5 text-sm text-[#213343] placeholder-[#7c98b6] focus:border-[#00565b] focus:bg-white"
        ></textarea>
      </div>

      <!-- Tech Stack & Preview Image -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label for="submit-tech-stack" class="block text-xs font-semibold text-[#213343]">
            Technológiák *
          </label>
          <span id="hint-tech-stack" class="mt-0.5 block text-[11px] text-[#516f90]">
            Vesszővel elválasztva (max. 12 címke)
          </span>
          <input
            id="submit-tech-stack"
            v-model="techStackInput"
            type="text"
            name="techStack"
            required
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            aria-describedby="hint-tech-stack"
            placeholder="pl. .NET 10, Vue 3, TypeScript, Docker"
            class="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#cbd6e2] bg-[#f8fafc] px-3.5 py-2 text-sm text-[#213343] placeholder-[#7c98b6] focus:border-[#00565b] focus:bg-white"
          />
          <p class="field-error-msg mt-1 hidden items-center gap-1 text-xs text-rose-600">
            <span aria-hidden="true">•</span> Adj meg legalább egy technológiát.
          </p>
        </div>

        <div>
          <label for="submit-image-url" class="block text-xs font-semibold text-[#213343]">
            Képernyőkép / Borítókép URL <span class="font-normal text-[#7c98b6]">(Opcionális)</span>
          </label>
          <span id="hint-image-url" class="mt-0.5 block text-[11px] text-[#516f90]">
            Ha üresen hagyod, automatikus előnézet készül
          </span>
          <input
            id="submit-image-url"
            v-model="imageUrl"
            type="url"
            name="imageUrl"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            aria-describedby="hint-image-url"
            placeholder="https://pelda.hu/screenshot.png"
            class="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#cbd6e2] bg-[#f8fafc] px-3.5 py-2 text-sm text-[#213343] placeholder-[#7c98b6] focus:border-[#00565b] focus:bg-white"
          />
        </div>
      </div>

      <!-- Repository & Live Demo URLs -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label for="submit-repo-url" class="block text-xs font-semibold text-[#213343]">
            Forráskód (GitHub / GitLab) URL *
          </label>
          <span id="hint-repo-url" class="mt-0.5 block text-[11px] text-[#516f90]">
            Nyilvános adattár címe
          </span>
          <input
            id="submit-repo-url"
            v-model="repositoryUrl"
            type="url"
            name="repositoryUrl"
            required
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            aria-describedby="hint-repo-url"
            placeholder="https://github.com/felhasznalo/projekt"
            class="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#cbd6e2] bg-[#f8fafc] px-3.5 py-2 text-sm text-[#213343] placeholder-[#7c98b6] focus:border-[#00565b] focus:bg-white"
          />
          <p class="field-error-msg mt-1 hidden items-center gap-1 text-xs text-rose-600">
            <span aria-hidden="true">•</span> Adj meg egy érvényes http:// vagy https:// URL-t.
          </p>
        </div>

        <div>
          <label for="submit-demo-url" class="block text-xs font-semibold text-[#213343]">
            Élő demó / Weboldal URL <span class="font-normal text-[#7c98b6]">(Opcionális)</span>
          </label>
          <span id="hint-demo-url" class="mt-0.5 block text-[11px] text-[#516f90]">
            Kipróbálható alkalmazás vagy dokumentáció
          </span>
          <input
            id="submit-demo-url"
            v-model="liveDemoUrl"
            type="url"
            name="liveDemoUrl"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            aria-describedby="hint-demo-url"
            placeholder="https://projekt.hu"
            class="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#cbd6e2] bg-[#f8fafc] px-3.5 py-2 text-sm text-[#213343] placeholder-[#7c98b6] focus:border-[#00565b] focus:bg-white"
          />
        </div>
      </div>

      <!-- Modal Footer Actions -->
      <div class="flex items-center justify-end gap-3 border-t border-[#edf1f5] pt-4">
        <button
          type="button"
          class="min-h-[42px] cursor-pointer rounded-full border border-[#7c98b6] bg-white px-5 py-2 text-xs font-semibold text-[#33475b] transition-colors hover:bg-[#f5f8fa] hover:text-[#213343]"
          @click="closeModal"
        >
          Mégse
        </button>
        <button
          type="submit"
          :disabled="isSubmitting"
          class="min-h-[42px] cursor-pointer rounded-full bg-[#d93b00] px-6 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#b83200] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ isSubmitting ? 'Beküldés folyamatban...' : 'Projekt közzététele' }}
        </button>
      </div>
    </form>
  </dialog>
</template>
