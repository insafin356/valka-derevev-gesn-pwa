import {
  CONTROL,
  GESN,
  TECHNOLOGIES,
  calculateTree,
  formatDate,
  formatNumber,
  getProjectSummary,
  listTreeNumbers,
  plural,
} from './domain.js';

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function nl2br(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

function display(value, fallback = '—') {
  const text = String(value ?? '').trim();
  return text ? escapeHtml(text) : fallback;
}

function countPhrase(count) {
  return `${count} ${plural(count, ['дерево', 'дерева', 'деревьев'])}`;
}

function documentMeta(project) {
  const meta = project.meta || {};
  return `
    <table class="doc-table meta-table">
      <tbody>
        <tr><th>Наименование объекта</th><td colspan="3">${display(meta.objectName)}</td></tr>
        <tr><th>Адрес / участок / трасса</th><td>${display(meta.address || meta.routeSection)}</td><th>Шифр проекта</th><td>${display(meta.projectCode)}</td></tr>
        <tr><th>Заказчик / технический заказчик</th><td>${display(meta.technicalCustomer || meta.customer)}</td><th>Стадия</th><td>${display(meta.stage)}</td></tr>
        <tr><th>Проектная организация</th><td>${display(meta.designer)}</td><th>Генподрядчик</th><td>${display(meta.generalContractor)}</td></tr>
        <tr><th>Основание</th><td>${display(meta.inspectionBasis)}</td><th>Лист / раздел проекта</th><td>${display(meta.projectSheetReference)}</td></tr>
      </tbody>
    </table>`;
}

function documentTitle(title, subtitle = '') {
  return `
    <header class="doc-header">
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
    </header>`;
}

function summaryKpis(summary) {
  const rows = [
    ['Всего обследовано', summary.total],
    [GESN.whole, summary.wholeCount],
    [GESN.sectional, summary.sectionalCount],
  ];
  if (summary.unresolvedCount > 0) rows.push(['Норма не определена', summary.unresolvedCount]);
  if (summary.remarksCount > 0) rows.push(['Строки с замечаниями', summary.remarksCount]);

  return `
    <table class="doc-table summary-table">
      <thead><tr><th>Показатель</th><th>Количество деревьев</th></tr></thead>
      <tbody>${rows
        .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td class="number">${value}</td></tr>`)
        .join('')}</tbody>
    </table>`;
}

function technologyRows(summary) {
  const rows = [];
  if (summary.wholeCount > 0) {
    rows.push(`
      <tr>
        <td>Валка дерева целиком в заданном направлении</td>
        <td>${GESN.whole}</td>
        <td class="number">${summary.wholeCount}</td>
        <td>Валка целиком возможна; препятствие находится вне сектора падения; свободная зона обеспечена.</td>
      </tr>`);
  }
  if (summary.sectionalCount > 0) {
    rows.push(`
      <tr>
        <td>Поэтапное спиливание с закреплением и управляемым спуском частей</td>
        <td>${GESN.sectional}</td>
        <td class="number">${summary.sectionalCount}</td>
        <td>Валка целиком невозможна; проектом предусмотрена разборка дерева по частям; возможность установки подъёмника подлежит подтверждению.</td>
      </tr>`);
  }
  if (summary.unresolvedCount > 0) {
    rows.push(`
      <tr class="warning-row">
        <td>Требуется решение проектировщика</td>
        <td>Не определено</td>
        <td class="number">${summary.unresolvedCount}</td>
        <td>Необходимо заполнить исходные данные, устранить противоречия либо оформить отдельное техническое обоснование.</td>
      </tr>`);
  }
  if (!rows.length) {
    rows.push('<tr><td colspan="4">Реестр деревьев не заполнен.</td></tr>');
  }

  return `
    <table class="doc-table">
      <thead><tr><th>Принятая технология</th><th>Таблица ГЭСН</th><th>Количество</th><th>Основание выбора</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>`;
}

function commissionTable(project, signatures = false) {
  const members = (project.commission || []).filter(
    (member) => member.role || member.organization || member.position || member.name,
  );
  const rows = (members.length ? members : [{ role: 'Состав комиссии не заполнен' }])
    .map(
      (member, index) => `
      <tr>
        <td class="number">${index + 1}</td>
        <td>${display(member.role)}</td>
        <td>${display(member.organization)}</td>
        <td>${display(member.position)}</td>
        <td>${display(member.name)}</td>
        ${
          signatures
            ? `<td class="signature-cell"></td><td>${display(member.date ? formatDate(member.date) : '')}</td>`
            : `<td>${display(member.authority)}</td>`
        }
      </tr>`,
    )
    .join('');

  return `
    <table class="doc-table ${signatures ? 'signatures' : ''}">
      <thead><tr>
        <th>№</th><th>Сторона / роль</th><th>Организация</th><th>Должность</th><th>Ф.И.О.</th>
        ${signatures ? '<th>Подпись</th><th>Дата</th>' : '<th>Документ о полномочиях</th>'}
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function treeAppendix(project, { includeDecision = true, compact = false } = {}) {
  const trees = (project.trees || []).filter((tree) => String(tree.treeNumber || '').trim());
  if (!trees.length) return '<p class="empty-state">Реестр деревьев не заполнен.</p>';

  const rows = trees
    .map((tree, index) => {
      const result = calculateTree(tree);
      const statusClass = result.isSufficient
        ? 'ok-row'
        : result.status === 'contradiction' || result.status === 'missing'
          ? 'error-row'
          : 'warning-row';
      return `
        <tr class="${statusClass}">
          <td class="number">${index + 1}</td>
          <td>${display(tree.treeNumber)}</td>
          <td>${display(tree.location)}${tree.coordinates ? `<br><small>${escapeHtml(tree.coordinates)}</small>` : ''}</td>
          <td>${display(tree.species)}<br><small>${display(tree.group)}</small></td>
          <td class="number">${display(formatNumber(tree.diameter))}</td>
          <td class="number">${display(formatNumber(tree.height))}</td>
          <td>${display(tree.obstacle)}</td>
          <td class="number">${tree.obstacle === 'Нет препятствий' ? '—' : display(formatNumber(tree.obstacleDistance))}</td>
          <td>${display(tree.wholeFellingPossible)}</td>
          <td>${escapeHtml(result.technology)}</td>
          <td>${escapeHtml(result.gesnTable)}</td>
          <td>${escapeHtml(result.subnorm)}</td>
          <td>${display(tree.evidenceReference)}</td>
          ${includeDecision ? `<td>${display(tree.designerDecision)}</td>` : ''}
          <td>${escapeHtml(result.control)}</td>
        </tr>`;
    })
    .join('');

  return `
    <div class="table-scroll-print">
      <table class="doc-table registry-table ${compact ? 'compact-table' : ''}">
        <thead><tr>
          <th>№ п/п</th><th>№ дерева</th><th>Местоположение / ПК</th><th>Порода / группа</th>
          <th>D1,3, см</th><th>Высота, м</th><th>Критическое препятствие</th><th>Расстояние, м</th>
          <th>Валка целиком?</th><th>Принятая технология</th><th>Таблица ГЭСН</th><th>Поднорма</th>
          <th>Фото / схема</th>${includeDecision ? '<th>Решение проектировщика</th>' : ''}<th>Контроль</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function subnormTable(summary) {
  if (!summary.subnormDistribution.length) return '';
  return `
    <table class="doc-table">
      <thead><tr><th>Поднорма</th><th>Наименование / условие</th><th>Количество</th></tr></thead>
      <tbody>${summary.subnormDistribution
        .map(
          (item) => `<tr><td>${escapeHtml(item.code)}</td><td>${display(item.description)}</td><td class="number">${item.count}</td></tr>`,
        )
        .join('')}</tbody>
    </table>`;
}

function notesBlock(title, value) {
  if (!String(value || '').trim()) return '';
  return `<section class="doc-section"><h2>${escapeHtml(title)}</h2><div class="manual-note">${nl2br(value)}</div></section>`;
}

function treeNumbersBlock(label, trees) {
  if (!trees.length) return '';
  return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(listTreeNumbers(trees))}.</p>`;
}

function obstaclesRequireTrafficControl(summary) {
  const traffic = new Set([
    'Проезжая часть / парковка',
    'Пешеходная зона / территория общего пользования',
    'Железнодорожный путь',
  ]);
  return summary.calculated.some(({ tree }) => traffic.has(tree.obstacle));
}

function obstaclesRequireNetworkCoordination(summary) {
  const networks = new Set([
    'Воздушная линия электропередачи',
    'Действующий газопровод / инженерная сеть',
    'Подземные инженерные коммуникации',
  ]);
  return summary.calculated.some(({ tree }) => networks.has(tree.obstacle));
}

function residueSummary(summary) {
  const counts = new Map();
  for (const { tree } of summary.calculated) {
    const key = tree.residues || 'Не определено';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 0);
}

export function renderAct(project) {
  const summary = getProjectSummary(project);
  const meta = project.meta || {};
  return `
    <article class="paper document-act">
      ${documentTitle('АКТ КОМИССИОННОГО ОБСЛЕДОВАНИЯ ДЕРЕВЬЕВ И УСЛОВИЙ ПРОИЗВОДСТВА РАБОТ ПО ИХ ВАЛКЕ')}
      <div class="doc-number-line">
        <span>№ ${display(meta.actNumber, '________')}</span>
        <span>${display(meta.actPlace, '________________')}</span>
        <span>${meta.actDate ? formatDate(meta.actDate) : '«___» __________ 20__ г.'}</span>
      </div>
      ${documentMeta(project)}

      <section class="doc-section">
        <h2>Состав комиссии</h2>
        ${commissionTable(project)}
      </section>

      <section class="doc-section">
        <h2>Результаты обследования</h2>
        ${summaryKpis(summary)}
        ${technologyRows(summary)}
      </section>

      <section class="doc-section conclusion-box">
        <h2>Автоматическое заключение по данным реестра</h2>
        <p>${escapeHtml(summary.conclusion)}</p>
      </section>

      ${notesBlock('Дополнительные сведения к акту', project.notes?.act)}

      <section class="doc-section">
        <h2>Решение комиссии</h2>
        <ol>
          <li>Проектной организации отразить принятую технологию удаления деревьев в проектной/рабочей документации и ПОС, обеспечить соответствие ведомости объёмов работ и сметной документации настоящему акту и приложениям.</li>
          <li>Генподрядной организации разработать ППР или технологическую карту, соответствующие принятой технологии, включая опасную зону, порядок ограждения, применяемые машины и механизмы, ограничения движения и обращение с порубочными остатками.</li>
          ${summary.unresolvedCount > 0 ? '<li>По деревьям с неопределённой нормой проектной организации устранить противоречия либо представить отдельное техническое обоснование до включения работ в ведомость объёмов и смету.</li>' : ''}
          <li>При изменении условий производства работ либо выявлении новых препятствий оформить дополнительное комиссионное обследование и скорректировать проектное решение.</li>
          <li>Настоящий акт не заменяет разрешение на вырубку, порубочный билет и иные обязательные разрешительные документы.</li>
        </ol>
      </section>

      <section class="doc-section page-break-before">
        <h2>Подписи членов комиссии</h2>
        ${commissionTable(project, true)}
      </section>

      <section class="doc-section">
        <h2>Приложение 1. Реестр деревьев</h2>
        ${treeAppendix(project)}
      </section>
    </article>`;
}

export function renderTechnicalDecision(project) {
  const summary = getProjectSummary(project);
  const meta = project.meta || {};
  const decisionParts = [];

  if (summary.wholeCount > 0) {
    decisionParts.push(`
      <h3>1. Валка деревьев целиком</h3>
      <p>Для ${countPhrase(summary.wholeCount)} принята направленная валка целого дерева в предусмотренный сектор. Перед началом работ границы опасной зоны и направление падения должны быть обозначены на местности. Валочный пропил, подпил и применение валочных приспособлений выполняются в соответствии с ППР.</p>
      ${treeNumbersBlock('Номера деревьев', summary.wholeTrees)}
      <p><strong>Рекомендуемая таблица:</strong> ${GESN.whole}.</p>`);
  }

  if (summary.sectionalCount > 0) {
    decisionParts.push(`
      <h3>${summary.wholeCount > 0 ? '2' : '1'}. Поэтапное спиливание</h3>
      <p>Для ${countPhrase(summary.sectionalCount)} валка целиком исключена. Предусматривается последовательное спиливание сучьев и частей ствола с их предварительным закреплением, управляемым спуском на землю и применением телескопического самоходного подъёмника. Площадка установки и подъезд подъёмника должны быть подтверждены схемой и ППР.</p>
      ${treeNumbersBlock('Номера деревьев', summary.sectionalTrees)}
      <p><strong>Рекомендуемая таблица:</strong> ${GESN.sectional}.</p>`);
  }

  if (summary.unresolvedCount > 0) {
    decisionParts.push(`
      <h3>Дополнительная проработка</h3>
      <p>По ${summary.unresolvedCount} ${summary.unresolvedCount === 1 ? 'дереву' : 'деревьям'} норма не определена. До выпуска документации необходимо заполнить обязательные поля реестра, устранить противоречия либо оформить отдельное техническое решение с обоснованием технологии и применяемых машин.</p>
      ${treeNumbersBlock('Номера деревьев', summary.unresolvedTrees)}`);
  }

  if (!decisionParts.length) {
    decisionParts.push('<p>Реестр деревьев не заполнен. Техническое решение будет сформировано после внесения исходных данных.</p>');
  }

  return `
    <article class="paper document-technical">
      ${documentTitle('ТЕХНИЧЕСКОЕ РЕШЕНИЕ ПРОЕКТНОЙ ОРГАНИЗАЦИИ ПО ВЫБОРУ ТЕХНОЛОГИИ ВАЛКИ ДЕРЕВЬЕВ')}
      <div class="doc-number-line">
        <span>№ ${display(meta.technicalDecisionNumber, '________')}</span>
        <span>${meta.technicalDecisionDate ? formatDate(meta.technicalDecisionDate) : '«___» __________ 20__ г.'}</span>
      </div>
      ${documentMeta(project)}

      <section class="doc-section">
        <h2>Автоматические итоги по реестру</h2>
        ${summaryKpis(summary)}
      </section>

      <section class="doc-section conclusion-box">
        <h2>Техническое заключение</h2>
        <p>${escapeHtml(summary.conclusion)}</p>
      </section>

      <section class="doc-section">
        <h2>Решение проектировщика</h2>
        ${decisionParts.join('')}
        <p>Ведомость объёмов работ, сметная документация, ПОС и ППР должны содержать единый состав операций и одинаковое распределение деревьев по принятым технологиям.</p>
      </section>

      ${notesBlock('Дополнительное решение проектировщика', project.notes?.technicalDecision)}

      <section class="doc-section">
        <h2>Распределение по поднормам</h2>
        ${subnormTable(summary) || '<p>Поднормы будут сформированы после заполнения реестра.</p>'}
      </section>

      <section class="doc-section approval-block">
        <table class="doc-table">
          <tbody>
            <tr><th>Разработал</th><td>${display(meta.preparedBy)}</td><th>Подпись / дата</th><td></td></tr>
            <tr><th>Согласовал / утвердил</th><td>${display(meta.approvedBy)}</td><th>Подпись / дата</th><td></td></tr>
          </tbody>
        </table>
      </section>

      <section class="doc-section page-break-before">
        <h2>Приложение. Перечень деревьев к техническому решению</h2>
        ${treeAppendix(project)}
      </section>
    </article>`;
}

function posMeasures(summary) {
  const rows = [];
  const push = (measure, applies, requirement) => {
    rows.push(`<tr><td class="number">${rows.length + 1}</td><td>${escapeHtml(measure)}</td><td>${applies ? 'Да' : 'Нет'}</td><td>${escapeHtml(requirement)}</td></tr>`);
  };

  push('Разбивка и маркировка деревьев', summary.total > 0, summary.total > 0
    ? 'До начала работ вынести номера деревьев на местность и обеспечить совпадение маркировки с актом, схемой и фототаблицей.'
    : 'Не применяется: реестр не заполнен.');
  push('Валка дерева целиком', summary.wholeCount > 0, summary.wholeCount > 0
    ? `Применяется для ${countPhrase(summary.wholeCount)}. Определить направление падения, опасную зону и порядок валочного пропила.`
    : 'Не применяется.');
  push('Поэтапное спиливание', summary.sectionalCount > 0, summary.sectionalCount > 0
    ? `Применяется для ${countPhrase(summary.sectionalCount)}. Предусмотреть закрепление и управляемый спуск частей дерева.`
    : 'Не применяется.');
  push('Подъезд и установка подъёмника', summary.sectionalCount > 0, summary.sectionalCount > 0
    ? 'Предусмотреть подъезд, выравнивание площадки, установку телескопического самоходного подъёмника и ограждение рабочей зоны.'
    : 'Не требуется по принятой технологии.');
  push('Ограничение движения и доступа', obstaclesRequireTrafficControl(summary), obstaclesRequireTrafficControl(summary)
    ? 'Разработать схему временного ограничения движения транспорта/пешеходов, установить ограждения и сигнальные знаки.'
    : 'Специальные ограничения по данным реестра не выявлены; общую опасную зону оградить.');
  push('Работы в охранных зонах сетей', obstaclesRequireNetworkCoordination(summary), obstaclesRequireNetworkCoordination(summary)
    ? 'Согласовать работы с эксплуатирующими организациями, получить допуски и выполнять требования охранных зон.'
    : 'Специальная координация по данным реестра не требуется.');
  push('Обращение с порубочными остатками', summary.total > 0, summary.total > 0
    ? `Организовать обращение с остатками согласно проекту: ${residueSummary(summary).map(([name, count]) => `${name} — ${count}`).join('; ')}.`
    : 'Не применяется.');
  push('Устранение замечаний', summary.unresolvedCount > 0, summary.unresolvedCount > 0
    ? `До начала работ уточнить решения по ${countPhrase(summary.unresolvedCount)} и актуализировать ВОР, смету, ПОС и ППР.`
    : 'Не требуется.');

  return rows.join('');
}

function posResources(summary) {
  const rows = [];
  const push = (resource, applies, purpose) => {
    rows.push(`<tr><td class="number">${rows.length + 1}</td><td>${escapeHtml(resource)}</td><td>${escapeHtml(applies)}</td><td>${escapeHtml(purpose)}</td></tr>`);
  };
  push('Бензопила и ручной инструмент', summary.total > 0 ? 'Да' : 'Нет', 'Валка, обрезка сучьев и разделка древесины в соответствии с принятой технологией.');
  push('Валочные приспособления', summary.wholeCount > 0 ? 'Да' : 'Нет', 'Направление падения целого дерева и безопасное завершение валочного пропила.');
  push('Телескопический самоходный подъёмник', summary.sectionalCount > 0 ? 'Да' : 'Нет', 'Работа на высоте при поэтапном спиливании по ГЭСН 47-01-128.');
  push('Верёвочная и такелажная оснастка', summary.sectionalCount > 0 ? 'Да' : 'Нет', 'Закрепление и управляемый спуск сучьев и частей ствола.');
  push('Ограждения, знаки, сигнальные средства', summary.total > 0 ? 'Да' : 'Нет', 'Ограждение опасной зоны и исключение доступа посторонних.');
  push('Транспорт / щеподробительная техника', summary.total > 0 ? 'По проекту' : 'Нет', 'Вывоз, передача либо переработка порубочных остатков по решениям проекта.');
  return rows.join('');
}

export function renderPos(project) {
  const summary = getProjectSummary(project);
  const meta = project.meta || {};
  return `
    <article class="paper document-pos">
      ${documentTitle('ФРАГМЕНТ ПРОЕКТА ОРГАНИЗАЦИИ СТРОИТЕЛЬСТВА (ПОС): ВАЛКА ДЕРЕВЬЕВ')}
      ${documentMeta(project)}
      <section class="doc-section">
        <h2>Автоматические итоги по реестру</h2>
        ${summaryKpis(summary)}
      </section>
      <section class="doc-section conclusion-box">
        <h2>Решение по организации строительства</h2>
        <p>${escapeHtml(summary.conclusion)}</p>
        ${summary.total > 0 ? `<p>Работы выполнять после получения разрешительных документов, комиссионной маркировки деревьев и передачи фронта работ. Опасные зоны должны быть ограждены до начала валки и сохраняться до полного удаления зависших частей и очистки территории.</p>` : ''}
      </section>

      <section class="doc-section">
        <h2>Организационно-технологические мероприятия</h2>
        <table class="doc-table">
          <thead><tr><th>№</th><th>Мероприятие</th><th>Применяется</th><th>Автоматически сформированное требование</th></tr></thead>
          <tbody>${posMeasures(summary)}</tbody>
        </table>
      </section>

      <section class="doc-section">
        <h2>Потребность в машинах, механизмах и оснастке</h2>
        <table class="doc-table">
          <thead><tr><th>№</th><th>Ресурс</th><th>Применяется</th><th>Основание / назначение</th></tr></thead>
          <tbody>${posResources(summary)}</tbody>
        </table>
      </section>

      ${notesBlock('Дополнительные решения ПОС', project.notes?.pos)}

      <section class="doc-section">
        <h2>Контроль согласованности документации</h2>
        <ul>
          <li>Количество деревьев и их номера должны совпадать в акте, ситуационном плане, перечётной ведомости, ВОР и смете.</li>
          <li>Для деревьев по ГЭСН 47-01-128 необходимо показать место установки и подъезд телескопического подъёмника.</li>
          <li>Для деревьев по ГЭСН 01-02-099 необходимо показать сектор падения и достаточность свободной зоны.</li>
          <li>Операции по обрубке сучьев, раскряжёвке, трелёвке, погрузке, вывозу, корчёвке пней и восстановлению территории учитывать по составу проекта и сметных норм без двойного учёта.</li>
          ${summary.unresolvedCount > 0 ? '<li class="warning-text">Начало работ по строкам с неопределённой нормой не допускается до выпуска уточнённого проектного решения.</li>' : ''}
        </ul>
      </section>

      <section class="doc-section page-break-before">
        <h2>Приложение. Ведомость участков и деревьев</h2>
        ${treeAppendix(project, { includeDecision: false, compact: true })}
      </section>

      <footer class="doc-footer-line">Раздел / лист проекта: ${display(meta.posSection || meta.projectSheetReference)}</footer>
    </article>`;
}

function pprWholeSequence(summary) {
  if (!summary.wholeCount) return '';
  return `
    <section class="doc-section">
      <h2>Технологическая последовательность: валка дерева целиком</h2>
      ${treeNumbersBlock('Деревья', summary.wholeTrees)}
      <ol>
        <li>Осмотреть дерево, уточнить естественный наклон, состояние ствола и кроны, определить направление валки согласно схеме.</li>
        <li>Очистить рабочую площадку и подготовить не менее двух путей отхода работников из опасной зоны.</li>
        <li>Оградить опасную зону, удалить посторонних, при необходимости прекратить движение транспорта и пешеходов.</li>
        <li>Выполнить направляющий подпил и основной валочный пропил с оставлением недопила, применить валочные приспособления.</li>
        <li>После падения дерева убедиться в отсутствии зависших частей, выполнить обрезку сучьев и разделку древесины согласно проекту.</li>
      </ol>
      <p><strong>Сметная таблица:</strong> ${GESN.whole}.</p>
    </section>`;
}

function pprSectionalSequence(summary) {
  if (!summary.sectionalCount) return '';
  return `
    <section class="doc-section">
      <h2>Технологическая последовательность: поэтапное спиливание</h2>
      ${treeNumbersBlock('Деревья', summary.sectionalTrees)}
      <ol>
        <li>Проверить площадку и подъезд, установить телескопический самоходный подъёмник на устойчивом основании согласно инструкции изготовителя.</li>
        <li>Оградить опасную зону, назначить сигнальщика, исключить нахождение людей под рабочей зоной и траекторией спуска частей.</li>
        <li>Проверить верёвочную и такелажную оснастку, точки крепления и средства связи между работниками.</li>
        <li>Последовательно удалить сучья и части кроны. Каждую спиливаемую часть предварительно закреплять и управляемо опускать на подготовленную площадку.</li>
        <li>Разделывать ствол сверху вниз участками, масса и габариты которых соответствуют расчётной схеме спуска и грузоподъёмности оснастки.</li>
        <li>После завершения работ удалить зависшие части, очистить площадку и организовать обращение с порубочными остатками.</li>
      </ol>
      <p><strong>Сметная таблица:</strong> ${GESN.sectional}.</p>
    </section>`;
}

function pprQualityTable(summary) {
  const rows = summary.calculated.map(({ tree, result }, index) => `
    <tr class="${result.isSufficient ? 'ok-row' : 'warning-row'}">
      <td class="number">${index + 1}</td>
      <td>${display(tree.treeNumber)}</td>
      <td>${escapeHtml(result.gesnTable)}</td>
      <td>${escapeHtml(result.subnorm)}</td>
      <td>${escapeHtml(result.control)}</td>
    </tr>`).join('');
  return `
    <table class="doc-table">
      <thead><tr><th>№</th><th>№ дерева</th><th>Таблица</th><th>Поднорма</th><th>Контроль до начала работ</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5">Реестр не заполнен.</td></tr>'}</tbody>
    </table>`;
}

export function renderPpr(project) {
  const summary = getProjectSummary(project);
  const meta = project.meta || {};
  return `
    <article class="paper document-ppr">
      ${documentTitle('ПРОЕКТ ПРОИЗВОДСТВА РАБОТ / ТЕХНОЛОГИЧЕСКАЯ КАРТА: ВАЛКА ДЕРЕВЬЕВ')}
      <div class="doc-number-line">
        <span>№ ${display(meta.pprNumber, '________')}</span>
        <span>${meta.pprDate ? formatDate(meta.pprDate) : '«___» __________ 20__ г.'}</span>
      </div>
      ${documentMeta(project)}

      <section class="doc-section">
        <h2>1. Исходные данные и область применения</h2>
        <p>${escapeHtml(summary.conclusion)}</p>
        <p>ППР применяется только к деревьям, включённым в реестр и промаркированным на местности. При изменении фактических условий работы останавливаются до комиссионного уточнения решения.</p>
      </section>

      <section class="doc-section">
        <h2>2. Подготовительные мероприятия</h2>
        <ol>
          <li>Проверить наличие разрешения на вырубку, порубочного билета и согласований владельцев территории и инженерных сетей.</li>
          <li>Сверить номера деревьев с ситуационной схемой, актом обследования и фототаблицей.</li>
          <li>Назначить ответственного производителя работ, провести целевой инструктаж и оформить допуски работников и техники.</li>
          <li>Проверить техническое состояние бензопил, подъёмника, такелажа, средств связи и индивидуальной защиты.</li>
          <li>Оградить опасную зону; при наличии дорог, пешеходных зон и сетей реализовать согласованную схему ограничений.</li>
        </ol>
      </section>

      ${pprWholeSequence(summary)}
      ${pprSectionalSequence(summary)}

      <section class="doc-section">
        <h2>Требования безопасности</h2>
        <ul>
          <li>Запрещается нахождение людей в опасной зоне и под спиливаемыми либо подвешенными частями дерева.</li>
          <li>Работы при недопустимых погодных условиях, недостаточной видимости, неисправности оборудования или потере устойчивой связи прекращаются.</li>
          <li>Способ безопасного удаления аварийных, зависших и наклонных деревьев определяется отдельным решением ответственного производителя работ и проектировщика.</li>
          <li>При работах в охранных зонах действующих коммуникаций выполнять требования владельцев сетей и нарядно-допускной системы.</li>
          <li>До снятия ограждения проверить отсутствие зависших сучьев и частей ствола, убрать порубочные остатки и восстановить безопасный проход.</li>
        </ul>
      </section>

      <section class="doc-section">
        <h2>Операционный контроль</h2>
        ${pprQualityTable(summary)}
      </section>

      ${notesBlock('Дополнительные решения ППР', project.notes?.ppr)}

      <section class="doc-section approval-block">
        <table class="doc-table">
          <tbody>
            <tr><th>Разработал ППР</th><td>${display(meta.preparedBy)}</td><th>Подпись / дата</th><td></td></tr>
            <tr><th>Утвердил</th><td>${display(meta.approvedBy)}</td><th>Подпись / дата</th><td></td></tr>
            <tr><th>Ответственный производитель работ</th><td></td><th>Подпись / дата</th><td></td></tr>
          </tbody>
        </table>
      </section>

      <section class="doc-section page-break-before">
        <h2>Приложение. Реестр деревьев и принятых технологий</h2>
        ${treeAppendix(project, { compact: true })}
      </section>
    </article>`;
}

export function renderDocument(type, project) {
  switch (type) {
    case 'technical':
      return renderTechnicalDecision(project);
    case 'pos':
      return renderPos(project);
    case 'ppr':
      return renderPpr(project);
    case 'act':
    default:
      return renderAct(project);
  }
}

export const PRINT_CSS = `
  :root{--blue:#075b9f;--blue-dark:#053e70;--light:#eaf4fb;--line:#8ba4b7;--warn:#fff1c7;--error:#fde2e2;--ok:#e8f6ec;}
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,"Helvetica Neue",sans-serif;font-size:10pt;line-height:1.35}
  .paper{width:100%;margin:0 auto;background:#fff}
  .doc-header{background:var(--blue-dark);color:#fff;text-align:center;padding:10px 14px;margin-bottom:8px}
  .doc-header h1{font-size:13pt;line-height:1.2;margin:0;text-transform:uppercase}
  .doc-header p{margin:4px 0 0;font-size:9pt}
  .doc-number-line{display:flex;justify-content:space-between;gap:12px;margin:8px 0;font-weight:700}
  .doc-section{margin:10px 0}
  .doc-section h2{margin:0 0 5px;padding:5px 7px;background:var(--blue);color:#fff;font-size:10pt;text-transform:uppercase}
  .doc-section h3{margin:8px 0 4px;font-size:10pt}
  p{margin:5px 0;text-align:justify}
  ol,ul{margin:5px 0 5px 22px;padding:0}
  li{margin:3px 0}
  .doc-table{border-collapse:collapse;width:100%;table-layout:fixed;margin:5px 0;font-size:8.5pt}
  .doc-table th,.doc-table td{border:1px solid var(--line);padding:4px 5px;vertical-align:top;overflow-wrap:anywhere}
  .doc-table th{background:var(--blue-dark);color:#fff;text-align:center;font-weight:700}
  .meta-table th{width:18%;background:#eef3f6;color:#111;text-align:left}
  .summary-table{max-width:700px}
  .summary-table th:first-child{width:78%}
  .number{text-align:center;white-space:nowrap}
  .conclusion-box{background:var(--light);border:1px solid #9ec1db;padding-bottom:5px}
  .conclusion-box p{padding:0 8px}
  .manual-note{border:1px solid var(--line);padding:8px;min-height:35px;white-space:normal}
  .signature-cell{height:32px}
  .warning-row td{background:var(--warn)}
  .error-row td{background:var(--error)}
  .ok-row td{background:var(--ok)}
  .warning-text{font-weight:700;color:#8a3400}
  .registry-table{font-size:7pt;table-layout:auto}
  .registry-table th,.registry-table td{padding:3px}
  .compact-table{font-size:6.7pt}
  .empty-state{padding:10px;border:1px dashed var(--line);text-align:center}
  .approval-block{margin-top:18px}
  .doc-footer-line{margin-top:12px;border-top:1px solid #777;padding-top:4px;font-size:8pt}
  small{font-size:7pt;color:#444}
  .page-break-before{break-before:page;page-break-before:always}
  @page{size:A4 landscape;margin:10mm}
  @media print{
    body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
    .paper{box-shadow:none}
    table,tr,td,th{break-inside:avoid}
    h2,h3{break-after:avoid}
  }
`;

export function buildStandaloneDocument(type, project) {
  const titles = {
    act: 'Акт обследования деревьев',
    technical: 'Техническое решение проектировщика',
    pos: 'ПОС — валка деревьев',
    ppr: 'ППР — валка деревьев',
  };
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(titles[type] || titles.act)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>${renderDocument(type, project)}</body>
</html>`;
}
