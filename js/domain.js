export const APP_VERSION = '1.0.0';

export const OPTIONS = Object.freeze({
  yesNoUnknown: ['Да', 'Нет', 'Не определено'],
  obstacles: [
    'Нет препятствий',
    'Проезжая часть / парковка',
    'Пешеходная зона / территория общего пользования',
    'Здание',
    'Сооружение',
    'Ограждение',
    'Воздушная линия электропередачи',
    'Действующий газопровод / инженерная сеть',
    'Подземные инженерные коммуникации',
    'Сохраняемые деревья / насаждения',
    'Железнодорожный путь',
    'Водоём / овраг / откос',
    'Иное препятствие',
  ],
  groups: [
    'Мягколиственная',
    'Твердолиственная',
    'Хвойная (кроме лиственницы)',
    'Лиственница',
    'Не определено',
  ],
  conditions: [
    'Жизнеспособное',
    'Сухостойное',
    'Аварийное / наклонное',
    'Зависшее',
    'Повреждённое',
    'Не определено',
  ],
  residues: [
    'Сжигание предусмотрено проектом',
    'Без сжигания — вывоз',
    'Без сжигания — измельчение / переработка',
    'Без сжигания — складирование / передача',
    'Не определено',
  ],
  stages: ['П', 'Р', 'ПД', 'РД', 'Иная'],
});

export const TECHNOLOGIES = Object.freeze({
  whole: 'Валка дерева целиком в заданном направлении',
  sectional: 'Поэтапное спиливание дерева по частям с закреплением и управляемым спуском',
  needsDecision: 'Требуется решение проектировщика',
  specialJustification:
    'Требуется отдельное обоснование: валка целиком отмечена невозможной, но препятствие в секторе отсутствует и свободная зона обеспечена',
  contradiction: 'Противоречивые данные — проверить',
});

export const GESN = Object.freeze({
  whole: 'ГЭСН 01-02-099',
  sectional: 'ГЭСН 47-01-128',
  undefined: 'Не определено',
});

export const CONTROL = Object.freeze({
  sufficient: 'Данные достаточны для выбора нормы',
  missing: 'Заполнить обязательные поля',
  contradiction:
    'Противоречие в исходных данных: проверить препятствие, сектор падения, свободную зону и возможность валки целиком',
  noNormJustification:
    'Норма не определена: требуется отдельное техническое обоснование проектировщика',
  lift:
    'Проверить: ГЭСН 47-01-128 предусматривает телескопический подъёмник; подтвердить подъезд и установку',
  zone:
    'Проверить: свободная зона или расстояние до препятствия меньше высоты дерева',
  hazardous:
    'Проверить: состояние дерева требует отдельного решения по безопасности',
  undefined:
    'Норма не определена: устранить противоречия или дополнить исходные данные',
});

export const NORM_REFERENCE = Object.freeze([
  {
    code: 'ГЭСН 01-02-099-01',
    table: GESN.whole,
    description:
      'Валка деревьев мягких пород с корня, диаметр до 16 см; состав нормы предусматривает расчистку и сжигание порубочных остатков.',
  },
  {
    code: 'ГЭСН 01-02-099-02',
    table: GESN.whole,
    description:
      'Валка деревьев мягких пород с корня, диаметр свыше 16 до 20 см; состав нормы предусматривает расчистку и сжигание порубочных остатков.',
  },
  {
    code: 'ГЭСН 01-02-099-03',
    table: GESN.whole,
    description:
      'Валка деревьев мягких пород с корня, диаметр свыше 20 до 24 см; состав нормы предусматривает расчистку и сжигание порубочных остатков.',
  },
  {
    code: 'ГЭСН 01-02-099-04',
    table: GESN.whole,
    description:
      'Валка деревьев мягких пород с корня, диаметр свыше 24 до 28 см; состав нормы предусматривает расчистку и сжигание порубочных остатков.',
  },
  {
    code: 'ГЭСН 01-02-099-05',
    table: GESN.whole,
    description:
      'Валка деревьев мягких пород с корня, диаметр свыше 28 до 32 см; состав нормы предусматривает расчистку и сжигание порубочных остатков.',
  },
  {
    code: 'ГЭСН 01-02-099-06',
    table: GESN.whole,
    description:
      'Валка деревьев мягких пород с корня, диаметр свыше 32 см; состав нормы предусматривает расчистку и сжигание порубочных остатков.',
  },
  {
    code: 'ГЭСН 01-02-099-07',
    table: GESN.whole,
    description:
      'Валка деревьев твёрдых пород и лиственницы с корня, диаметр до 16 см; состав нормы предусматривает расчистку и сжигание порубочных остатков.',
  },
  {
    code: 'ГЭСН 01-02-099-08',
    table: GESN.whole,
    description:
      'Валка деревьев твёрдых пород и лиственницы с корня, диаметр свыше 16 до 20 см; состав нормы предусматривает расчистку и сжигание порубочных остатков.',
  },
  {
    code: 'ГЭСН 01-02-099-09',
    table: GESN.whole,
    description:
      'Валка деревьев твёрдых пород и лиственницы с корня, диаметр свыше 20 до 24 см; состав нормы предусматривает расчистку и сжигание порубочных остатков.',
  },
  {
    code: 'ГЭСН 01-02-099-10',
    table: GESN.whole,
    description:
      'Валка деревьев твёрдых пород и лиственницы с корня, диаметр свыше 24 до 28 см; состав нормы предусматривает расчистку и сжигание порубочных остатков.',
  },
  {
    code: 'ГЭСН 01-02-099-11',
    table: GESN.whole,
    description:
      'Валка деревьев твёрдых пород и лиственницы с корня, диаметр свыше 28 до 32 см; состав нормы предусматривает расчистку и сжигание порубочных остатков.',
  },
  {
    code: 'ГЭСН 01-02-099-12',
    table: GESN.whole,
    description:
      'Валка деревьев твёрдых пород и лиственницы с корня, диаметр свыше 32 см; состав нормы предусматривает расчистку и сжигание порубочных остатков.',
  },
  {
    code: 'ГЭСН 01-02-099-13',
    table: GESN.whole,
    description:
      'Валка деревьев мягких пород с корня без сжигания порубочных остатков, диаметр до 16 см.',
  },
  {
    code: 'ГЭСН 01-02-099-14',
    table: GESN.whole,
    description:
      'Валка деревьев мягких пород с корня без сжигания порубочных остатков, диаметр свыше 16 до 20 см.',
  },
  {
    code: 'ГЭСН 01-02-099-15',
    table: GESN.whole,
    description:
      'Валка деревьев мягких пород с корня без сжигания порубочных остатков, диаметр свыше 20 до 24 см.',
  },
  {
    code: 'ГЭСН 01-02-099-16',
    table: GESN.whole,
    description:
      'Валка деревьев мягких пород с корня без сжигания порубочных остатков, диаметр свыше 24 до 28 см.',
  },
  {
    code: 'ГЭСН 01-02-099-17',
    table: GESN.whole,
    description:
      'Валка деревьев мягких пород с корня без сжигания порубочных остатков, диаметр свыше 28 до 32 см.',
  },
  {
    code: 'ГЭСН 01-02-099-18',
    table: GESN.whole,
    description:
      'Валка деревьев мягких пород с корня без сжигания порубочных остатков, диаметр свыше 32 до 40 см.',
  },
  {
    code: 'ГЭСН 01-02-099-19',
    table: GESN.whole,
    description:
      'Валка деревьев мягких пород с корня без сжигания порубочных остатков, диаметр свыше 40 до 48 см.',
  },
  {
    code: 'ГЭСН 01-02-099-20',
    table: GESN.whole,
    description:
      'Валка деревьев мягких пород с корня без сжигания порубочных остатков, диаметр свыше 48 до 56 см.',
  },
  {
    code: 'ГЭСН 01-02-099-21',
    table: GESN.whole,
    description:
      'Валка деревьев мягких пород с корня без сжигания порубочных остатков, диаметр свыше 56 до 64 см.',
  },
  {
    code: 'ГЭСН 01-02-099-22',
    table: GESN.whole,
    description:
      'Валка деревьев твёрдых пород и лиственницы с корня без сжигания порубочных остатков, диаметр до 16 см.',
  },
  {
    code: 'ГЭСН 01-02-099-23',
    table: GESN.whole,
    description:
      'Валка деревьев твёрдых пород и лиственницы с корня без сжигания порубочных остатков, диаметр свыше 16 до 20 см.',
  },
  {
    code: 'ГЭСН 01-02-099-24',
    table: GESN.whole,
    description:
      'Валка деревьев твёрдых пород и лиственницы с корня без сжигания порубочных остатков, диаметр свыше 20 до 24 см.',
  },
  {
    code: 'ГЭСН 01-02-099-25',
    table: GESN.whole,
    description:
      'Валка деревьев твёрдых пород и лиственницы с корня без сжигания порубочных остатков, диаметр свыше 24 до 28 см.',
  },
  {
    code: 'ГЭСН 01-02-099-26',
    table: GESN.whole,
    description:
      'Валка деревьев твёрдых пород и лиственницы с корня без сжигания порубочных остатков, диаметр свыше 28 до 32 см.',
  },
  {
    code: 'ГЭСН 01-02-099-27',
    table: GESN.whole,
    description:
      'Валка деревьев твёрдых пород и лиственницы с корня без сжигания порубочных остатков, диаметр свыше 32 до 40 см.',
  },
  {
    code: 'ГЭСН 01-02-099-28',
    table: GESN.whole,
    description:
      'Валка деревьев твёрдых пород и лиственницы с корня без сжигания порубочных остатков, диаметр свыше 40 до 48 см.',
  },
  {
    code: 'ГЭСН 01-02-099-29',
    table: GESN.whole,
    description:
      'Валка деревьев твёрдых пород и лиственницы с корня без сжигания порубочных остатков, диаметр свыше 48 до 56 см.',
  },
  {
    code: 'ГЭСН 01-02-099-30',
    table: GESN.whole,
    description:
      'Валка деревьев твёрдых пород и лиственницы с корня без сжигания порубочных остатков, диаметр свыше 56 до 64 см.',
  },
  {
    code: 'ГЭСН 47-01-128-01',
    table: GESN.sectional,
    description:
      'Валка с разделкой древесины на корню твердолиственных пород, диаметр до 0,5 м.',
  },
  {
    code: 'ГЭСН 47-01-128-02',
    table: GESN.sectional,
    description:
      'Валка с разделкой древесины на корню твердолиственных пород, диаметр свыше 0,5 м.',
  },
  {
    code: 'ГЭСН 47-01-128-03',
    table: GESN.sectional,
    description:
      'Валка с разделкой древесины на корню мягколиственных и хвойных пород, диаметр до 0,5 м.',
  },
  {
    code: 'ГЭСН 47-01-128-04',
    table: GESN.sectional,
    description:
      'Валка с разделкой древесины на корню мягколиственных и хвойных пород, диаметр свыше 0,5 м.',
  },
]);

export function createId(prefix = 'id') {
  const randomPart =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomPart}`;
}

export function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function createBlankTree(sequence = 1) {
  return {
    id: createId('tree'),
    treeNumber: String(sequence),
    location: '',
    coordinates: '',
    species: '',
    group: '',
    diameter: '',
    height: '',
    condition: '',
    obstacle: '',
    obstacleDistance: '',
    freeZoneLength: '',
    obstacleInSector: '',
    freeZoneProvided: '',
    wholeFellingPossible: '',
    liftPossible: '',
    evidenceReference: '',
    residues: '',
    designerDecision: '',
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createBlankProject(title = 'Новый объект') {
  const now = new Date().toISOString();
  return {
    id: createId('project'),
    createdAt: now,
    updatedAt: now,
    meta: {
      objectName: title,
      address: '',
      routeSection: '',
      projectCode: '',
      stage: '',
      customer: '',
      technicalCustomer: '',
      designer: '',
      generalContractor: '',
      inspectionBasis: '',
      actNumber: '',
      actDate: todayIso(),
      actPlace: '',
      technicalDecisionNumber: '',
      technicalDecisionDate: todayIso(),
      posSection: '',
      pprNumber: '',
      pprDate: todayIso(),
      projectSheetReference: '',
      preparedBy: '',
      approvedBy: '',
    },
    commission: [
      blankCommissionMember('Представитель заказчика / технического заказчика'),
      blankCommissionMember('Представитель проектной организации'),
      blankCommissionMember('Представитель строительного контроля'),
      blankCommissionMember('Представитель генподрядной организации'),
    ],
    trees: [],
    notes: {
      technicalDecision: '',
      pos: '',
      ppr: '',
      act: '',
    },
  };
}

export function blankCommissionMember(role = '') {
  return {
    id: createId('member'),
    role,
    organization: '',
    position: '',
    name: '',
    authority: '',
    date: '',
  };
}

function valueMissing(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function isUnknown(value) {
  return valueMissing(value) || value === 'Не определено';
}

function positiveNumber(value) {
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function chooseTechnology(tree) {
  const whole = tree.wholeFellingPossible;
  const sector = tree.obstacleInSector;
  const free = tree.freeZoneProvided;

  if (isUnknown(whole) || isUnknown(sector) || isUnknown(free)) {
    return TECHNOLOGIES.needsDecision;
  }

  if (whole === 'Нет') {
    if (sector === 'Да' || free === 'Нет') {
      return TECHNOLOGIES.sectional;
    }
    return TECHNOLOGIES.specialJustification;
  }

  if (whole === 'Да') {
    if (sector === 'Нет' && free === 'Да') {
      return TECHNOLOGIES.whole;
    }
    if (sector === 'Да' || free === 'Нет') {
      return TECHNOLOGIES.contradiction;
    }
  }

  return TECHNOLOGIES.needsDecision;
}

export function chooseGesnTable(technology) {
  if (technology === TECHNOLOGIES.whole) return GESN.whole;
  if (technology === TECHNOLOGIES.sectional) return GESN.sectional;
  return GESN.undefined;
}

function isSoftFor01(group) {
  return group === 'Мягколиственная' || group === 'Хвойная (кроме лиственницы)';
}

function isHardFor01(group) {
  return group === 'Твердолиственная' || group === 'Лиственница';
}

function isSoftFor47(group) {
  return (
    group === 'Мягколиственная' ||
    group === 'Хвойная (кроме лиственницы)' ||
    group === 'Лиственница'
  );
}

function isHardFor47(group) {
  return group === 'Твердолиственная';
}

function diameterCodeBurning(diameter, soft) {
  const suffixes = soft
    ? ['01', '02', '03', '04', '05', '06']
    : ['07', '08', '09', '10', '11', '12'];
  const thresholds = [16, 20, 24, 28, 32];
  const index = thresholds.findIndex((limit) => diameter <= limit);
  return suffixes[index === -1 ? suffixes.length - 1 : index];
}

function diameterCodeNoBurning(diameter, soft) {
  const suffixes = soft
    ? ['13', '14', '15', '16', '17', '18', '19', '20', '21']
    : ['22', '23', '24', '25', '26', '27', '28', '29', '30'];
  const thresholds = [16, 20, 24, 28, 32, 40, 48, 56, 64];
  const index = thresholds.findIndex((limit) => diameter <= limit);
  if (index === -1) return null;
  return suffixes[index];
}

export function chooseSubnorm(tree, gesnTable) {
  const diameter = positiveNumber(tree.diameter);
  const group = tree.group;

  if (gesnTable === GESN.sectional) {
    if (isUnknown(group) || !diameter) return 'Уточнить группу породы и диаметр';
    if (isHardFor47(group)) {
      return diameter <= 50 ? 'ГЭСН 47-01-128-01' : 'ГЭСН 47-01-128-02';
    }
    if (isSoftFor47(group)) {
      return diameter <= 50 ? 'ГЭСН 47-01-128-03' : 'ГЭСН 47-01-128-04';
    }
    return 'Уточнить группу породы';
  }

  if (gesnTable === GESN.whole) {
    if (isUnknown(group) || !diameter || isUnknown(tree.residues)) {
      return 'Уточнить породу, диаметр и обращение с остатками';
    }

    const soft = isSoftFor01(group);
    const hard = isHardFor01(group);
    if (!soft && !hard) return 'Уточнить группу породы';

    if (tree.residues === 'Сжигание предусмотрено проектом') {
      const suffix = diameterCodeBurning(diameter, soft);
      return `ГЭСН 01-02-099-${suffix}`;
    }

    if (String(tree.residues).startsWith('Без сжигания')) {
      const suffix = diameterCodeNoBurning(diameter, soft);
      return suffix
        ? `ГЭСН 01-02-099-${suffix}`
        : 'Проверить норму: диаметр более 64 см';
    }

    return 'Уточнить обращение с остатками';
  }

  return GESN.undefined;
}

export function requiredFields(tree) {
  const missing = [];
  const require = (key, label, condition = true) => {
    if (condition && valueMissing(tree[key])) missing.push(label);
  };

  require('treeNumber', '№ дерева');
  require('location', 'местоположение / ПК');
  require('species', 'порода');
  require('group', 'группа породы');
  if (!positiveNumber(tree.diameter)) missing.push('диаметр D1,3');
  if (!positiveNumber(tree.height)) missing.push('высота');
  require('condition', 'состояние');
  require('obstacle', 'критическое препятствие');
  require(
    'obstacleDistance',
    'расстояние до препятствия',
    Boolean(tree.obstacle && tree.obstacle !== 'Нет препятствий'),
  );
  if (!positiveNumber(tree.freeZoneLength)) missing.push('длина свободной зоны');
  require('obstacleInSector', 'препятствие в секторе падения');
  require('freeZoneProvided', 'свободная зона обеспечена');
  require('wholeFellingPossible', 'возможность валки целиком');
  if (!tree.evidenceReference && !(tree.photos && tree.photos.length)) {
    missing.push('фото / схема / лист');
  }
  require('residues', 'обращение с порубочными остатками');

  return missing;
}

export function buildRationale(tree, gesnTable) {
  const obstacle = tree.obstacle || 'не указано';
  const distance = positiveNumber(tree.obstacleDistance);
  const freeZone = positiveNumber(tree.freeZoneLength);

  if (gesnTable === GESN.whole) {
    return [
      'Валка целиком технически возможна.',
      'Свободная зона падения обеспечена, критическое препятствие находится вне предполагаемого сектора падения.',
      `Критическое препятствие: ${obstacle}.`,
      `Расстояние до препятствия: ${distance ? `${formatNumber(distance)} м` : 'не применимо'}.`,
      `Длина свободной зоны: ${freeZone ? `${formatNumber(freeZone)} м` : 'не указана'}.`,
      'Проектом предусматривается направленная валка целого дерева.',
    ].join(' ');
  }

  if (gesnTable === GESN.sectional) {
    return [
      'Валка целиком технически невозможна.',
      `Критическое препятствие: ${obstacle}.`,
      `Расстояние до препятствия: ${distance ? `${formatNumber(distance)} м` : 'не указано'}.`,
      'Проектом предусматривается последовательное спиливание дерева по частям, закрепление спиливаемых частей и их управляемый спуск с применением подъёмника.',
    ].join(' ');
  }

  return 'Автоматическое обоснование не сформировано: устраните незаполненные или противоречивые данные.';
}

export function calculateTree(tree) {
  const technology = chooseTechnology(tree);
  const gesnTable = chooseGesnTable(technology);
  const subnorm = chooseSubnorm(tree, gesnTable);
  const missing = requiredFields(tree);
  const warnings = [];

  const height = positiveNumber(tree.height);
  const freeZone = positiveNumber(tree.freeZoneLength);
  const distance = positiveNumber(tree.obstacleDistance);

  const obstacleContradiction =
    tree.obstacle === 'Нет препятствий' && tree.obstacleInSector === 'Да';
  const technologyContradiction = technology === TECHNOLOGIES.contradiction;
  const specialJustification = technology === TECHNOLOGIES.specialJustification;

  if (missing.length) {
    warnings.push(`${CONTROL.missing}: ${missing.join(', ')}.`);
  }
  if (obstacleContradiction || technologyContradiction) {
    warnings.push(CONTROL.contradiction);
  }
  if (specialJustification) {
    warnings.push(CONTROL.noNormJustification);
  }
  if (gesnTable === GESN.sectional && tree.liftPossible !== 'Да') {
    warnings.push(CONTROL.lift);
  }
  if (
    gesnTable === GESN.whole &&
    height &&
    ((freeZone && freeZone < height) ||
      (tree.obstacle !== 'Нет препятствий' && distance && distance < height))
  ) {
    warnings.push(CONTROL.zone);
  }
  if (
    gesnTable === GESN.whole &&
    (tree.condition === 'Аварийное / наклонное' || tree.condition === 'Зависшее')
  ) {
    warnings.push(CONTROL.hazardous);
  }
  if (gesnTable === GESN.undefined && !specialJustification && !technologyContradiction) {
    warnings.push(CONTROL.undefined);
  }
  if (String(subnorm).startsWith('Уточнить') || String(subnorm).startsWith('Проверить')) {
    warnings.push(subnorm);
  }

  const deduplicatedWarnings = [...new Set(warnings)];
  const control = deduplicatedWarnings.length
    ? deduplicatedWarnings.join(' ')
    : CONTROL.sufficient;

  let status = 'sufficient';
  if (missing.length) status = 'missing';
  else if (obstacleContradiction || technologyContradiction) status = 'contradiction';
  else if (specialJustification || gesnTable === GESN.undefined) status = 'undefined';
  else if (gesnTable === GESN.sectional && tree.liftPossible !== 'Да') status = 'lift';
  else if (control !== CONTROL.sufficient) status = 'warning';

  return {
    technology,
    gesnTable,
    subnorm,
    rationale: buildRationale(tree, gesnTable),
    control,
    warnings: deduplicatedWarnings,
    missing,
    status,
    isSufficient: control === CONTROL.sufficient,
  };
}

export function getProjectSummary(project) {
  const trees = (project?.trees || []).filter((tree) => String(tree.treeNumber || '').trim());
  const calculated = trees.map((tree) => ({ tree, result: calculateTree(tree) }));
  const whole = calculated.filter(({ result }) => result.gesnTable === GESN.whole);
  const sectional = calculated.filter(({ result }) => result.gesnTable === GESN.sectional);
  const unresolved = calculated.filter(({ result }) => result.gesnTable === GESN.undefined);
  const sufficient = calculated.filter(({ result }) => result.isSufficient);
  const remarks = calculated.filter(({ result }) => !result.isSufficient);

  const obstacleMap = new Map();
  for (const { tree } of calculated) {
    const key = tree.obstacle || 'Не указано';
    obstacleMap.set(key, (obstacleMap.get(key) || 0) + 1);
  }

  const subnormMap = new Map();
  for (const { result } of calculated) {
    if (result.gesnTable === GESN.undefined) continue;
    const key = result.subnorm || 'Не определено';
    subnormMap.set(key, (subnormMap.get(key) || 0) + 1);
  }

  return {
    total: trees.length,
    wholeCount: whole.length,
    sectionalCount: sectional.length,
    unresolvedCount: unresolved.length,
    sufficientCount: sufficient.length,
    remarksCount: remarks.length,
    wholeTrees: whole.map((item) => item.tree),
    sectionalTrees: sectional.map((item) => item.tree),
    unresolvedTrees: unresolved.map((item) => item.tree),
    calculated,
    obstacleDistribution: [...obstacleMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ru')),
    subnormDistribution: [...subnormMap.entries()]
      .map(([code, count]) => ({
        code,
        count,
        description: NORM_REFERENCE.find((item) => item.code === code)?.description || '',
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => a.code.localeCompare(b.code, 'ru')),
    conclusion: buildConclusion({
      total: trees.length,
      wholeCount: whole.length,
      sectionalCount: sectional.length,
      unresolvedCount: unresolved.length,
    }),
  };
}

export function buildConclusion({ total, wholeCount, sectionalCount, unresolvedCount }) {
  if (!total) {
    return 'Реестр деревьев не заполнен. Автоматическое заключение будет сформировано после внесения исходных данных.';
  }

  const parts = [`Комиссией обследовано ${total} ${plural(total, ['дерево', 'дерева', 'деревьев'])}.`];

  if (wholeCount > 0) {
    parts.push(
      `Для ${wholeCount} ${wholeCount === 1 ? 'дерева' : 'деревьев'} подтверждена возможность валки целиком в заданном направлении; для определения сметной стоимости рекомендуется таблица ГЭСН 01-02-099.`,
    );
  }

  if (sectionalCount > 0) {
    parts.push(
      `Для ${sectionalCount} ${sectionalCount === 1 ? 'дерева' : 'деревьев'} валка целиком технически невозможна; проектом должна быть предусмотрена последовательная разборка дерева по частям с закреплением и управляемым спуском, рекомендуется таблица ГЭСН 47-01-128.`,
    );
  }

  if (unresolvedCount > 0) {
    parts.push(
      `По ${unresolvedCount} ${unresolvedCount === 1 ? 'дереву' : 'деревьям'} требуется уточнение исходных данных, устранение противоречий или отдельное техническое обоснование проектировщика.`,
    );
  }

  if (wholeCount + sectionalCount > 0) {
    parts.push(
      'Конкретные поднормы определяются по группе породы, диаметру D1,3 и принятому способу обращения с порубочными остатками.',
    );
  }

  return parts.join(' ');
}

export function plural(number, forms) {
  const absolute = Math.abs(number) % 100;
  const last = absolute % 10;
  if (absolute > 10 && absolute < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(number);
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ru-RU').format(date);
}

export function getTreeDisplayNumber(tree, index = 0) {
  return tree.treeNumber || String(index + 1);
}

export function listTreeNumbers(trees, limit = 25) {
  const values = trees.map((tree, index) => getTreeDisplayNumber(tree, index));
  if (values.length <= limit) return values.join(', ');
  return `${values.slice(0, limit).join(', ')} и ещё ${values.length - limit}`;
}

export function normalizeImportedProject(project) {
  const blank = createBlankProject(project?.meta?.objectName || 'Импортированный объект');
  const normalized = {
    ...blank,
    ...project,
    meta: { ...blank.meta, ...(project?.meta || {}) },
    notes: { ...blank.notes, ...(project?.notes || {}) },
    commission: Array.isArray(project?.commission)
      ? project.commission.map((member) => ({ ...blankCommissionMember(member?.role || ''), ...member }))
      : blank.commission,
    trees: Array.isArray(project?.trees)
      ? project.trees.map((tree, index) => ({ ...createBlankTree(index + 1), ...tree, photos: tree?.photos || [] }))
      : [],
  };
  normalized.id = project?.id || createId('project');
  normalized.updatedAt = new Date().toISOString();
  return normalized;
}

export function createDemoProject() {
  const project = createBlankProject('Газопровод к жилому массиву «Демонстрационный»');
  project.meta = {
    ...project.meta,
    address: 'Республика Татарстан, демонстрационный участок ПК 0+00 — ПК 2+50',
    routeSection: 'ПК 0+00 — ПК 2+50',
    projectCode: 'ДЕМО-ГСН-01/47',
    stage: 'РД',
    customer: 'Заказчик (демонстрационные данные)',
    technicalCustomer: 'Технический заказчик (демонстрационные данные)',
    designer: 'Проектная организация (демонстрационные данные)',
    generalContractor: 'Генподрядная организация (демонстрационные данные)',
    inspectionBasis: 'Задание на обследование и ситуационный план трассы',
    actNumber: 'ДЕМО-01',
    actPlace: 'г. Казань',
    technicalDecisionNumber: 'ТР-ДЕМО-01',
    posSection: 'Раздел 6. Проект организации строительства',
    pprNumber: 'ППР-ДЕМО-01',
    projectSheetReference: 'Лист ГП-3, схема валки деревьев',
    preparedBy: 'Главный специалист проектной организации',
    approvedBy: 'Главный инженер проекта',
  };

  const base = [
    {
      treeNumber: '1',
      location: 'ПК 0+35, 4 м справа от оси',
      coordinates: '55.790000, 49.120000',
      species: 'Берёза',
      group: 'Мягколиственная',
      diameter: 30,
      height: 12,
      condition: 'Жизнеспособное',
      obstacle: 'Нет препятствий',
      obstacleDistance: '',
      freeZoneLength: 18,
      obstacleInSector: 'Нет',
      freeZoneProvided: 'Да',
      wholeFellingPossible: 'Да',
      liftPossible: 'Не определено',
      evidenceReference: 'Фото 1–2, схема лист ГП-3',
      residues: 'Без сжигания — вывоз',
      designerDecision: 'Предусмотреть направленную валку дерева целиком в свободный сектор.',
    },
    {
      treeNumber: '2',
      location: 'ПК 0+82, у кромки проезжей части',
      coordinates: '55.790300, 49.120900',
      species: 'Дуб',
      group: 'Твердолиственная',
      diameter: 45,
      height: 16,
      condition: 'Жизнеспособное',
      obstacle: 'Проезжая часть / парковка',
      obstacleDistance: 3.2,
      freeZoneLength: 4,
      obstacleInSector: 'Да',
      freeZoneProvided: 'Нет',
      wholeFellingPossible: 'Нет',
      liftPossible: 'Да',
      evidenceReference: 'Фото 3–5, схема лист ГП-3',
      residues: 'Без сжигания — измельчение / переработка',
      designerDecision: 'Предусмотреть поэтапное спиливание с управляемым спуском частей.',
    },
    {
      treeNumber: '3',
      location: 'ПК 1+15, между зданием и ограждением',
      coordinates: '55.790800, 49.121500',
      species: 'Сосна',
      group: 'Хвойная (кроме лиственницы)',
      diameter: 55,
      height: 20,
      condition: 'Сухостойное',
      obstacle: 'Здание',
      obstacleDistance: 5.5,
      freeZoneLength: 3,
      obstacleInSector: 'Да',
      freeZoneProvided: 'Нет',
      wholeFellingPossible: 'Нет',
      liftPossible: 'Да',
      evidenceReference: 'Фото 6–8, схема лист ГП-3',
      residues: 'Без сжигания — вывоз',
      designerDecision: 'Валка целиком исключена. Выполнить разборку дерева по частям с подъёмника.',
    },
    {
      treeNumber: '4',
      location: 'ПК 1+74, свободный участок полосы отвода',
      coordinates: '55.791200, 49.122300',
      species: 'Лиственница',
      group: 'Лиственница',
      diameter: 20,
      height: 11,
      condition: 'Жизнеспособное',
      obstacle: 'Ограждение',
      obstacleDistance: 24,
      freeZoneLength: 16,
      obstacleInSector: 'Нет',
      freeZoneProvided: 'Да',
      wholeFellingPossible: 'Да',
      liftPossible: 'Не определено',
      evidenceReference: 'Фото 9–10, схема лист ГП-3',
      residues: 'Сжигание предусмотрено проектом',
      designerDecision: 'Предусмотреть валку целиком в направлении от ограждения.',
    },
    {
      treeNumber: '5',
      location: 'ПК 2+10, у действующей инженерной сети',
      coordinates: '55.791700, 49.123100',
      species: 'Тополь',
      group: 'Мягколиственная',
      diameter: 38,
      height: 17,
      condition: 'Аварийное / наклонное',
      obstacle: 'Действующий газопровод / инженерная сеть',
      obstacleDistance: 4,
      freeZoneLength: 5,
      obstacleInSector: 'Да',
      freeZoneProvided: 'Нет',
      wholeFellingPossible: 'Да',
      liftPossible: 'Не определено',
      evidenceReference: 'Фото 11–12; требуется уточнённая схема',
      residues: 'Без сжигания — вывоз',
      designerDecision: 'Требуется скорректировать исходные данные и принять отдельное решение.',
    },
  ];

  project.trees = base.map((tree, index) => ({ ...createBlankTree(index + 1), ...tree }));
  project.updatedAt = new Date().toISOString();
  return project;
}
