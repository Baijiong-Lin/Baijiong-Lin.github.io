'use strict';

document.documentElement.classList.add('js');

// All interactions work locally without frameworks or CDN scripts.
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

document.querySelectorAll('a[href]').forEach(link => {
  const href = link.getAttribute('href');
  if (/^https?:\/\//.test(href) || /\.pdf(?:$|[?#])/.test(href)) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
});

// Mobile navigation, including keyboard dismissal.
const menuButton = document.querySelector('.topnav-toggler');
const menu = document.getElementById('topnavMenu');
function closeMenu() {
  menu.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.querySelector('span').textContent = '+';
}
menuButton.addEventListener('click', () => {
  const open = menu.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.querySelector('span').textContent = open ? '−' : '+';
});
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.classList.contains('is-open')) {
    closeMenu();
    menuButton.focus();
  }
});

const sections = [...document.querySelectorAll('section.sec[id]')];
const navLinks = [...document.querySelectorAll('.topnav-link')];
let scrollQueued = false;
function updateNavigation() {
  let current = '';
  sections.forEach(section => {
    if (section.getBoundingClientRect().top <= 150) current = section.id;
  });
  navLinks.forEach(link => {
    const active = link.hash === '#' + current;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  scrollQueued = false;
}
window.addEventListener('scroll', () => {
  if (!scrollQueued) {
    scrollQueued = true;
    requestAnimationFrame(updateNavigation);
  }
}, { passive: true });
window.addEventListener('resize', updateNavigation);
window.addEventListener('load', updateNavigation);
updateNavigation();

// Show a short news list while keeping earlier updates accessible.
document.querySelectorAll('.news[data-news-visible]').forEach((list, listIndex) => {
  const visible = Number(list.dataset.newsVisible) || 3;
  const items = [...list.children];
  const hiddenCount = items.length / 2 - visible;
  if (hiddenCount <= 0) return;
  list.id = list.id || 'news-list-' + listIndex;
  items.slice(visible * 2).forEach(item => item.classList.add('news-hidden'));
  const wrap = document.createElement('div');
  wrap.className = 'news-toggle';
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-controls', list.id);
  const label = () => {
    const expanded = list.classList.contains('is-expanded');
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? 'Fewer updates −' : `Earlier updates (${hiddenCount}) +`;
  };
  button.addEventListener('click', () => {
    list.classList.toggle('is-expanded');
    label();
  });
  label();
  wrap.append(button);
  list.after(wrap);
});

// Publication tabs retain the complete lists and support keyboard navigation.
const publicationTabs = [...document.querySelectorAll('.pub-tab')];
function selectPublicationTab(selected, focus = false) {
  closeBibtexPanels();
  publicationTabs.forEach(tab => {
    const active = tab === selected;
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;
  });
  if (focus) selected.focus();
}
publicationTabs.forEach((tab, index) => {
  const panel = document.getElementById(tab.getAttribute('aria-controls'));
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', tab.id);
  panel.tabIndex = 0;
  tab.querySelector('.pub-count').textContent = panel.querySelectorAll('.pub').length;
  tab.addEventListener('click', () => selectPublicationTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % publicationTabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + publicationTabs.length) % publicationTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = publicationTabs.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      selectPublicationTab(publicationTabs[next], true);
    }
  });
});
function selectLinkedPublicationGroup() {
  const linkedTab = publicationTabs.find(tab => '#' + tab.getAttribute('aria-controls') === location.hash);
  if (linkedTab) selectPublicationTab(linkedTab);
}
if (publicationTabs.length) {
  selectPublicationTab(publicationTabs[0]);
  selectLinkedPublicationGroup();
  window.addEventListener('hashchange', selectLinkedPublicationGroup);
}

// Keep one citation open; clicks inside it preserve selection and copying.
function closeBibtexPanels({ restoreFocus = false } = {}) {
  document.querySelectorAll('.bibtex-toggle[aria-expanded="true"]').forEach(button => {
    const content = document.getElementById(button.getAttribute('aria-controls'));
    const focusInside = content && content.contains(document.activeElement);
    if (content) content.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (restoreFocus && focusInside) button.focus();
  });
}

document.querySelectorAll('.bibtex-toggle').forEach(button => {
  const content = document.getElementById(button.getAttribute('aria-controls'));
  if (!content) return;
  button.addEventListener('click', () => {
    const wasOpen = !content.hidden;
    closeBibtexPanels();
    if (!wasOpen) {
      content.hidden = false;
      button.setAttribute('aria-expanded', 'true');
    }
  });
});

document.addEventListener('click', event => {
  if (event.target.closest('.bibtex-toggle, .bibtex-content')) return;
  closeBibtexPanels();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeBibtexPanels({ restoreFocus: true });
});

async function copyToClipboard(text, button) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;opacity:0;';
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    button.focus();
    if (!copied) throw new Error('Copy failed');
  }
}

const emailLink = document.querySelector('.email-link');
if (emailLink) {
  const button = document.createElement('button');
  button.className = 'email-copy';
  button.type = 'button';
  button.textContent = 'Copy';
  button.setAttribute('aria-label', 'Copy email address to clipboard');
  button.setAttribute('aria-live', 'polite');
  emailLink.after(button);
  button.addEventListener('click', async () => {
    try {
      await copyToClipboard(emailLink.getAttribute('href').slice('mailto:'.length), button);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Copy failed';
    }
    setTimeout(() => { button.textContent = 'Copy'; }, 2000);
  });
}

document.querySelectorAll('.snippet').forEach(snippet => {
  const code = snippet.querySelector('code');
  if (!code) return;
  const button = document.createElement('button');
  button.className = 'copy-button';
  button.type = 'button';
  button.textContent = 'Copy';
  button.setAttribute('aria-label', 'Copy BibTeX to clipboard');
  button.setAttribute('aria-live', 'polite');
  snippet.append(button);
  button.addEventListener('click', async () => {
    try {
      await copyToClipboard(code.textContent, button);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Select text to copy';
    }
    setTimeout(() => { button.textContent = 'Copy'; }, 2000);
  });
});
