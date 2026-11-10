<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import {
  ApiError,
  loginDeveloper,
  registerCertifiedDeveloper,
  requestDiscordVerificationCode,
  resetDeveloperPassword,
  type DeveloperProfile
} from '../services/api';

type AuthMode = 'login' | 'register' | 'reset';

const emit = defineEmits<{
  authenticated: [developer: DeveloperProfile];
}>();

const dialogRef = ref<HTMLDialogElement | null>(null);
const activeFormRef = ref<HTMLFormElement | null>(null);

const mode = ref<AuthMode>('login');
const isBusy = ref(false);
const isSendingCode = ref(false);
const errorMessage = ref('');
const statusMessage = ref('');

// Sign-in state
const loginIdentifier = ref('');
const loginPassword = ref('');
const showLoginPassword = ref(false);

// Sign-up / reset state
const discordUsernameForCode = ref('');
const verificationCode = ref('');
const regEmail = ref('');
const regDisplayName = ref('');
const regPassword = ref('');
const showRegPassword = ref(false);

const interactionState = new WeakMap<
  HTMLInputElement,
  { hasInteracted: boolean; hasBlurred: boolean }
>();

function syncValidationState(el: EventTarget | null, phase: 'input' | 'blur') {
  if (!(el instanceof HTMLInputElement)) return;
  const state = interactionState.get(el) || { hasInteracted: false, hasBlurred: false };
  if (phase === 'input') {
    state.hasInteracted = true;
  } else {
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

function clearValidationUi() {
  errorMessage.value = '';
  if (!activeFormRef.value) return;
  activeFormRef.value.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
    interactionState.delete(input);
    input.classList.remove('user-invalid-fallback');
    input.removeAttribute('aria-invalid');
  });
}

function switchMode(nextMode: AuthMode) {
  mode.value = nextMode;
  statusMessage.value = '';
  clearValidationUi();
  void nextTick(() => {
    if (dialogRef.value) dialogRef.value.scrollTop = 0;
  });
}

function openModal(initialMode: AuthMode = 'login') {
  switchMode(initialMode);
  dialogRef.value?.showModal();
  void nextTick(() => {
    if (dialogRef.value) dialogRef.value.scrollTop = 0;
  });
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
      if (pressedOutside && isOutside(e)) dialog.close();
    });
  }

  dialog.addEventListener('close', () => {
    dialog.returnValue = '';
  });
});

function validateCurrentForm(): boolean {
  const form = activeFormRef.value;
  if (!form || form.checkValidity()) return true;

  form.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
    interactionState.set(input, { hasInteracted: true, hasBlurred: true });
    syncValidationState(input, 'blur');
  });
  form.querySelector<HTMLElement>(':invalid')?.focus();
  return false;
}

async function handleRequestDiscordDmCode(purpose: 'register' | 'reset') {
  if (isSendingCode.value) return;
  const handle = discordUsernameForCode.value.trim();
  if (handle.length < 2) {
    errorMessage.value = 'Add meg a pontos Discord felhasználóneved a privát kód küldéséhez!';
    return;
  }

  isSendingCode.value = true;
  errorMessage.value = '';
  statusMessage.value = '';

  try {
    const res = await requestDiscordVerificationCode({ discordUsername: handle, purpose });
    statusMessage.value = res.message;
  } catch (err) {
    if (err instanceof ApiError) {
      errorMessage.value = err.message;
    } else {
      errorMessage.value =
        'Nem érhető el a helyi API szerver (:5000). Ellenőrizd, hogy fut-e a Discord bot szolgáltatás!';
    }
  } finally {
    isSendingCode.value = false;
  }
}

async function handleLoginSubmit() {
  if (isBusy.value || !validateCurrentForm()) return;
  isBusy.value = true;
  errorMessage.value = '';
  statusMessage.value = '';

  try {
    const session = await loginDeveloper({
      identifier: loginIdentifier.value.trim(),
      password: loginPassword.value
    });
    loginPassword.value = '';
    closeModal();
    emit('authenticated', session.developer);
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError
        ? err.message
        : 'Nem sikerült elérni a bejelentkezési szervert (localhost:5000).';
  } finally {
    isBusy.value = false;
  }
}

async function handleRegisterSubmit() {
  if (isBusy.value || !validateCurrentForm()) return;
  isBusy.value = true;
  errorMessage.value = '';
  statusMessage.value = '';

  try {
    const session = await registerCertifiedDeveloper({
      verificationCode: verificationCode.value.trim(),
      email: regEmail.value.trim(),
      password: regPassword.value,
      displayName: regDisplayName.value.trim() || undefined
    });
    regPassword.value = '';
    verificationCode.value = '';
    closeModal();
    emit('authenticated', session.developer);
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError
        ? err.message
        : 'Nem sikerült elérni a regisztrációs szervert (localhost:5000).';
  } finally {
    isBusy.value = false;
  }
}

async function handleResetSubmit() {
  if (isBusy.value || !validateCurrentForm()) return;
  isBusy.value = true;
  errorMessage.value = '';
  statusMessage.value = '';

  try {
    const session = await resetDeveloperPassword({
      verificationCode: verificationCode.value.trim(),
      newPassword: regPassword.value
    });
    regPassword.value = '';
    verificationCode.value = '';
    closeModal();
    emit('authenticated', session.developer);
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError
        ? err.message
        : 'Nem sikerült elérni a szervert (localhost:5000).';
  } finally {
    isBusy.value = false;
  }
}
</script>

<template>
  <dialog
    ref="dialogRef"
    v-bind="{ closedby: 'any' }"
    aria-labelledby="auth-dialog-title"
    class="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-x-hidden overflow-y-auto rounded-2xl border border-[#dbe4ed] bg-white p-0 text-[#213343] shadow-2xl"
  >
    <!-- Header -->
    <div class="border-b border-[#edf1f5] bg-[#f8fafc] px-6 py-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-[#00565b]">
            Discord Hitelesített Fejlesztői Fiók
          </span>
          <h2 id="auth-dialog-title" class="font-display mt-0.5 text-xl font-bold text-[#213343]">
            {{
              mode === 'login'
                ? 'Bejelentkezés fejlesztői fiókba'
                : mode === 'register'
                  ? 'Hitelesített fiók létrehozása'
                  : 'Jelszó visszaállítása Discordon'
            }}
          </h2>
        </div>

        <form method="dialog">
          <button
            type="submit"
            value="cancel"
            aria-label="Bejelentkezési ablak bezárása"
            class="min-h-[36px] cursor-pointer rounded-full border border-[#cbd6e2] bg-white px-4 py-1.5 text-xs font-semibold text-[#33475b] transition-colors hover:bg-[#f0f2f5]"
          >
            Bezárás
          </button>
        </form>
      </div>

      <!-- Mode Switcher Tabs -->
      <div
        role="tablist"
        aria-label="Fiókművelet választása"
        class="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-[#dbe4ed] bg-white p-1"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'login'"
          class="min-h-[38px] cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
          :class="
            mode === 'login'
              ? 'bg-[#00565b] text-white shadow-2xs'
              : 'text-[#516f90] hover:bg-[#f5f8fa] hover:text-[#213343]'
          "
          @click="switchMode('login')"
        >
          Bejelentkezés
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'register'"
          class="min-h-[38px] cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
          :class="
            mode === 'register' || mode === 'reset'
              ? 'bg-[#00565b] text-white shadow-2xs'
              : 'text-[#516f90] hover:bg-[#f5f8fa] hover:text-[#213343]'
          "
          @click="switchMode('register')"
        >
          Fiók létrehozása
        </button>
      </div>
    </div>

    <div class="space-y-4 p-6">
      <!-- Feedback Messages -->
      <div
        v-if="errorMessage"
        role="alert"
        aria-live="assertive"
        class="rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs font-medium text-rose-800"
      >
        {{ errorMessage }}
      </div>
      <div
        v-if="statusMessage"
        role="status"
        aria-live="polite"
        class="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-900"
      >
        {{ statusMessage }}
      </div>

      <!-- Screen-reader announcement for password unmasking -->
      <span id="auth-password-visibility-note" class="visually-hidden">
        Figyelem: ez a gomb megjeleníti a begépelt jelszót a képernyőn.
      </span>

      <!-- ================================================================== -->
      <!-- 1. SIGN IN FORM                                                     -->
      <!-- ================================================================== -->
      <form
        v-if="mode === 'login'"
        ref="activeFormRef"
        method="post"
        class="space-y-4"
        novalidate
        @submit.prevent="handleLoginSubmit"
        @input="syncValidationState($event.target, 'input')"
        @focusout="syncValidationState($event.target, 'blur')"
      >
        <div>
          <label for="auth-login-identifier" class="block text-sm font-semibold text-[#213343]">
            E-mail cím vagy Discord / GitHub felhasználónév <span aria-hidden="true" class="text-[#d93b00]">*</span>
          </label>
          <input
            id="auth-login-identifier"
            v-model="loginIdentifier"
            name="username"
            type="text"
            autocomplete="username"
            autocorrect="off"
            autocapitalize="none"
            spellcheck="false"
            enterkeyhint="next"
            required
            placeholder="dev@pelda.hu vagy felhasznalonev"
            class="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#7c98b6] bg-white px-3.5 py-2 text-base text-[#213343] placeholder-[#7c98b6] focus:border-[#00565b]"
          />
        </div>

        <div>
          <div class="flex items-center justify-between gap-2">
            <label for="auth-login-password" class="block text-sm font-semibold text-[#213343]">
              Jelszó <span aria-hidden="true" class="text-[#d93b00]">*</span>
            </label>
            <button
              type="button"
              class="cursor-pointer text-xs font-semibold text-[#00565b] hover:underline"
              @click="switchMode('reset')"
            >
              Elfelejtett jelszó?
            </button>
          </div>
          <div class="relative mt-1.5 flex items-center">
            <input
              id="auth-login-password"
              v-model="loginPassword"
              name="password"
              :type="showLoginPassword ? 'text' : 'password'"
              autocomplete="current-password"
              enterkeyhint="done"
              required
              placeholder="••••••••"
              class="min-h-[44px] w-full rounded-xl border border-[#7c98b6] bg-white py-2 pl-3.5 pr-20 text-base text-[#213343] placeholder-[#7c98b6] focus:border-[#00565b]"
            />
            <button
              type="button"
              :aria-pressed="showLoginPassword"
              aria-describedby="auth-password-visibility-note"
              class="absolute right-2 min-h-[34px] cursor-pointer rounded-lg px-2.5 text-xs font-semibold text-[#516f90] hover:bg-[#f0f2f5] hover:text-[#213343]"
              @click="showLoginPassword = !showLoginPassword"
            >
              {{ showLoginPassword ? 'Elrejt' : 'Mutat' }}
            </button>
          </div>
        </div>

        <p class="text-xs leading-relaxed text-[#516f90]">
          Bejelentkezés után közvetlenül szerkesztheted vagy azonnal eltávolíthatod a saját projektjeidet a piactérről.
        </p>

        <div class="flex items-center justify-end gap-3 border-t border-[#edf1f5] pt-4">
          <button
            type="submit"
            :disabled="isBusy"
            class="min-h-[44px] w-full cursor-pointer rounded-full bg-[#d93b00] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#b83200] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ isBusy ? 'Bejelentkezés...' : 'Bejelentkezés' }}
          </button>
        </div>
      </form>

      <!-- ================================================================== -->
      <!-- 2. CERTIFIED DEVELOPER SIGN-UP OR PASSWORD RESET                   -->
      <!-- ================================================================== -->
      <template v-else>
        <!-- Certification Requirement & Discord Code Request Helper (separate from form) -->
        <div class="rounded-xl border border-[#00565b]/25 bg-[#f0f7f7] p-4 text-xs text-[#213343]">
          <p class="font-bold text-[#00565b]">
            Csak a Discord szerveren „Hitelesített Fejlesztő” ranggal rendelkező tagok regisztrálhatnak
          </p>
          <ol class="mt-2 list-decimal space-y-1 pl-4 text-[#33475b]">
            <li>
              Ha még nincs meg a rangod, futtasd a <code class="rounded bg-white px-1 py-0.5 font-mono">/hitelesites github:neved</code> parancsot a
              <a
                href="https://discord.gg/kNt5sqzM6w"
                target="_blank"
                rel="noopener noreferrer"
                class="font-semibold text-[#00565b] underline"
              >StrataHu Discordon</a>.
            </li>
            <li>
              Kérj egyszer használatos aktiváló kódot a <code class="rounded bg-white px-1 py-0.5 font-mono">/fiok</code> paranccsal Discordon, vagy küldesd el DM-ben alább:
            </li>
          </ol>

          <div class="mt-3 flex flex-col gap-2 sm:flex-row">
            <div class="min-w-0 flex-1">
              <label for="auth-discord-dm-handle" class="visually-hidden">
                Discord felhasználónév DM kód kéréséhez
              </label>
              <input
                id="auth-discord-dm-handle"
                v-model="discordUsernameForCode"
                type="text"
                autocorrect="off"
                autocapitalize="none"
                spellcheck="false"
                enterkeyhint="send"
                placeholder="Discord felhasználóneved (pl. dev_nev)"
                class="min-h-[40px] w-full rounded-lg border border-[#7c98b6] bg-white px-3 py-1.5 text-sm text-[#213343] placeholder-[#7c98b6] focus:border-[#00565b]"
              />
            </div>
            <button
              type="button"
              :disabled="isSendingCode"
              class="min-h-[40px] shrink-0 cursor-pointer rounded-lg border border-[#00565b] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#00565b] transition-colors hover:bg-[#00565b] hover:text-white disabled:opacity-50"
              @click="handleRequestDiscordDmCode(mode === 'reset' ? 'reset' : 'register')"
            >
              {{ isSendingCode ? 'Küldés...' : 'Kód kérése Discord DM-be' }}
            </button>
          </div>
        </div>

        <!-- Register Form -->
        <form
          v-if="mode === 'register'"
          ref="activeFormRef"
          method="post"
          class="space-y-4"
          novalidate
          @submit.prevent="handleRegisterSubmit"
          @input="syncValidationState($event.target, 'input')"
          @focusout="syncValidationState($event.target, 'blur')"
        >
          <div>
            <label for="auth-register-code" class="block text-sm font-semibold text-[#213343]">
              Discord aktiváló kód <span aria-hidden="true" class="text-[#d93b00]">*</span>
            </label>
            <input
              id="auth-register-code"
              v-model="verificationCode"
              name="otp"
              type="text"
              autocomplete="one-time-code"
              autocorrect="off"
              autocapitalize="none"
              spellcheck="false"
              enterkeyhint="next"
              required
              minlength="6"
              placeholder="SH-XXXX-XXXX"
              class="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#7c98b6] bg-white px-3.5 py-2 font-mono text-base uppercase text-[#213343] placeholder-[#7c98b6] focus:border-[#00565b]"
            />
          </div>

          <div>
            <label for="auth-register-email" class="block text-sm font-semibold text-[#213343]">
              E-mail cím (belépéshez) <span aria-hidden="true" class="text-[#d93b00]">*</span>
            </label>
            <input
              id="auth-register-email"
              v-model="regEmail"
              name="email"
              type="email"
              autocomplete="username"
              spellcheck="false"
              enterkeyhint="next"
              required
              placeholder="fejleszto@pelda.hu"
              class="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#7c98b6] bg-white px-3.5 py-2 text-base text-[#213343] placeholder-[#7c98b6] focus:border-[#00565b]"
            />
          </div>

          <div>
            <label for="auth-register-name" class="block text-sm font-semibold text-[#213343]">
              Megjelenített név <span class="font-normal text-[#516f90]">(Opcionális)</span>
            </label>
            <input
              id="auth-register-name"
              v-model="regDisplayName"
              name="name"
              type="text"
              autocomplete="name"
              enterkeyhint="next"
              maxlength="80"
              placeholder="Teljes neved vagy alkotói neved"
              class="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#7c98b6] bg-white px-3.5 py-2 text-base text-[#213343] placeholder-[#7c98b6] focus:border-[#00565b]"
            />
          </div>

          <div>
            <label for="auth-register-password" class="block text-sm font-semibold text-[#213343]">
              Jelszó <span aria-hidden="true" class="text-[#d93b00]">*</span>
            </label>
            <span id="auth-reg-pw-hint" class="block text-xs text-[#516f90]">Legalább 8 karakter.</span>
            <div class="relative mt-1.5 flex items-center">
              <input
                id="auth-register-password"
                v-model="regPassword"
                name="new-password"
                :type="showRegPassword ? 'text' : 'password'"
                autocomplete="new-password"
                aria-describedby="auth-reg-pw-hint"
                enterkeyhint="done"
                required
                minlength="8"
                maxlength="128"
                placeholder="Legalább 8 karakter"
                class="min-h-[44px] w-full rounded-xl border border-[#7c98b6] bg-white py-2 pl-3.5 pr-20 text-base text-[#213343] placeholder-[#7c98b6] focus:border-[#00565b]"
              />
              <button
                type="button"
                :aria-pressed="showRegPassword"
                aria-describedby="auth-password-visibility-note"
                class="absolute right-2 min-h-[34px] cursor-pointer rounded-lg px-2.5 text-xs font-semibold text-[#516f90] hover:bg-[#f0f2f5] hover:text-[#213343]"
                @click="showRegPassword = !showRegPassword"
              >
                {{ showRegPassword ? 'Elrejt' : 'Mutat' }}
              </button>
            </div>
          </div>

          <div class="border-t border-[#edf1f5] pt-4">
            <button
              type="submit"
              :disabled="isBusy"
              class="min-h-[44px] w-full cursor-pointer rounded-full bg-[#d93b00] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#b83200] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ isBusy ? 'Fiók létrehozása...' : 'Fiók létrehozása' }}
            </button>
          </div>
        </form>

        <!-- Password Reset Form -->
        <form
          v-else
          ref="activeFormRef"
          method="post"
          class="space-y-4"
          novalidate
          @submit.prevent="handleResetSubmit"
          @input="syncValidationState($event.target, 'input')"
          @focusout="syncValidationState($event.target, 'blur')"
        >
          <div>
            <label for="auth-reset-code" class="block text-sm font-semibold text-[#213343]">
              Discord visszaállító kód <span aria-hidden="true" class="text-[#d93b00]">*</span>
            </label>
            <input
              id="auth-reset-code"
              v-model="verificationCode"
              name="otp"
              type="text"
              autocomplete="one-time-code"
              autocorrect="off"
              autocapitalize="none"
              spellcheck="false"
              enterkeyhint="next"
              required
              minlength="6"
              placeholder="SH-XXXX-XXXX"
              class="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#7c98b6] bg-white px-3.5 py-2 font-mono text-base uppercase text-[#213343] placeholder-[#7c98b6] focus:border-[#00565b]"
            />
          </div>

          <div>
            <label for="auth-reset-password" class="block text-sm font-semibold text-[#213343]">
              Új jelszó <span aria-hidden="true" class="text-[#d93b00]">*</span>
            </label>
            <div class="relative mt-1.5 flex items-center">
              <input
                id="auth-reset-password"
                v-model="regPassword"
                name="new-password"
                :type="showRegPassword ? 'text' : 'password'"
                autocomplete="new-password"
                enterkeyhint="done"
                required
                minlength="8"
                maxlength="128"
                placeholder="Legalább 8 karakter"
                class="min-h-[44px] w-full rounded-xl border border-[#7c98b6] bg-white py-2 pl-3.5 pr-20 text-base text-[#213343] placeholder-[#7c98b6] focus:border-[#00565b]"
              />
              <button
                type="button"
                :aria-pressed="showRegPassword"
                aria-describedby="auth-password-visibility-note"
                class="absolute right-2 min-h-[34px] cursor-pointer rounded-lg px-2.5 text-xs font-semibold text-[#516f90] hover:bg-[#f0f2f5] hover:text-[#213343]"
                @click="showRegPassword = !showRegPassword"
              >
                {{ showRegPassword ? 'Elrejt' : 'Mutat' }}
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between gap-3 border-t border-[#edf1f5] pt-4">
            <button
              type="button"
              class="cursor-pointer text-xs font-semibold text-[#516f90] hover:text-[#213343]"
              @click="switchMode('login')"
            >
              ← Vissza a belépéshez
            </button>
            <button
              type="submit"
              :disabled="isBusy"
              class="min-h-[44px] cursor-pointer rounded-full bg-[#d93b00] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#b83200] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ isBusy ? 'Mentés...' : 'Jelszó frissítése' }}
            </button>
          </div>
        </form>
      </template>
    </div>
  </dialog>
</template>
