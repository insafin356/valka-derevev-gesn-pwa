import {
  APP_VERSION,
  CONTROL,
  GESN,
  NORM_REFERENCE,
  OPTIONS,
  TECHNOLOGIES,
  blankCommissionMember,
  calculateTree,
  createBlankProject,
  createBlankTree,
  createDemoProject,
  createId,
  formatDate,
  formatNumber,
  getProjectSummary,
  normalizeImportedProject,
  plural,
} from './domain.js';
import { clearAppState, loadAppState, saveAppState, storageEstimate } from './storage.js';
import {
  PRINT_CSS,
  buildStandaloneDocument,
  escapeHtml,
  renderDocument,
} from './templates.js';

const appView = document.getElementById('appView');
const projectSwitcher = document.getElementById('projectSwitcher');
const saveStatus = document.getElementById('saveStatus');
const modalRoot = document.getElementById('modalRoot');
const toastRegion = document.getElementById('toastRegion');
const menuButton = document.getElementById('menuButton');
const installButton = document.getElementById('installButton');
const offlineBanner = document.getElementById('offlineBanner');

const ROUTES = new Set(['dashboard', 'project', 'registry', 'documents', 'requirements', 'settings']);

let state = {
  version: 1,
  activeProjectId: '',
  projects: [],
};

const ui = {
  route: 'dashboard',
  registrySearch: '',
  registryFilter: 'all',
  documentTab: 'act',
  editingTree: null,
  installPrompt: null,
  saveTimer: null,
  resizeTimer: null,
};

function currentProject() {
  return state.projects.find((project) => project.id === state.activeProjectId) || state.projects[0];
}

function currentProjectIndex() {
  return state.projects.findIndex((project) => project.id === state.activeProjectId);
}

function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function sanitizeFileName(value) {
  return String(value || 'объект')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 90) || 'объект';
}

function setByPath(object, path, value) {
  const parts = path.split('.');
  let cursor = object;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (cursor[part] === undefined || cursor[part] === null) {
      cursor[part] = /^\d+$/.test(parts[index + 1]) ? [] : {};
    }
    cursor = cursor[part];
  }
  cursor[parts.at(-1)] = value;
}

function getByPath(object, path) {
  return path.split('.').reduce((cursor, key) => cursor?.[key], object);
}

function touchProject(project = currentProject()) {
  if (project) project.updatedAt = new Date().toISOString();
}

function markDirty(message = 'Сохранение…') {
  saveStatus.textContent = message;
  clearTimeout(ui.saveTimer);
  ui.saveTimer = setTimeout(async () => {
    try {
      await saveAppState(state);
      saveStatus.textContent = `Сохранено ${new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date())}`;
    } catch (error) {
      console.error(error);
      saveStatus.textContent = 'Ошибка сохранения';
      toast('Не удалось сохранить данные на устройстве.', 'error');
    }
  }, 250);
}

async function persistNow() {
  clearTimeout(ui.saveTimer);
  await saveAppState(state);
  saveStatus.textContent = `Сохранено ${new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())}`;
}

function toast(message, type = '') {
  const element = document.createElement('div');
  element.className = `toast ${type}`.trim();
  element.textContent = message;
  toastRegion.append(element);
  setTimeout(() => element.remove(), 3600);
}

function optionMarkup(options, selected, placeholder = 'Выберите значение') {
  return [
    `<option value="">${escapeHtml(placeholder)}</option>`,
    ...options.map(
      (option) =>
        `<option value="${escapeHtml(option)}" ${option === selected ? 'selected' : ''}>${escapeHtml(option)}</option>`,
    ),
  ].join('');
}

function boundInput({
  path,
  label,
  type = 'text',
  span = 4,
  required = false,
  placeholder = '',
  help = '',
  options = null,
  rows = 4,
  inputClass = '',
}) {
  const project = currentProject();
  const value = getByPath(project, path) ?? '';
  const labelHtml = `${escapeHtml(label)}${required ? ' <span class="required-mark">*</span>' : ''}`;
  const classes = `field span-${span} ${inputClass}`.trim();
  let control;
  if (options) {
    control = `<select data-bind="${escapeHtml(path)}">${optionMarkup(options, value)}</select>`;
  } else if (type === 'textarea') {
    control = `<textarea data-bind="${escapeHtml(path)}" rows="${rows}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>`;
  } else {
    control = `<input data-bind="${escapeHtml(path)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}">`;
  }
  return `<div class="${classes}"><label>${labelHtml}</label>${control}${help ? `<small>${escapeHtml(help)}</small>` : ''}</div>`;
}

function updateProjectSwitcher() {
  const active = state.activeProjectId;
  projectSwitcher.innerHTML = state.projects
    .map(
      (project) =>
        `<option value="${escapeHtml(project.id)}" ${project.id === active ? 'selected' : ''}>${escapeHtml(project.meta?.objectName || 'Без названия')}</option>`,
    )
    .join('');
}

function updateNavigation() {
  document.querySelectorAll('[data-route]').forEach((link) => {
    link.classList.toggle('active', link.dataset.route === ui.route);
  });
}

function routeFromLocation() {
  const requested = location.hash.replace(/^#/, '') || 'dashboard';
  ui.route = ROUTES.has(requested) ? requested : 'dashboard';
}

function navigate(route) {
  location.hash = `#${route}`;
}

function render() {
  updateProjectSwitcher();
  updateNavigation();
  document.body.classList.remove('nav-open');
  const project = currentProject();
  if (!project) return;

  const pages = {
    dashboard: renderDashboard,
    project: renderProjectPage,
    registry: renderRegistry,
    documents: renderDocuments,
    requirements: renderRequirements,
    settings: renderSettings,
  };

  appView.innerHTML = pages[ui.route](project);
  document.title = `${pageTitle(ui.route)} — Валка деревьев ГЭСН 01/47`;
  appView.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'auto' });

  if (ui.route === 'documents') requestAnimationFrame(scaleDocumentPreview);
  if (ui.route === 'settings') void updateStorageEstimate();
}

function pageTitle(route) {
  return {
    dashboard: 'Главная',
    project: 'Объект и комиссия',
    registry: 'Реестр деревьев',
    documents: 'Документы',
    requirements: 'Требования к проектировщику',
    settings: 'Данные и настройки',
  }[route];
}

function pageHeader(title, subtitle, actions = '') {
  return `
    <div class="page-header">
      <div class="page-header-text"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ''}
    </div>`;
}

function renderDashboard(project) {
  const summary = getProjectSummary(project);
  const completion = summary.total ? Math.round((summary.sufficientCount / summary.total) * 100) : 0;
  const maxObstacle = Math.max(1, ...summary.obstacleDistribution.map((item) => item.count));
  const issues = summary.calculated.filter(({ result }) => !result.isSufficient).slice(0, 6);

  const obstacleBlock = summary.obstacleDistribution.length
    ? `<div class="progress-list">${summary.obstacleDistribution
        .map(
          (item) => `
          <div class="progress-row">
            <span class="label" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
            <span class="progress-track"><span class="progress-fill" style="width:${Math.max(5, (item.count / maxObstacle) * 100)}%"></span></span>
            <strong>${item.count}</strong>
          </div>`,
        )
        .join('')}</div>`
    : '<div class="empty-panel"><div class="empty-icon">♧</div><h3>Нет данных</h3><p>Распределение появится после заполнения реестра.</p></div>';

  const issuesBlock = issues.length
    ? `<div class="issue-list">${issues
        .map(({ tree, result }) => {
          const error = ['contradiction', 'missing', 'undefined'].includes(result.status);
          return `<div class="issue-item ${error ? 'error' : ''}">
            <span class="issue-mark">${error ? '!' : 'i'}</span>
            <div><strong>Дерево № ${escapeHtml(tree.treeNumber)}</strong><p>${escapeHtml(result.control)}</p></div>
            <button class="button button-link" data-action="edit-tree" data-id="${escapeHtml(tree.id)}">Открыть</button>
          </div>`;
        })
        .join('')}</div>`
    : `<div class="success-callout"><h3>${summary.total ? 'Исходные данные согласованы' : 'Реестр пока пуст'}</h3><p>${summary.total ? 'По всем строкам данные достаточны для автоматического выбора нормы.' : 'Добавьте первое дерево, чтобы приложение сформировало технологию, норму и документы.'}</p></div>`;

  return `
    <div class="page-shell">
      ${pageHeader(
        project.meta.objectName || 'Объект без названия',
        project.meta.address || project.meta.routeSection || 'Заполните сведения об объекте и приступайте к обследованию.',
        `<button class="button" data-action="add-tree">＋ Добавить дерево</button><button class="button button-secondary" data-action="open-projects">Объекты</button>`,
      )}

      <div class="dashboard-grid">
        <div class="kpi-grid">
          <div class="card kpi-card kpi-total"><span class="kpi-label">Всего обследовано</span><strong class="kpi-value">${summary.total}</strong><span class="kpi-note">заполненных строк реестра</span></div>
          <div class="card kpi-card kpi-whole"><span class="kpi-label">Валка целиком</span><strong class="kpi-value">${summary.wholeCount}</strong><span class="kpi-note">${GESN.whole}</span></div>
          <div class="card kpi-card kpi-sectional"><span class="kpi-label">Поэтапное спиливание</span><strong class="kpi-value">${summary.sectionalCount}</strong><span class="kpi-note">${GESN.sectional}</span></div>
          <div class="card kpi-card kpi-unresolved"><span class="kpi-label">Требует решения</span><strong class="kpi-value">${summary.unresolvedCount}</strong><span class="kpi-note">замечаний всего: ${summary.remarksCount}</span></div>
        </div>

        <section class="card span-8 conclusion-card">
          <h2>Автоматическое заключение</h2>
          <p>${escapeHtml(summary.conclusion)}</p>
        </section>

        <section class="card span-4">
          <div class="card-header"><div><h2>Готовность данных</h2><p>Строки без замечаний</p></div><strong>${completion}%</strong></div>
          <div class="card-body">
            <div class="progress-track" style="height:14px"><span class="progress-fill" style="width:${completion}%"></span></div>
            <p class="help-text">${summary.sufficientCount} из ${summary.total || 0} строк готовы для выбора нормы.</p>
          </div>
        </section>

        <section class="card span-7">
          <div class="card-header"><div><h2>Критические препятствия</h2><p>Выводятся только категории с ненулевым количеством</p></div></div>
          <div class="card-body">${obstacleBlock}</div>
        </section>

        <section class="card span-5">
          <div class="card-header"><div><h2>Быстрые действия</h2><p>Основной рабочий маршрут</p></div></div>
          <div class="card-body quick-actions">
            <a class="quick-action" href="#registry"><strong>Открыть реестр</strong><small>Добавить и проверить деревья</small></a>
            <a class="quick-action" href="#documents"><strong>Сформировать документы</strong><small>Акт, техрешение, ПОС и ППР</small></a>
            <a class="quick-action" href="#project"><strong>Реквизиты объекта</strong><small>Организации и комиссия</small></a>
            <button class="quick-action" data-action="export-active-json"><strong>Резервная копия</strong><small>Скачать проект в JSON</small></button>
          </div>
        </section>

        <section class="card span-12">
          <div class="card-header"><div><h2>Контроль исходных данных</h2><p>Приоритетные строки для доработки проектировщиком</p></div><a class="button button-link" href="#registry">Все строки</a></div>
          <div class="card-body">${issuesBlock}</div>
        </section>
      </div>
    </div>`;
}

function renderProjectPage(project) {
  const memberCards = project.commission
    .map(
      (member, index) => `
      <div class="commission-card" data-member-index="${index}">
        ${boundMemberInput(index, 'role', 'Сторона / роль', 6, member.role)}
        ${boundMemberInput(index, 'organization', 'Организация', 6, member.organization)}
        ${boundMemberInput(index, 'position', 'Должность', 4, member.position)}
        ${boundMemberInput(index, 'name', 'Ф.И.О.', 4, member.name)}
        ${boundMemberInput(index, 'authority', 'Документ о полномочиях', 4, member.authority)}
        ${boundMemberInput(index, 'date', 'Дата', 3, member.date, 'date')}
        <button class="button button-link remove-member" type="button" data-action="remove-member" data-index="${index}" aria-label="Удалить участника">✕</button>
      </div>`,
    )
    .join('');

  return `
    <div class="page-shell">
      ${pageHeader(
        'Объект и комиссия',
        'Реквизиты используются во всех автоматически формируемых документах.',
        `<button class="button button-secondary" data-action="open-projects">Управление объектами</button><a class="button" href="#registry">Перейти к реестру</a>`,
      )}

      <div class="section-stack">
        <section class="card form-card">
          <div class="card-header"><div><h2>Сведения об объекте</h2><p>Общие проектные и договорные реквизиты</p></div></div>
          <div class="card-body form-grid">
            ${boundInput({ path: 'meta.objectName', label: 'Наименование объекта', span: 8, required: true, inputClass: 'field-input-projector' })}
            ${boundInput({ path: 'meta.projectCode', label: 'Шифр проекта', span: 4, inputClass: 'field-input-projector' })}
            ${boundInput({ path: 'meta.address', label: 'Адрес объекта', span: 8, inputClass: 'field-input-projector' })}
            ${boundInput({ path: 'meta.routeSection', label: 'Участок / пикетаж / трасса', span: 4, inputClass: 'field-input-projector' })}
            ${boundInput({ path: 'meta.stage', label: 'Стадия', span: 3, options: OPTIONS.stages, inputClass: 'field-input-projector' })}
            ${boundInput({ path: 'meta.customer', label: 'Заказчик', span: 5, inputClass: 'field-input-projector' })}
            ${boundInput({ path: 'meta.technicalCustomer', label: 'Технический заказчик', span: 4, inputClass: 'field-input-projector' })}
            ${boundInput({ path: 'meta.designer', label: 'Проектная организация', span: 6, required: true, inputClass: 'field-input-projector' })}
            ${boundInput({ path: 'meta.generalContractor', label: 'Генподрядная организация', span: 6, inputClass: 'field-input-projector' })}
            ${boundInput({ path: 'meta.inspectionBasis', label: 'Основание обследования', span: 6, type: 'textarea', rows: 3, inputClass: 'field-input-projector' })}
            ${boundInput({ path: 'meta.projectSheetReference', label: 'Раздел / лист проекта / ссылка на схему', span: 6, type: 'textarea', rows: 3, inputClass: 'field-input-projector' })}
          </div>
        </section>

        <section class="card form-card">
          <div class="card-header"><div><h2>Реквизиты документов</h2><p>Заполняются один раз и подставляются в акт, техническое решение, ПОС и ППР</p></div></div>
          <div class="card-body form-grid">
            <div class="form-section-title">Акт обследования</div>
            ${boundInput({ path: 'meta.actNumber', label: 'Номер акта', span: 3, inputClass: 'field-input-projector' })}
            ${boundInput({ path: 'meta.actDate', label: 'Дата акта', span: 3, type: 'date', inputClass: 'field-input-projector' })}
            ${boundInput({ path: 'meta.actPlace', label: 'Место составления', span: 6, inputClass: 'field-input-projector' })}
            <div class="form-section-title">Техническое решение и ПОС</div>
            ${boundInput({ path: 'meta.technicalDecisionNumber', label: 'Номер технического решения', span: 4, inputClass: 'field-input-projector' })}
            ${boundInput({ path: 'meta.technicalDecisionDate', label: 'Дата технического решения', span: 3, type: 'date', inputClass: 'field-input-projector' })}
            ${boundInput({ path: 'meta.posSection', label: 'Раздел / лист ПОС', span: 5, inputClass: 'field-input-projector' })}
            <div class="form-section-title">ППР и согласование</div>
            ${boundInput({ path: 'meta.pprNumber', label: 'Номер ППР', span: 4, inputClass: 'field-input-projector' })}
            ${boundInput({ path: 'meta.pprDate', label: 'Дата ППР', span: 3, type: 'date', inputClass: 'field-input-projector' })}
            ${boundInput({ path: 'meta.preparedBy', label: 'Разработал', span: 5, inputClass: 'field-input-projector' })}
            ${boundInput({ path: 'meta.approvedBy', label: 'Утвердил / согласовал', span: 6, inputClass: 'field-input-projector' })}
          </div>
        </section>

        <section class="card form-card">
          <div class="card-header"><div><h2>Состав комиссии</h2><p>Участники автоматически переносятся в акт и лист подписей</p></div><button class="button button-compact button-secondary" data-action="add-member">＋ Добавить</button></div>
          <div class="card-body commission-list">${memberCards}</div>
        </section>

        <section class="card form-card">
          <div class="card-header"><div><h2>Дополнительные пояснения</h2><p>Необязательный ручной текст включается в соответствующий документ</p></div></div>
          <div class="card-body form-grid">
            ${boundInput({ path: 'notes.act', label: 'К акту обследования', span: 6, type: 'textarea', rows: 4 })}
            ${boundInput({ path: 'notes.technicalDecision', label: 'К техническому решению', span: 6, type: 'textarea', rows: 4 })}
            ${boundInput({ path: 'notes.pos', label: 'К ПОС', span: 6, type: 'textarea', rows: 4 })}
            ${boundInput({ path: 'notes.ppr', label: 'К ППР', span: 6, type: 'textarea', rows: 4 })}
          </div>
        </section>
      </div>
    </div>`;
}

function boundMemberInput(index, key, label, span, value, type = 'text') {
  return `<div class="field span-${span}"><label>${escapeHtml(label)}</label><input type="${type}" data-bind="commission.${index}.${key}" value="${escapeHtml(value || '')}"></div>`;
}

function registryFilterMatch(item, filter) {
  if (filter === 'whole') return item.result.gesnTable === GESN.whole;
  if (filter === 'sectional') return item.result.gesnTable === GESN.sectional;
  if (filter === 'unresolved') return item.result.gesnTable === GESN.undefined;
  if (filter === 'remarks') return !item.result.isSufficient;
  return true;
}

function renderRegistry(project) {
  const summary = getProjectSummary(project);
  const search = ui.registrySearch.trim().toLocaleLowerCase('ru');
  const filtered = summary.calculated.filter((item) => {
    if (!registryFilterMatch(item, ui.registryFilter)) return false;
    if (!search) return true;
    const haystack = [
      item.tree.treeNumber,
      item.tree.location,
      item.tree.coordinates,
      item.tree.species,
      item.tree.group,
      item.tree.obstacle,
      item.result.gesnTable,
      item.result.subnorm,
    ]
      .join(' ')
      .toLocaleLowerCase('ru');
    return haystack.includes(search);
  });

  const cards = filtered.length
    ? filtered.map(({ tree, result }) => renderTreeCard(tree, result)).join('')
    : `<div class="card empty-panel"><div class="empty-icon">♧</div><h2>${summary.total ? 'Ничего не найдено' : 'Реестр деревьев пуст'}</h2><p>${summary.total ? 'Измените поиск или фильтр.' : 'Добавьте первое дерево. Заполнять можно прямо на объекте с телефона.'}</p><button class="button" data-action="add-tree">＋ Добавить дерево</button></div>`;

  return `
    <div class="page-shell">
      ${pageHeader(
        'Реестр деревьев',
        'Одна карточка — одно дерево. Жёлтые поля заполняет проектировщик, технология и норма рассчитываются автоматически.',
        `<button class="button button-secondary" data-action="export-csv">CSV для Excel</button><button class="button" data-action="add-tree">＋ Добавить дерево</button>`,
      )}

      <div class="registry-summary-strip">
        <span class="stat-pill">Всего: <strong>${summary.total}</strong></span>
        <span class="stat-pill badge-green">ГЭСН 01: <strong>${summary.wholeCount}</strong></span>
        <span class="stat-pill badge-orange">ГЭСН 47: <strong>${summary.sectionalCount}</strong></span>
        ${summary.unresolvedCount ? `<span class="stat-pill badge-red">Не определено: <strong>${summary.unresolvedCount}</strong></span>` : ''}
        ${summary.remarksCount ? `<span class="stat-pill badge-red">С замечаниями: <strong>${summary.remarksCount}</strong></span>` : ''}
      </div>

      <div class="toolbar">
        <input id="registrySearch" type="search" value="${escapeHtml(ui.registrySearch)}" placeholder="Поиск по номеру, породе, ПК, препятствию…" aria-label="Поиск по реестру">
        <select id="registryFilter" aria-label="Фильтр реестра">
          <option value="all" ${ui.registryFilter === 'all' ? 'selected' : ''}>Все деревья</option>
          <option value="whole" ${ui.registryFilter === 'whole' ? 'selected' : ''}>Валка целиком — ГЭСН 01</option>
          <option value="sectional" ${ui.registryFilter === 'sectional' ? 'selected' : ''}>Поэтапное спиливание — ГЭСН 47</option>
          <option value="unresolved" ${ui.registryFilter === 'unresolved' ? 'selected' : ''}>Норма не определена</option>
          <option value="remarks" ${ui.registryFilter === 'remarks' ? 'selected' : ''}>Только с замечаниями</option>
        </select>
        <button class="button button-secondary toolbar-secondary-action" data-action="clear-registry-filters">Сбросить</button>
        <button class="button" data-action="add-tree">＋</button>
      </div>

      <div class="tree-list">${cards}</div>
    </div>`;
}

function renderTreeCard(tree, result) {
  let cardStatus = 'status-warning';
  let badgeClass = 'badge-gray';
  if (result.gesnTable === GESN.whole) {
    cardStatus = 'status-whole';
    badgeClass = 'badge-green';
  } else if (result.gesnTable === GESN.sectional) {
    cardStatus = 'status-sectional';
    badgeClass = 'badge-orange';
  } else if (['missing', 'contradiction', 'undefined'].includes(result.status)) {
    cardStatus = 'status-error';
    badgeClass = 'badge-red';
  }

  const controlClass = result.isSufficient
    ? 'ok'
    : ['missing', 'contradiction', 'undefined'].includes(result.status)
      ? 'error'
      : 'warning';

  return `<article class="tree-card ${cardStatus}">
    <div class="tree-card-main">
      <div class="tree-number"><small>Дерево</small><strong>№ ${escapeHtml(tree.treeNumber)}</strong><small>${tree.photos?.length || 0} фото</small></div>
      <div class="tree-primary"><strong>${escapeHtml(tree.species || 'Порода не указана')}</strong><small>${escapeHtml(tree.location || 'Местоположение не указано')}</small><small>${escapeHtml(tree.group || 'Группа не указана')} · D1,3 ${formatNumber(tree.diameter) || '—'} см · H ${formatNumber(tree.height) || '—'} м</small></div>
      <div class="tree-result"><span class="badge ${badgeClass}">${escapeHtml(result.gesnTable)}</span><strong>${escapeHtml(result.subnorm)}</strong><small>${escapeHtml(result.technology)}</small></div>
      <div class="tree-context"><strong>${escapeHtml(tree.obstacle || 'Препятствие не указано')}</strong><small>Валка целиком: ${escapeHtml(tree.wholeFellingPossible || '—')}</small><small>Подъёмник: ${escapeHtml(tree.liftPossible || '—')}</small></div>
      <div class="tree-card-actions">
        <button class="button button-link" data-action="edit-tree" data-id="${escapeHtml(tree.id)}" aria-label="Изменить дерево № ${escapeHtml(tree.treeNumber)}"><span class="action-icon" aria-hidden="true">✎</span><span class="action-label">Изменить</span></button>
        <button class="button button-link" data-action="clone-tree" data-id="${escapeHtml(tree.id)}" aria-label="Создать копию дерева № ${escapeHtml(tree.treeNumber)}"><span class="action-icon" aria-hidden="true">⧉</span><span class="action-label">Копия</span></button>
        <button class="button button-link" data-action="delete-tree" data-id="${escapeHtml(tree.id)}" aria-label="Удалить дерево № ${escapeHtml(tree.treeNumber)}"><span class="action-icon" aria-hidden="true">✕</span><span class="action-label">Удалить</span></button>
      </div>
    </div>
    <div class="tree-card-control ${controlClass}">${escapeHtml(result.control)}</div>
  </article>`;
}

function renderDocuments(project) {
  const summary = getProjectSummary(project);
  const tabs = [
    ['act', 'Акт обследования'],
    ['technical', 'Техническое решение'],
    ['pos', 'ПОС'],
    ['ppr', 'ППР'],
  ];
  const notePath = {
    act: 'notes.act',
    technical: 'notes.technicalDecision',
    pos: 'notes.pos',
    ppr: 'notes.ppr',
  }[ui.documentTab];
  const noteValue = getByPath(project, notePath) || '';

  return `
    <div class="page-shell document-page">
      ${pageHeader(
        'Автоматические документы',
        'Документы формируются по актуальным данным реестра. Категории с нулевым количеством в заключение не включаются.',
        `<button class="button button-secondary" data-action="download-document">Скачать HTML</button><button class="button" data-action="print-document">Печать / PDF</button>`,
      )}

      <div class="document-tabs" role="tablist">
        ${tabs
          .map(
            ([id, label]) => `<button class="document-tab ${ui.documentTab === id ? 'active' : ''}" data-action="select-document" data-document="${id}" role="tab">${escapeHtml(label)}</button>`,
          )
          .join('')}
      </div>

      ${summary.unresolvedCount > 0 ? `<div class="warning-callout" style="margin-bottom:12px"><h3>Есть неразрешённые строки: ${summary.unresolvedCount}</h3><p>Документ сформирован, но перед утверждением требуется устранить замечания в реестре.</p></div>` : ''}

      <div class="document-toolbar">
        <div><button class="button button-compact button-secondary" data-action="download-document">Скачать HTML</button><button class="button button-compact" data-action="print-document">Печать / PDF</button></div>
        <button class="button button-compact button-secondary" data-action="toggle-document-note">Дополнительный текст</button>
      </div>

      <section id="documentNotePanel" class="card form-card" hidden style="margin-bottom:12px">
        <div class="card-header"><div><h2>Дополнительный текст</h2><p>Будет включён только в выбранный документ</p></div></div>
        <div class="card-body"><div class="field span-12"><textarea data-bind="${notePath}" rows="5">${escapeHtml(noteValue)}</textarea></div></div>
      </section>

      <div class="document-preview-shell" id="documentPreviewShell">
        <div class="paper-scale-wrapper" id="paperScaleWrapper">${renderDocument(ui.documentTab, project)}</div>
      </div>
    </div>`;
}

function renderRequirements() {
  const requirements = [
    ['Уникальный номер дерева', 'Номер должен совпадать в реестре, ситуационной схеме, фототаблице и ведомости объёмов.'],
    ['Местоположение', 'Адрес, пикет/плюс, координаты или однозначная привязка к оси трассы.'],
    ['Порода и группа породы', 'Нужны для выбора конкретной поднормы; лиственница учитывается отдельно.'],
    ['Диаметр D1,3', 'Диаметр ствола в сантиметрах на высоте 1,3 м от поверхности земли.'],
    ['Высота дерева', 'Используется для контроля достаточности свободной зоны и расстояния до препятствия.'],
    ['Состояние дерева', 'Жизнеспособное, сухостойное, аварийное/наклонное, зависшее и т. п.'],
    ['Критическое препятствие и расстояние', 'Тип препятствия сам по себе не выбирает норму; обязательно указать фактическое расстояние.'],
    ['Предполагаемый сектор падения', 'На схеме показать направление и указать, попадает ли препятствие в сектор.'],
    ['Свободная зона падения', 'Указать длину в метрах и однозначный вывод, обеспечена ли она.'],
    ['Возможность валки целиком', 'Основной технический вывод проектировщика: «Да», «Нет» или «Не определено».'],
    ['Подъезд и установка подъёмника', 'Обязательно подтвердить при применении ГЭСН 47-01-128.'],
    ['Фотофиксация и схема', 'Каждое дерево должно быть идентифицировано на фото и плане.'],
    ['Обращение с порубочными остатками', 'Сжигание либо без сжигания: вывоз, переработка, складирование или передача.'],
    ['Принятая технология и состав операций', 'Одинаковая технология должна быть отражена в проекте, ПОС, ППР, ВОР и смете.'],
    ['Дополнительные операции', 'Отдельно проверить обрезку сучьев, раскряжёвку, трелёвку, погрузку, вывоз, корчёвку пней и восстановление территории.'],
  ];

  return `
    <div class="page-shell">
      ${pageHeader(
        'Требования к проектировщику',
        'Готовый перечень исходных данных для обоснования выбора между ГЭСН 01-02-099 и ГЭСН 47-01-128.',
        `<button class="button" data-action="copy-requirement-text">Скопировать требование</button>`,
      )}

      <div class="info-callout" style="margin-bottom:16px">
        <h3>Ключевой принцип</h3>
        <p>Наличие дороги, здания или иной помехи не определяет норму автоматически. Проектировщик обязан установить, возможна ли безопасная валка дерева целиком и какая технология фактически предусмотрена проектом, ПОС и ППР.</p>
      </div>

      <div class="requirements-grid">
        <section class="card">
          <div class="card-header"><div><h2>Обязательные данные по каждому дереву</h2><p>Одна строка реестра — одно дерево</p></div></div>
          <div class="card-body requirement-list">${requirements
            .map(
              ([title, text]) => `<div class="requirement-item"><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p></div></div>`,
            )
            .join('')}</div>
        </section>

        <div class="section-stack">
          <section class="card">
            <div class="card-header"><div><h2>Алгоритм выбора</h2><p>Автоматическая логика приложения</p></div></div>
            <div class="card-body algorithm-flow">
              <div class="algorithm-step whole"><strong>ГЭСН 01-02-099</strong><p>Валка целиком = «Да»; препятствие в секторе = «Нет»; свободная зона = «Да».</p></div>
              <div class="algorithm-step sectional"><strong>ГЭСН 47-01-128</strong><p>Валка целиком = «Нет» и препятствие находится в секторе либо свободная зона не обеспечена. Дополнительно проверяется подъёмник.</p></div>
              <div class="algorithm-step warning"><strong>Норма не определяется</strong><p>Есть незаполненные поля, противоречия либо валка целиком указана невозможной при отсутствии препятствия в секторе и наличии свободной зоны.</p></div>
            </div>
          </section>

          <section class="card">
            <div class="card-header"><div><h2>Комплект приложений</h2><p>Для подписания акта и защиты сметы</p></div></div>
            <div class="card-body">
              <ol>
                <li>Ситуационный план / схема с номерами, препятствиями, расстояниями и секторами падения.</li>
                <li>Фототаблица по каждому спорному дереву.</li>
                <li>Перечётная ведомость с породой, D1,3, высотой и состоянием.</li>
                <li>Техническое решение проектировщика.</li>
                <li>ПОС и ППР / технологическая карта.</li>
                <li>Ведомость объёмов работ с раздельными объёмами по ГЭСН 01 и ГЭСН 47.</li>
              </ol>
            </div>
          </section>
        </div>
      </div>

      <section class="card" style="margin-top:16px">
        <div class="card-header"><div><h2>Справочник поднорм</h2><p>ФСНБ-2022; актуальность проверяется при обновлении нормативной базы</p></div></div>
        <div class="card-body data-table-wrap">
          <table class="data-table"><thead><tr><th>Код</th><th>Таблица</th><th>Наименование / условие</th></tr></thead><tbody>${NORM_REFERENCE
            .map(
              (item) => `<tr><td>${escapeHtml(item.code)}</td><td>${escapeHtml(item.table)}</td><td>${escapeHtml(item.description)}</td></tr>`,
            )
            .join('')}</tbody></table>
        </div>
      </section>

      <section class="card" style="margin-top:16px">
        <div class="card-header"><div><h2>Нормативные источники исходной формы</h2><p>Ссылки требуют подключения к интернету</p></div></div>
        <div class="card-body">
          <ul>
            <li><a href="https://fgiscs.minstroyrf.ru/frsn/standard2022/doc/e1403c15-3abf-4a1a-b4d6-ec79c4ea2a1d" target="_blank" rel="noopener">ГЭСН 01-02-099 — ФГИС ЦС</a></li>
            <li><a href="https://fgiscs.minstroyrf.ru/api/values/GetFileContent/15eebd52-a733-45b7-a939-6004307a1e19" target="_blank" rel="noopener">ГЭСН 47-01-128 и общие положения сборника 47 — ФГИС ЦС</a></li>
            <li><a href="https://publication.pravo.gov.ru/document/0001202208260024" target="_blank" rel="noopener">Методика применения сметных норм, приказ Минстроя России № 571/пр</a></li>
          </ul>
        </div>
      </section>
    </div>`;
}

function renderSettings(project) {
  const projectItems = state.projects
    .map((item) => {
      const summary = getProjectSummary(item);
      return `<div class="project-list-item ${item.id === state.activeProjectId ? 'active' : ''}">
        <div><strong>${escapeHtml(item.meta?.objectName || 'Без названия')}</strong><small>${summary.total} ${plural(summary.total, ['дерево', 'дерева', 'деревьев'])} · обновлено ${new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.updatedAt || item.createdAt))}</small></div>
        <div class="project-list-actions">
          ${item.id !== state.activeProjectId ? `<button class="button button-compact button-secondary" data-action="switch-project" data-id="${escapeHtml(item.id)}">Открыть</button>` : '<span class="badge badge-blue">Текущий</span>'}
          <button class="button button-compact button-secondary" data-action="clone-project" data-id="${escapeHtml(item.id)}">Копия</button>
          <button class="button button-compact button-link" data-action="delete-project" data-id="${escapeHtml(item.id)}">Удалить</button>
        </div>
      </div>`;
    })
    .join('');

  return `
    <div class="page-shell">
      ${pageHeader(
        'Данные и настройки',
        'Управление объектами, резервные копии, экспорт и установка приложения.',
        `<button class="button" data-action="new-project">＋ Новый объект</button>`,
      )}

      <div class="settings-grid">
        <section class="card">
          <div class="card-header"><div><h2>Объекты</h2><p>Каждый объект хранит собственный реестр и комплект документов</p></div></div>
          <div class="card-body project-list">${projectItems}</div>
        </section>

        <section class="card">
          <div class="card-header"><div><h2>Резервные копии и экспорт</h2><p>Регулярно сохраняйте копию вне устройства</p></div></div>
          <div class="card-body section-stack">
            <button class="button button-secondary" data-action="export-active-json">Скачать текущий объект (.json)</button>
            <button class="button button-secondary" data-action="export-all-json">Скачать все объекты (.json)</button>
            <button class="button button-secondary" data-action="export-csv">Реестр текущего объекта для Excel (.csv)</button>
            <label class="button button-secondary" style="position:relative;overflow:hidden">Импортировать JSON<input id="importJsonInput" type="file" accept="application/json,.json" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
          </div>
        </section>

        <section class="card">
          <div class="card-header"><div><h2>Установка PWA</h2><p>Работает как отдельное мобильное приложение</p></div></div>
          <div class="card-body section-stack">
            <div class="info-callout"><h3>Android / Windows</h3><p>Откройте приложение по HTTPS или на localhost и нажмите «Установить» в браузере либо кнопку ниже.</p></div>
            <button class="button" data-action="install-app" ${ui.installPrompt ? '' : 'disabled'}>Установить приложение</button>
            <div class="info-callout"><h3>iPhone / iPad</h3><p>Откройте в Safari → «Поделиться» → «На экран Домой». Данные будут доступны офлайн после первого открытия.</p></div>
          </div>
        </section>

        <section class="card">
          <div class="card-header"><div><h2>Хранение и конфиденциальность</h2><p>Сервер и регистрация не требуются</p></div></div>
          <div class="card-body section-stack">
            <div class="success-callout"><h3>Локальное хранение</h3><p>Реестры, реквизиты и фотографии сохраняются в IndexedDB браузера на этом устройстве.</p></div>
            <div id="storageEstimate" class="info-callout"><h3>Использование хранилища</h3><p>Расчёт…</p></div>
            <div class="warning-callout"><h3>Важно</h3><p>Очистка данных браузера удалит проекты. Перед очисткой скачайте резервную копию JSON.</p></div>
          </div>
        </section>

        <section class="card">
          <div class="card-header"><div><h2>Демонстрация и обслуживание</h2><p>Инструменты для проверки приложения</p></div></div>
          <div class="card-body section-stack">
            <button class="button button-secondary" data-action="create-demo">Создать демонстрационный объект</button>
            <button class="button button-secondary" data-action="reset-active-project">Очистить текущий объект</button>
            <button class="button button-danger" data-action="reset-all-data">Удалить все данные приложения</button>
          </div>
        </section>

        <section class="card">
          <div class="card-header"><div><h2>О приложении</h2><p>Версия ${APP_VERSION}</p></div></div>
          <div class="card-body">
            <p><strong>Назначение:</strong> документирование исходных данных, автоматический выбор технологии и таблицы ГЭСН, формирование акта, технического решения, ПОС и ППР.</p>
            <p><strong>Ответственность:</strong> автоматический расчёт не заменяет проектное техническое решение. Достоверность исходных данных и безопасность принятой технологии подтверждают проектировщик и комиссия.</p>
          </div>
        </section>
      </div>
    </div>`;
}

async function updateStorageEstimate() {
  const target = document.getElementById('storageEstimate');
  if (!target) return;
  const estimate = await storageEstimate();
  const mb = (bytes) => (bytes / 1024 / 1024).toFixed(bytes > 10 * 1024 * 1024 ? 1 : 2);
  target.innerHTML = `<h3>Использование хранилища</h3><p>${estimate.quota ? `${mb(estimate.usage)} МБ из доступных ${mb(estimate.quota)} МБ.` : 'Браузер не предоставил сведения о квоте.'}</p>`;
}

function openTreeEditor(treeId = null) {
  const project = currentProject();
  const existing = treeId ? project.trees.find((tree) => tree.id === treeId) : null;
  const numericNumbers = project.trees
    .map((tree) => Number(tree.treeNumber))
    .filter((value) => Number.isFinite(value));
  const next = numericNumbers.length ? Math.max(...numericNumbers) + 1 : project.trees.length + 1;
  ui.editingTree = existing ? clone(existing) : createBlankTree(next);
  renderTreeModal(Boolean(existing));
}

function renderTreeModal(isEditing) {
  const tree = ui.editingTree;
  const result = calculateTree(tree);
  const controlClass = result.isSufficient
    ? 'ok'
    : ['missing', 'contradiction', 'undefined'].includes(result.status)
      ? 'error'
      : 'warning';

  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal" role="presentation">
      <section class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="treeModalTitle" data-modal-panel>
        <header class="modal-header">
          <div><h2 id="treeModalTitle">${isEditing ? 'Редактирование' : 'Новое'} дерево № ${escapeHtml(tree.treeNumber || '—')}</h2><p>Заполните фактические данные обследования. Норма пересчитывается сразу.</p></div>
          <button class="modal-close" data-action="close-modal" aria-label="Закрыть">×</button>
        </header>
        <div class="modal-body">
          <form id="treeForm" class="form-grid" autocomplete="off">
            <div class="form-section-title">1. Идентификация и характеристики</div>
            ${treeField('treeNumber', '№ дерева по схеме', tree.treeNumber, 3, 'text', true)}
            ${treeField('location', 'Местоположение / ПК / привязка', tree.location, 6, 'text', true)}
            <div class="field span-3 field-input-projector"><label>Координаты</label><div class="inline-field-actions"><input data-tree-field="coordinates" value="${escapeHtml(tree.coordinates || '')}" placeholder="55.000000, 49.000000"><button class="button button-compact button-secondary" type="button" data-action="get-gps">GPS</button></div></div>
            ${treeField('species', 'Порода дерева', tree.species, 4, 'text', true)}
            ${treeSelect('group', 'Группа породы', OPTIONS.groups, tree.group, 4, true)}
            ${treeField('diameter', 'Диаметр D1,3, см', tree.diameter, 2, 'number', true, '0.1')}
            ${treeField('height', 'Высота, м', tree.height, 2, 'number', true, '0.1')}
            ${treeSelect('condition', 'Состояние дерева', OPTIONS.conditions, tree.condition, 4, true)}

            <div class="form-section-title">2. Условия производства работ</div>
            ${treeSelect('obstacle', 'Критическое ближайшее препятствие', OPTIONS.obstacles, tree.obstacle, 6, true)}
            ${treeField('obstacleDistance', 'Расстояние до препятствия, м', tree.obstacleDistance, 3, 'number', tree.obstacle !== 'Нет препятствий', '0.1', tree.obstacle === 'Нет препятствий')}
            ${treeField('freeZoneLength', 'Длина свободной зоны падения, м', tree.freeZoneLength, 3, 'number', true, '0.1')}
            ${treeSelect('obstacleInSector', 'Препятствие в секторе падения?', OPTIONS.yesNoUnknown, tree.obstacleInSector, 4, true)}
            ${treeSelect('freeZoneProvided', 'Свободная зона падения обеспечена?', OPTIONS.yesNoUnknown, tree.freeZoneProvided, 4, true)}
            ${treeSelect('wholeFellingPossible', 'Валка целиком технически возможна?', OPTIONS.yesNoUnknown, tree.wholeFellingPossible, 4, true)}
            ${treeSelect('liftPossible', 'Подъезд / установка телескопического подъёмника возможны?', OPTIONS.yesNoUnknown, tree.liftPossible, 6, result.gesnTable === GESN.sectional)}
            ${treeSelect('residues', 'Обращение с порубочными остатками', OPTIONS.residues, tree.residues, 6, true)}

            <div class="form-section-title">3. Подтверждающие материалы и решение</div>
            ${treeField('evidenceReference', 'Фото / схема / лист', tree.evidenceReference, 6, 'text', !(tree.photos?.length))}
            ${treeField('designerDecision', 'Решение проектировщика / примечание', tree.designerDecision, 6, 'textarea', false)}
            <div class="field span-12 field-input-projector">
              <label>Фотофиксация</label>
              <div class="photo-toolbar">
                <label class="button button-secondary photo-input-label">📷 Добавить фото<input id="treePhotoInput" type="file" accept="image/*" capture="environment" multiple></label>
                <span class="help-text">До 8 фотографий; изображения автоматически уменьшаются для офлайн-хранения.</span>
              </div>
              <div class="photo-grid" id="treePhotoGrid">${renderPhotoGrid(tree.photos || [])}</div>
            </div>

            <div class="form-section-title">4. Автоматический результат</div>
            <div class="field span-12">
              <div class="result-panel" id="treeResultPanel">${treeResultMarkup(result, controlClass)}</div>
            </div>
          </form>
        </div>
        <footer class="modal-footer">
          <span class="help-text">Неполную строку можно сохранить: приложение отметит, какие данные требуется дополнить.</span>
          <div class="modal-footer-actions"><button class="button button-secondary" data-action="close-modal">Отмена</button><button class="button" data-action="save-tree">Сохранить дерево</button></div>
        </footer>
      </section>
    </div>`;

  requestAnimationFrame(() => modalRoot.querySelector('[data-tree-field="treeNumber"]')?.focus());
}

function treeField(key, label, value, span, type = 'text', required = false, step = '', disabled = false) {
  const isTextarea = type === 'textarea';
  const control = isTextarea
    ? `<textarea data-tree-field="${key}" rows="4">${escapeHtml(value || '')}</textarea>`
    : `<input data-tree-field="${key}" type="${type}" value="${escapeHtml(value ?? '')}" ${step ? `step="${step}" min="0"` : ''} ${disabled ? 'disabled' : ''}>`;
  return `<div class="field span-${span} field-input-projector"><label>${escapeHtml(label)}${required ? ' <span class="required-mark">*</span>' : ''}</label>${control}</div>`;
}

function treeSelect(key, label, options, value, span, required = false) {
  return `<div class="field span-${span} field-input-projector"><label>${escapeHtml(label)}${required ? ' <span class="required-mark">*</span>' : ''}</label><select data-tree-field="${key}">${optionMarkup(options, value)}</select></div>`;
}

function renderPhotoGrid(photos) {
  if (!photos.length) return '<div class="help-text">Фотографии не добавлены.</div>';
  return photos
    .map(
      (photo) => `<figure class="photo-item"><img src="${photo.dataUrl}" alt="${escapeHtml(photo.name || 'Фото дерева')}"><button type="button" data-action="remove-photo" data-id="${escapeHtml(photo.id)}" aria-label="Удалить фото">×</button></figure>`,
    )
    .join('');
}

function treeResultMarkup(result, controlClass = null) {
  const className = controlClass || (result.isSufficient ? 'ok' : ['missing', 'contradiction', 'undefined'].includes(result.status) ? 'error' : 'warning');
  return `<h3>Автоматический подбор</h3>
    <div class="result-grid">
      <div class="result-item"><small>Принятая технология</small><strong>${escapeHtml(result.technology)}</strong></div>
      <div class="result-item"><small>Таблица ГЭСН</small><strong>${escapeHtml(result.gesnTable)}</strong></div>
      <div class="result-item"><small>Поднорма</small><strong>${escapeHtml(result.subnorm)}</strong></div>
    </div>
    <div class="result-item"><small>Автоматическое обоснование</small><strong>${escapeHtml(result.rationale)}</strong></div>
    <div class="result-control ${className}">${escapeHtml(result.control)}</div>`;
}

function updateTreeModalResult() {
  const result = calculateTree(ui.editingTree);
  const panel = document.getElementById('treeResultPanel');
  if (panel) panel.innerHTML = treeResultMarkup(result);

  const distanceInput = modalRoot.querySelector('[data-tree-field="obstacleDistance"]');
  if (distanceInput) distanceInput.disabled = ui.editingTree.obstacle === 'Нет препятствий';

  const liftSelect = modalRoot.querySelector('[data-tree-field="liftPossible"]');
  if (liftSelect) {
    liftSelect.closest('.field')?.classList.toggle('field-error', result.gesnTable === GESN.sectional && ui.editingTree.liftPossible !== 'Да');
  }
}

function closeModal() {
  modalRoot.innerHTML = '';
  ui.editingTree = null;
}

async function handleTreePhotos(files) {
  if (!ui.editingTree) return;
  const available = Math.max(0, 8 - (ui.editingTree.photos?.length || 0));
  const selected = [...files].slice(0, available);
  if (!selected.length) {
    toast('Для одного дерева можно сохранить не более 8 фотографий.', 'warning');
    return;
  }
  toast('Обработка фотографий…');
  const items = [];
  for (const file of selected) {
    try {
      const dataUrl = await compressImage(file, 1600, 0.78);
      items.push({ id: createId('photo'), name: file.name, type: 'image/jpeg', dataUrl, createdAt: new Date().toISOString() });
    } catch (error) {
      console.error(error);
      toast(`Не удалось обработать файл ${file.name}.`, 'error');
    }
  }
  ui.editingTree.photos = [...(ui.editingTree.photos || []), ...items];
  const grid = document.getElementById('treePhotoGrid');
  if (grid) grid.innerHTML = renderPhotoGrid(ui.editingTree.photos);
  updateTreeModalResult();
  toast(`Добавлено фотографий: ${items.length}.`, 'success');
}

async function compressImage(file, maxSide, quality) {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
      img.src = sourceUrl;
    });
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function saveTreeDraft() {
  const project = currentProject();
  const draft = ui.editingTree;
  const duplicate = project.trees.find(
    (tree) => tree.id !== draft.id && String(tree.treeNumber).trim().toLocaleLowerCase('ru') === String(draft.treeNumber).trim().toLocaleLowerCase('ru'),
  );
  if (!String(draft.treeNumber || '').trim()) {
    toast('Укажите номер дерева по схеме.', 'error');
    modalRoot.querySelector('[data-tree-field="treeNumber"]')?.focus();
    return;
  }
  if (duplicate) {
    toast(`Дерево № ${draft.treeNumber} уже есть в реестре.`, 'error');
    modalRoot.querySelector('[data-tree-field="treeNumber"]')?.focus();
    return;
  }

  draft.updatedAt = new Date().toISOString();
  const index = project.trees.findIndex((tree) => tree.id === draft.id);
  if (index >= 0) project.trees[index] = clone(draft);
  else project.trees.push(clone(draft));
  touchProject(project);
  markDirty();
  closeModal();
  render();
  toast('Данные дерева сохранены.', 'success');
}

function deleteTree(id) {
  const project = currentProject();
  const tree = project.trees.find((item) => item.id === id);
  if (!tree) return;
  if (!confirm(`Удалить дерево № ${tree.treeNumber}? Восстановить строку можно только из резервной копии.`)) return;
  project.trees = project.trees.filter((item) => item.id !== id);
  touchProject(project);
  markDirty();
  render();
  toast('Дерево удалено.');
}

function cloneTree(id) {
  const project = currentProject();
  const source = project.trees.find((item) => item.id === id);
  if (!source) return;
  const numericNumbers = project.trees.map((tree) => Number(tree.treeNumber)).filter(Number.isFinite);
  const next = numericNumbers.length ? Math.max(...numericNumbers) + 1 : project.trees.length + 1;
  const copy = clone(source);
  copy.id = createId('tree');
  copy.treeNumber = String(next);
  copy.photos = [];
  copy.evidenceReference = '';
  copy.createdAt = new Date().toISOString();
  copy.updatedAt = copy.createdAt;
  project.trees.push(copy);
  touchProject(project);
  markDirty();
  render();
  toast(`Создана копия как дерево № ${next}.`, 'success');
}

function addMember() {
  currentProject().commission.push(blankCommissionMember('Иной участник комиссии'));
  touchProject();
  markDirty();
  render();
}

function removeMember(index) {
  const project = currentProject();
  if (project.commission.length <= 1) {
    toast('В составе комиссии должен остаться хотя бы один участник.', 'warning');
    return;
  }
  project.commission.splice(index, 1);
  touchProject(project);
  markDirty();
  render();
}

function openProjectDialog({ mode = 'new', sourceId = null } = {}) {
  const source = sourceId ? state.projects.find((project) => project.id === sourceId) : currentProject();
  const defaultName = mode === 'clone' ? `${source?.meta?.objectName || 'Объект'} — копия` : 'Новый объект';
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal-panel modal-small" data-modal-panel role="dialog" aria-modal="true">
        <header class="modal-header"><div><h2>${mode === 'clone' ? 'Создать копию объекта' : 'Новый объект'}</h2><p>Укажите понятное наименование для списка проектов.</p></div><button class="modal-close" data-action="close-modal">×</button></header>
        <div class="modal-body"><div class="field span-12"><label>Наименование объекта</label><input id="newProjectName" value="${escapeHtml(defaultName)}"></div></div>
        <footer class="modal-footer"><span></span><div class="modal-footer-actions"><button class="button button-secondary" data-action="close-modal">Отмена</button><button class="button" data-action="confirm-project-dialog" data-mode="${mode}" data-source-id="${escapeHtml(sourceId || '')}">Создать</button></div></footer>
      </section>
    </div>`;
  requestAnimationFrame(() => {
    const input = document.getElementById('newProjectName');
    input?.focus();
    input?.select();
  });
}

function confirmProjectDialog(button) {
  const input = document.getElementById('newProjectName');
  const name = input?.value.trim();
  if (!name) {
    toast('Введите наименование объекта.', 'error');
    input?.focus();
    return;
  }
  const mode = button.dataset.mode;
  let project;
  if (mode === 'clone') {
    const source = state.projects.find((item) => item.id === button.dataset.sourceId) || currentProject();
    project = normalizeImportedProject(clone(source));
    project.id = createId('project');
    project.meta.objectName = name;
    project.createdAt = new Date().toISOString();
    project.updatedAt = project.createdAt;
  } else {
    project = createBlankProject(name);
  }
  state.projects.push(project);
  state.activeProjectId = project.id;
  markDirty();
  closeModal();
  render();
  navigate('project');
  toast('Объект создан.', 'success');
}

function switchProject(id) {
  if (!state.projects.some((project) => project.id === id)) return;
  state.activeProjectId = id;
  markDirty('Переключение…');
  render();
}

function deleteProject(id) {
  const project = state.projects.find((item) => item.id === id);
  if (!project) return;
  if (state.projects.length <= 1) {
    toast('Нельзя удалить единственный объект. Создайте новый либо очистите текущий.', 'warning');
    return;
  }
  if (!confirm(`Удалить объект «${project.meta?.objectName || 'Без названия'}» со всем реестром и фотографиями?`)) return;
  state.projects = state.projects.filter((item) => item.id !== id);
  if (state.activeProjectId === id) state.activeProjectId = state.projects[0].id;
  markDirty();
  render();
  toast('Объект удалён.');
}

function openProjectsModal() {
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal-panel modal-small" data-modal-panel role="dialog" aria-modal="true">
        <header class="modal-header"><div><h2>Объекты</h2><p>Выберите объект или создайте новый.</p></div><button class="modal-close" data-action="close-modal">×</button></header>
        <div class="modal-body project-list">${state.projects
          .map(
            (project) => `<button class="project-list-item ${project.id === state.activeProjectId ? 'active' : ''}" data-action="switch-project-modal" data-id="${escapeHtml(project.id)}" style="width:100%;text-align:left;cursor:pointer"><div><strong>${escapeHtml(project.meta?.objectName || 'Без названия')}</strong><small>${getProjectSummary(project).total} деревьев</small></div>${project.id === state.activeProjectId ? '<span class="badge badge-blue">Текущий</span>' : ''}</button>`,
          )
          .join('')}</div>
        <footer class="modal-footer"><span></span><div class="modal-footer-actions"><button class="button" data-action="new-project">＋ Новый объект</button></div></footer>
      </section>
    </div>`;
}

function downloadBlob(content, filename, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportActiveProjectJson() {
  const project = currentProject();
  const payload = { format: 'gesn-tree-project', version: 1, exportedAt: new Date().toISOString(), project };
  downloadBlob(JSON.stringify(payload, null, 2), `${sanitizeFileName(project.meta.objectName)}_ГЭСН_01_47.json`, 'application/json;charset=utf-8');
  toast('Резервная копия объекта скачана.', 'success');
}

function exportAllProjectsJson() {
  const payload = { format: 'gesn-tree-backup', version: 1, exportedAt: new Date().toISOString(), state };
  downloadBlob(JSON.stringify(payload, null, 2), `Резервная_копия_ГЭСН_01_47_${new Date().toISOString().slice(0, 10)}.json`, 'application/json;charset=utf-8');
  toast('Общая резервная копия скачана.', 'success');
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function exportCsv() {
  const project = currentProject();
  const headers = [
    '№ п/п', '№ дерева', 'Местоположение / ПК', 'Координаты', 'Порода', 'Группа породы', 'D1,3, см', 'Высота, м', 'Состояние',
    'Критическое препятствие', 'Расстояние, м', 'Свободная зона, м', 'Препятствие в секторе?', 'Свободная зона обеспечена?',
    'Валка целиком возможна?', 'Подъёмник возможен?', 'Фото / схема', 'Обращение с остатками', 'Принятая технология', 'Таблица ГЭСН',
    'Поднорма', 'Автоматическое обоснование', 'Контроль / замечание', 'Решение проектировщика',
  ];
  const rows = project.trees
    .filter((tree) => String(tree.treeNumber || '').trim())
    .map((tree, index) => {
      const result = calculateTree(tree);
      return [
        index + 1, tree.treeNumber, tree.location, tree.coordinates, tree.species, tree.group, tree.diameter, tree.height, tree.condition,
        tree.obstacle, tree.obstacleDistance, tree.freeZoneLength, tree.obstacleInSector, tree.freeZoneProvided, tree.wholeFellingPossible,
        tree.liftPossible, tree.evidenceReference, tree.residues, result.technology, result.gesnTable, result.subnorm, result.rationale, result.control,
        tree.designerDecision,
      ];
    });
  const csv = '\ufeff' + [headers, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
  downloadBlob(csv, `${sanitizeFileName(project.meta.objectName)}_Реестр_деревьев.csv`, 'text/csv;charset=utf-8');
  toast('CSV-файл для Excel скачан.', 'success');
}

async function importJsonFile(file) {
  try {
    const payload = JSON.parse(await file.text());
    if (payload.format === 'gesn-tree-backup' && payload.state?.projects) {
      const importedProjects = payload.state.projects.map(normalizeImportedProject);
      state.projects.push(...importedProjects.map((project) => ({ ...project, id: createId('project') })));
      state.activeProjectId = state.projects.at(-importedProjects.length).id;
      toast(`Импортировано объектов: ${importedProjects.length}.`, 'success');
    } else {
      const source = payload.project || payload;
      const project = normalizeImportedProject(source);
      project.id = createId('project');
      project.meta.objectName = `${project.meta.objectName || 'Импортированный объект'} — импорт`;
      state.projects.push(project);
      state.activeProjectId = project.id;
      toast('Объект импортирован.', 'success');
    }
    await persistNow();
    render();
  } catch (error) {
    console.error(error);
    toast('Не удалось импортировать файл: неверный формат JSON.', 'error');
  }
}

function printCurrentDocument() {
  const project = currentProject();
  const html = buildStandaloneDocument(ui.documentTab, project);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast('Браузер заблокировал окно печати. Разрешите всплывающие окна.', 'error');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 400);
}

function downloadCurrentDocument() {
  const project = currentProject();
  const labels = { act: 'Акт', technical: 'Техническое_решение', pos: 'ПОС', ppr: 'ППР' };
  downloadBlob(
    buildStandaloneDocument(ui.documentTab, project),
    `${sanitizeFileName(project.meta.objectName)}_${labels[ui.documentTab]}.html`,
    'text/html;charset=utf-8',
  );
  toast('Документ скачан в формате HTML.', 'success');
}

function scaleDocumentPreview() {
  const shell = document.getElementById('documentPreviewShell');
  const wrapper = document.getElementById('paperScaleWrapper');
  const paper = wrapper?.querySelector('.paper');
  if (!shell || !wrapper || !paper) return;
  paper.style.transform = 'none';
  wrapper.style.width = '';
  wrapper.style.height = '';
  const available = Math.max(280, shell.clientWidth - 20);
  const naturalWidth = paper.offsetWidth;
  const scale = Math.min(1, available / naturalWidth);
  if (scale < 1) {
    paper.style.transform = `scale(${scale})`;
    paper.style.transformOrigin = 'top left';
    wrapper.style.width = `${naturalWidth * scale}px`;
    wrapper.style.height = `${paper.scrollHeight * scale}px`;
  } else {
    wrapper.style.width = `${naturalWidth}px`;
    wrapper.style.height = 'auto';
  }
}

function requirementText() {
  return `Для определения сметной стоимости работ по валке деревьев просим представить заполненный и подписанный акт комиссионного обследования деревьев и условий производства работ по их валке. К акту необходимо приложить перечётную ведомость деревьев, ситуационный план (схему) с нумерацией деревьев, расстояниями до препятствий и предполагаемыми секторами падения, фототаблицу, а также техническое решение проектной организации о способе удаления каждого дерева. В проектной/рабочей документации, ПОС, ведомости объёмов работ и ППР (технологической карте) должна быть принята единая технология, соответствующая выбранной сметной норме. По каждому дереву необходимо однозначно установить возможность или невозможность валки целиком, необходимость поэтапного спиливания с управляемым спуском частей и возможность применения предусмотренного нормой подъёмного механизма.`;
}

async function copyRequirementText() {
  try {
    await navigator.clipboard.writeText(requirementText());
    toast('Текст требования скопирован.', 'success');
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = requirementText();
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
    toast('Текст требования скопирован.', 'success');
  }
}

async function requestInstall() {
  if (!ui.installPrompt) {
    toast('Установка доступна из меню браузера. На iPhone используйте Safari → «На экран Домой».', 'warning');
    return;
  }
  ui.installPrompt.prompt();
  await ui.installPrompt.userChoice;
  ui.installPrompt = null;
  installButton.hidden = true;
  render();
}

async function getGps() {
  if (!ui.editingTree) return;
  if (!navigator.geolocation) {
    toast('Геолокация не поддерживается браузером.', 'error');
    return;
  }
  toast('Определение координат…');
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const value = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
      ui.editingTree.coordinates = value;
      const input = modalRoot.querySelector('[data-tree-field="coordinates"]');
      if (input) input.value = value;
      toast('Координаты получены.', 'success');
    },
    (error) => toast(`Не удалось получить координаты: ${error.message}`, 'error'),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30_000 },
  );
}

function resetActiveProject() {
  const project = currentProject();
  if (!confirm(`Очистить объект «${project.meta.objectName}»? Реестр, реквизиты и фотографии будут удалены.`)) return;
  const replacement = createBlankProject(project.meta.objectName || 'Новый объект');
  replacement.id = project.id;
  replacement.createdAt = project.createdAt;
  state.projects[currentProjectIndex()] = replacement;
  markDirty();
  render();
  toast('Текущий объект очищен.');
}

async function resetAllData() {
  if (!confirm('Удалить все объекты, реестры и фотографии с этого устройства? Действие необратимо без резервной копии.')) return;
  await clearAppState();
  const project = createBlankProject();
  state = { version: 1, activeProjectId: project.id, projects: [project] };
  await persistNow();
  render();
  toast('Все данные удалены.');
}

function createDemo() {
  const project = createDemoProject();
  project.id = createId('project');
  state.projects.push(project);
  state.activeProjectId = project.id;
  markDirty();
  render();
  navigate('dashboard');
  toast('Демонстрационный объект создан.', 'success');
}

function handleAppClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target || modalRoot.contains(target)) return;
  const action = target.dataset.action;

  const handlers = {
    'add-tree': () => openTreeEditor(),
    'edit-tree': () => openTreeEditor(target.dataset.id),
    'clone-tree': () => cloneTree(target.dataset.id),
    'delete-tree': () => deleteTree(target.dataset.id),
    'add-member': addMember,
    'remove-member': () => removeMember(Number(target.dataset.index)),
    'open-projects': openProjectsModal,
    'new-project': () => openProjectDialog({ mode: 'new' }),
    'clone-project': () => openProjectDialog({ mode: 'clone', sourceId: target.dataset.id }),
    'delete-project': () => deleteProject(target.dataset.id),
    'switch-project': () => switchProject(target.dataset.id),
    'export-active-json': exportActiveProjectJson,
    'export-all-json': exportAllProjectsJson,
    'export-csv': exportCsv,
    'print-document': printCurrentDocument,
    'download-document': downloadCurrentDocument,
    'select-document': () => {
      ui.documentTab = target.dataset.document;
      render();
    },
    'toggle-document-note': () => {
      const panel = document.getElementById('documentNotePanel');
      if (panel) panel.hidden = !panel.hidden;
    },
    'clear-registry-filters': () => {
      ui.registrySearch = '';
      ui.registryFilter = 'all';
      render();
    },
    'copy-requirement-text': copyRequirementText,
    'install-app': requestInstall,
    'create-demo': createDemo,
    'reset-active-project': resetActiveProject,
    'reset-all-data': resetAllData,
  };
  handlers[action]?.();
}

function handleModalClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const panel = event.target.closest('[data-modal-panel]');
  if (target.dataset.action === 'close-modal') {
    if (target.classList.contains('modal-backdrop') && panel) return;
    closeModal();
    return;
  }

  const actions = {
    'save-tree': saveTreeDraft,
    'remove-photo': () => {
      ui.editingTree.photos = (ui.editingTree.photos || []).filter((photo) => photo.id !== target.dataset.id);
      const grid = document.getElementById('treePhotoGrid');
      if (grid) grid.innerHTML = renderPhotoGrid(ui.editingTree.photos);
      updateTreeModalResult();
    },
    'get-gps': getGps,
    'confirm-project-dialog': () => confirmProjectDialog(target),
    'new-project': () => openProjectDialog({ mode: 'new' }),
    'switch-project-modal': () => {
      const id = target.dataset.id;
      closeModal();
      switchProject(id);
    },
  };
  actions[target.dataset.action]?.();
}

function handleBoundInput(event) {
  const input = event.target.closest('[data-bind]');
  if (!input) return;
  setByPath(currentProject(), input.dataset.bind, input.value);
  touchProject();
  markDirty();
  if (input.dataset.bind === 'meta.objectName') updateProjectSwitcher();
  if (ui.route === 'documents') {
    clearTimeout(ui.resizeTimer);
    ui.resizeTimer = setTimeout(() => {
      const wrapper = document.getElementById('paperScaleWrapper');
      if (wrapper) {
        wrapper.innerHTML = renderDocument(ui.documentTab, currentProject());
        scaleDocumentPreview();
      }
    }, 350);
  }
}

function handleTreeInput(event) {
  const input = event.target.closest('[data-tree-field]');
  if (!input || !ui.editingTree) return;
  const key = input.dataset.treeField;
  ui.editingTree[key] = input.value;
  if (key === 'obstacle' && input.value === 'Нет препятствий') {
    ui.editingTree.obstacleDistance = '';
    if (!ui.editingTree.obstacleInSector || ui.editingTree.obstacleInSector === 'Не определено') {
      ui.editingTree.obstacleInSector = 'Нет';
      const sector = modalRoot.querySelector('[data-tree-field="obstacleInSector"]');
      if (sector) sector.value = 'Нет';
    }
    const distance = modalRoot.querySelector('[data-tree-field="obstacleDistance"]');
    if (distance) distance.value = '';
  }
  updateTreeModalResult();
}

function bindEvents() {
  window.addEventListener('hashchange', () => {
    routeFromLocation();
    render();
  });

  window.addEventListener('resize', () => {
    clearTimeout(ui.resizeTimer);
    ui.resizeTimer = setTimeout(() => {
      if (ui.route === 'documents') scaleDocumentPreview();
    }, 100);
  });

  menuButton.addEventListener('click', () => document.body.classList.toggle('nav-open'));
  document.addEventListener('click', (event) => {
    if (document.body.classList.contains('nav-open') && !event.target.closest('#sideNav') && !event.target.closest('#menuButton')) {
      document.body.classList.remove('nav-open');
    }
  });

  projectSwitcher.addEventListener('change', () => switchProject(projectSwitcher.value));
  appView.addEventListener('click', handleAppClick);
  appView.addEventListener('input', (event) => {
    if (event.target.id === 'registrySearch') {
      ui.registrySearch = event.target.value;
      clearTimeout(ui.resizeTimer);
      ui.resizeTimer = setTimeout(render, 180);
      return;
    }
    handleBoundInput(event);
  });
  appView.addEventListener('change', (event) => {
    if (event.target.id === 'registryFilter') {
      ui.registryFilter = event.target.value;
      render();
      return;
    }
    if (event.target.id === 'importJsonInput' && event.target.files?.[0]) {
      void importJsonFile(event.target.files[0]);
      event.target.value = '';
      return;
    }
    handleBoundInput(event);
  });

  modalRoot.addEventListener('click', handleModalClick);
  modalRoot.addEventListener('input', handleTreeInput);
  modalRoot.addEventListener('change', (event) => {
    if (event.target.id === 'treePhotoInput') {
      void handleTreePhotos(event.target.files || []);
      event.target.value = '';
      return;
    }
    handleTreeInput(event);
  });

  window.addEventListener('online', updateConnectivity);
  window.addEventListener('offline', updateConnectivity);
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    ui.installPrompt = event;
    installButton.hidden = false;
    if (ui.route === 'settings') render();
  });
  installButton.addEventListener('click', requestInstall);
  window.addEventListener('appinstalled', () => {
    ui.installPrompt = null;
    installButton.hidden = true;
    toast('Приложение установлено.', 'success');
  });
}

function updateConnectivity() {
  offlineBanner.hidden = navigator.onLine;
}

function normalizeState(loaded) {
  if (!loaded?.projects?.length) {
    const project = createBlankProject();
    return { version: 1, activeProjectId: project.id, projects: [project] };
  }
  const projects = loaded.projects.map(normalizeImportedProject);
  const activeProjectId = projects.some((project) => project.id === loaded.activeProjectId)
    ? loaded.activeProjectId
    : projects[0].id;
  return { version: 1, activeProjectId, projects };
}

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (error) {
      console.warn('Service Worker не зарегистрирован.', error);
    }
  }
}

async function init() {
  bindEvents();
  updateConnectivity();
  try {
    state = normalizeState(await loadAppState());
    const params = new URLSearchParams(location.search);
    if (params.get('demo') === '1' && state.projects.length === 1 && !state.projects[0].trees.length) {
      const demo = createDemoProject();
      state = { version: 1, activeProjectId: demo.id, projects: [demo] };
    }
    if (params.get('view') && ROUTES.has(params.get('view'))) {
      location.hash = `#${params.get('view')}`;
    }
    routeFromLocation();
    await persistNow();
    render();
    void registerServiceWorker();
  } catch (error) {
    console.error(error);
    appView.innerHTML = `<div class="page-shell"><div class="warning-callout"><h3>Не удалось запустить приложение</h3><p>${escapeHtml(error.message || String(error))}</p></div></div>`;
  }
}

void init();
