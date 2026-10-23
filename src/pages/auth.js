import { api } from '../api/index.js';
import { config } from '../config.js';
import { h } from '../lib/dom.js';
import { errorMessage, t } from '../i18n/index.js';
import { navigate } from '../lib/navigation.js';
import { safeNext } from '../lib/url.js';
import { setPageTitle } from '../lib/seo.js';
import { validateForgotPassword, validateLogin, validateSignup } from '../lib/validation.js';
import { refreshBadges } from '../lib/session.js';
import { store } from '../store.js';
import { icon } from '../ui/icons.js';
import { toast } from '../ui/toast.js';
import { loadingPage } from '../ui/auth-gate.js';

function passwordField({ id, name, label, autocomplete, descriptionId }) {
  const input = h('input', {
    class: 'field__input',
    id,
    name,
    type: 'password',
    placeholder: t('auth.passwordPlaceholder'),
    autocomplete,
    minlength: '8',
    required: true,
    'aria-describedby': descriptionId,
  });
  let visible = false;
  const toggle = h(
    'button',
    {
      class: 'field__password-toggle',
      type: 'button',
      'aria-label': t('auth.showPassword'),
      'aria-pressed': 'false',
      onClick: () => {
        visible = !visible;
        input.type = visible ? 'text' : 'password';
        toggle.setAttribute('aria-label', t(visible ? 'auth.hidePassword' : 'auth.showPassword'));
        toggle.setAttribute('aria-pressed', String(visible));
        toggle.replaceChildren(icon(visible ? 'eye-off' : 'eye', { size: 19 }));
      },
    },
    icon('eye', { size: 19 }),
  );
  const wrapper = h('div', { class: 'field__password-wrap' }, input, toggle);
  return { input, wrapper, label };
}

export function render({ route, query }) {
  document.body.dataset.page = 'auth';
  const mode = route.name;
  const next = safeNext(query.next || '', '/');
  const signedIn = store.getState().auth.status === 'signedIn';

  if (signedIn && (mode === 'login' || mode === 'signup')) {
    queueMicrotask(() => navigate(next === '/' ? '/me' : next));
    return loadingPage();
  }

  const isSignup = mode === 'signup';
  const isForgot = mode === 'forgot';
  const title = isSignup
    ? t('auth.signupTitle')
    : isForgot
      ? t('auth.forgotTitle')
      : t('auth.loginTitle');
  const subtitle = isSignup
    ? t('auth.signupSubtitle')
    : isForgot
      ? t('auth.forgotSubtitle')
      : t('auth.loginSubtitle');
  setPageTitle(isSignup ? t('auth.signupPageTitle') : title);

  const alertBox = h('div', { role: 'alert', 'aria-live': 'assertive' });
  const errorNodes = new Map();
  const inputs = new Map();

  function errorNode(name) {
    const node = h('p', { class: 'field__error', id: `auth-${name}-error`, hidden: true });
    errorNodes.set(name, node);
    return node;
  }

  function register(name, node) {
    inputs.set(name, node);
    node.addEventListener('input', () => {
      clearError(name);
      alertBox.replaceChildren();
    });
    return node;
  }

  function clearError(name) {
    const node = errorNodes.get(name);
    const input = inputs.get(name);
    if (node) {
      node.hidden = true;
      node.replaceChildren();
    }
    if (input) input.removeAttribute('aria-invalid');
  }

  function showError(name, key) {
    const node = errorNodes.get(name);
    const input = inputs.get(name);
    if (!node) return;
    node.replaceChildren(icon('alert-circle', { size: 15 }), h('span', {}, t(key)));
    node.hidden = false;
    if (input) input.setAttribute('aria-invalid', 'true');
  }

  function showAlert(message) {
    alertBox.replaceChildren(
      h(
        'div',
        { class: 'alert alert--danger', style: { marginBottom: '16px' } },
        icon('alert-circle', { size: 18 }),
        h('span', {}, message),
      ),
    );
  }

  const emailInput = register(
    'email',
    h('input', {
      class: 'field__input',
      id: 'auth-email',
      name: 'email',
      type: 'email',
      inputMode: 'email',
      autocomplete: 'email',
      placeholder: t('auth.emailPlaceholder'),
      value: '',
      autofocus: true,
      required: true,
      'aria-describedby': 'auth-email-error',
    }),
  );

  const password = passwordField({
    id: 'auth-password',
    name: 'password',
    label: t('auth.password'),
    autocomplete: isSignup ? 'new-password' : 'current-password',
    descriptionId: 'auth-password-error',
  });
  register('password', password.input);

  const nameInput = isSignup
    ? register(
        'name',
        h('input', {
          class: 'field__input',
          id: 'auth-name',
          name: 'name',
          type: 'text',
          autocomplete: 'name',
          placeholder: t('auth.namePlaceholder'),
          required: true,
          'aria-describedby': 'auth-name-error',
        }),
      )
    : null;

  const phoneInput = isSignup
    ? register(
        'phone',
        h('input', {
          class: 'field__input',
          id: 'auth-phone',
          name: 'phone',
          type: 'tel',
          inputMode: 'tel',
          autocomplete: 'tel',
          placeholder: t('auth.phonePlaceholder'),
          required: true,
          'aria-describedby': 'auth-phone-error',
        }),
      )
    : null;

  let submitting = false;
  const submitButton = h(
    'button',
    { class: 'btn btn--primary btn--block', type: 'submit' },
    isSignup ? t('auth.signup') : isForgot ? t('auth.sendReset') : t('auth.login'),
  );

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    alertBox.replaceChildren();

    const values = {
      email: emailInput.value.trim(),
      password: password.input.value,
      name: nameInput?.value.trim() || '',
      phone: phoneInput?.value.trim() || '',
    };

    let validation;
    if (isSignup) validation = validateSignup(values);
    else if (isForgot) validation = validateForgotPassword(values.email);
    else validation = validateLogin(values);

    if (!validation.ok) {
      if (isForgot) {
        showError('email', validation.error);
      } else {
        for (const [name, key] of Object.entries(validation.errors)) showError(name, key);
      }
      const first = document.querySelector('[aria-invalid="true"]');
      first?.focus();
      return;
    }

    submitting = true;
    submitButton.disabled = true;
    submitButton.textContent = isSignup
      ? t('auth.signingUp')
      : isForgot
        ? t('auth.sendingReset')
        : t('auth.signingIn');

    try {
      if (isForgot) {
        await api.auth.reset(values.email);
        alertBox.replaceChildren(
          h(
            'div',
            { class: 'alert alert--success', style: { marginBottom: '16px' } },
            icon('check-circle', { size: 18 }),
            h('span', {}, t('auth.resetSent')),
          ),
        );
        submitButton.disabled = false;
        submitButton.textContent = t('auth.sendReset');
        submitting = false;
        return;
      }

      const auth = isSignup
        ? await api.auth.signup({
            name: values.name,
            email: values.email,
            phone: values.phone,
            password: values.password,
            cityId: store.getState().cityId,
          })
        : await api.auth.login({
            email: values.email,
            password: values.password,
            cityId: store.getState().cityId,
          });

      store.setState({ auth });
      await refreshBadges();
      toast.success(t(isSignup ? 'auth.accountCreated' : 'auth.welcomeBack'));
      navigate(next === '/' ? (isSignup ? '/me' : '/') : next);
    } catch (error) {
      showAlert(
        errorMessage(
          error,
          isSignup ? 'auth.errorSignup' : isForgot ? 'auth.errorReset' : 'auth.errorGeneric',
        ),
      );
      submitting = false;
      submitButton.disabled = false;
      submitButton.textContent = isSignup
        ? t('auth.signup')
        : isForgot
          ? t('auth.sendReset')
          : t('auth.login');
    }
  }

  const switchLink = (href, label, active) =>
    h(
      'a',
      {
        class: 'auth-switch__btn',
        href,
        'aria-current': active ? 'page' : null,
      },
      label,
    );

  const form = h(
    'form',
    { class: 'form', noValidate: true, onSubmit: handleSubmit },
    alertBox,
    isSignup
      ? h(
          'div',
          { class: 'field' },
          h('label', { class: 'field__label', for: 'auth-name' }, t('auth.name')),
          nameInput,
          errorNode('name'),
        )
      : null,
    h(
      'div',
      { class: 'field' },
      h('label', { class: 'field__label', for: 'auth-email' }, t('auth.email')),
      emailInput,
      errorNode('email'),
    ),
    isSignup
      ? h(
          'div',
          { class: 'field' },
          h('label', { class: 'field__label', for: 'auth-phone' }, t('auth.phone')),
          phoneInput,
          errorNode('phone'),
        )
      : null,
    !isForgot
      ? h(
          'div',
          { class: 'field' },
          h(
            'div',
            { class: 'field__label' },
            h('label', { for: 'auth-password' }, t('auth.password')),
            mode === 'login'
              ? h('a', { class: 'field__optional', href: '/forgot' }, t('auth.forgot'))
              : h('span', { class: 'field__optional' }, t('auth.passwordHint')),
          ),
          password.wrapper,
          errorNode('password'),
        )
      : null,
    submitButton,
  );

  const content = h(
    'div',
    { class: 'auth-page page' },
    h(
      'div',
      { class: 'auth-head' },
      h('div', { class: 'auth-head__mark' }, icon('store', { size: 26 })),
      h('h1', { class: 'auth-head__title' }, title),
      h('p', { class: 'auth-head__subtitle' }, subtitle),
    ),
    h(
      'div',
      { class: 'auth-card' },
      !isForgot
        ? h(
            'div',
            { class: 'auth-switch', role: 'group', 'aria-label': t('common.appName') },
            switchLink(
              `/login?next=${encodeURIComponent(next)}`,
              t('auth.login'),
              mode === 'login',
            ),
            switchLink(
              `/signup?next=${encodeURIComponent(next)}`,
              t('auth.signup'),
              mode === 'signup',
            ),
          )
        : null,
      form,
      mode === 'login' && config.useMock
        ? h(
            'div',
            {},
            h('div', { class: 'auth-divider' }, t('common.demo')),
            h(
              'button',
              {
                class: 'btn btn--secondary btn--block',
                type: 'button',
                onClick: () => {
                  emailInput.value = 'demo@example.com';
                  password.input.value = 'demo1234';
                  form.requestSubmit();
                },
              },
              icon('user', { size: 18 }),
              t('auth.demoAccount'),
            ),
            h('p', { class: 'auth-note' }, t('auth.demoNote')),
          )
        : null,
      isSignup && config.useMock ? h('p', { class: 'auth-note' }, t('auth.demoNote')) : null,
      isForgot
        ? h('p', { class: 'auth-footer' }, h('a', { href: '/login' }, t('auth.switchLogin')))
        : null,
    ),
    !isForgot
      ? h(
          'p',
          { class: 'auth-footer' },
          isSignup ? t('auth.haveAccount') : t('auth.noAccount'),
          ' ',
          h(
            'a',
            {
              href: `${isSignup ? '/login' : '/signup'}?next=${encodeURIComponent(next)}`,
            },
            isSignup ? t('auth.switchLogin') : t('auth.switchSignup'),
          ),
        )
      : null,
  );

  return content;
}
