import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONTROL,
  GESN,
  TECHNOLOGIES,
  buildConclusion,
  calculateTree,
  createBlankProject,
  createBlankTree,
  getProjectSummary,
} from '../js/domain.js';
import { renderAct, renderPos, renderPpr, renderTechnicalDecision } from '../js/templates.js';

function completeTree(overrides = {}) {
  return {
    ...createBlankTree(1),
    treeNumber: '1',
    location: 'ПК 1+00',
    coordinates: '55.000000, 49.000000',
    species: 'Берёза',
    group: 'Мягколиственная',
    diameter: 30,
    height: 10,
    condition: 'Жизнеспособное',
    obstacle: 'Нет препятствий',
    obstacleDistance: '',
    freeZoneLength: 15,
    obstacleInSector: 'Нет',
    freeZoneProvided: 'Да',
    wholeFellingPossible: 'Да',
    liftPossible: 'Не определено',
    evidenceReference: 'Фото 1, схема 1',
    residues: 'Без сжигания — вывоз',
    designerDecision: 'Валка целиком.',
    ...overrides,
  };
}

test('валидная валка целиком выбирает ГЭСН 01 и поднорму по диаметру', () => {
  const result = calculateTree(completeTree());
  assert.equal(result.technology, TECHNOLOGIES.whole);
  assert.equal(result.gesnTable, GESN.whole);
  assert.equal(result.subnorm, 'ГЭСН 01-02-099-17');
  assert.equal(result.control, CONTROL.sufficient);
  assert.equal(result.isSufficient, true);
});

test('поэтапное спиливание твердолиственного дерева до 0,5 м выбирает ГЭСН 47-01-128-01', () => {
  const result = calculateTree(completeTree({
    species: 'Дуб',
    group: 'Твердолиственная',
    diameter: 45,
    height: 16,
    obstacle: 'Проезжая часть / парковка',
    obstacleDistance: 3.2,
    freeZoneLength: 4,
    obstacleInSector: 'Да',
    freeZoneProvided: 'Нет',
    wholeFellingPossible: 'Нет',
    liftPossible: 'Да',
  }));
  assert.equal(result.technology, TECHNOLOGIES.sectional);
  assert.equal(result.gesnTable, GESN.sectional);
  assert.equal(result.subnorm, 'ГЭСН 47-01-128-01');
  assert.equal(result.control, CONTROL.sufficient);
});

test('лиственница свыше 0,5 м для ГЭСН 47 относится к мягколиственным и хвойным', () => {
  const result = calculateTree(completeTree({
    species: 'Лиственница',
    group: 'Лиственница',
    diameter: 55,
    obstacle: 'Здание',
    obstacleDistance: 5,
    freeZoneLength: 3,
    obstacleInSector: 'Да',
    freeZoneProvided: 'Нет',
    wholeFellingPossible: 'Нет',
    liftPossible: 'Да',
  }));
  assert.equal(result.subnorm, 'ГЭСН 47-01-128-04');
});

test('валка целиком при препятствии в секторе считается противоречием', () => {
  const result = calculateTree(completeTree({
    obstacle: 'Здание',
    obstacleDistance: 4,
    obstacleInSector: 'Да',
    freeZoneProvided: 'Да',
    wholeFellingPossible: 'Да',
  }));
  assert.equal(result.technology, TECHNOLOGIES.contradiction);
  assert.equal(result.gesnTable, GESN.undefined);
  assert.equal(result.status, 'contradiction');
  assert.match(result.control, /Противоречие/iu);
});

test('невозможность валки без препятствия в секторе требует отдельного обоснования', () => {
  const result = calculateTree(completeTree({
    wholeFellingPossible: 'Нет',
    obstacleInSector: 'Нет',
    freeZoneProvided: 'Да',
  }));
  assert.equal(result.technology, TECHNOLOGIES.specialJustification);
  assert.equal(result.gesnTable, GESN.undefined);
  assert.match(result.control, /отдельное техническое обоснование/iu);
});

test('неполная строка сохраняется, но получает перечень обязательных полей', () => {
  const result = calculateTree(createBlankTree(1));
  assert.equal(result.status, 'missing');
  assert.match(result.control, /Заполнить обязательные поля/iu);
  assert.ok(result.missing.length >= 10);
});

test('для ГЭСН 47 отсутствие подтверждения подъёмника формирует замечание', () => {
  const result = calculateTree(completeTree({
    obstacle: 'Сооружение',
    obstacleDistance: 2,
    freeZoneLength: 2,
    obstacleInSector: 'Да',
    freeZoneProvided: 'Нет',
    wholeFellingPossible: 'Нет',
    liftPossible: 'Нет',
  }));
  assert.equal(result.gesnTable, GESN.sectional);
  assert.equal(result.status, 'lift');
  assert.match(result.control, /телескопический подъёмник/iu);
});

test('для ГЭСН 01 зона короче высоты дерева формирует контрольное замечание', () => {
  const result = calculateTree(completeTree({ height: 15, freeZoneLength: 10 }));
  assert.equal(result.gesnTable, GESN.whole);
  assert.match(result.control, /меньше высоты дерева/iu);
});

test('аварийное дерево при валке целиком требует отдельного решения по безопасности', () => {
  const result = calculateTree(completeTree({ condition: 'Аварийное / наклонное' }));
  assert.match(result.control, /решения по безопасности/iu);
});

test('диаметр более 64 см без сжигания не подбирает отсутствующий диапазон', () => {
  const result = calculateTree(completeTree({ diameter: 70 }));
  assert.equal(result.subnorm, 'Проверить норму: диаметр более 64 см');
  assert.match(result.control, /диаметр более 64/iu);
});

test('при сжигании мягкая порода свыше 32 см выбирает последнюю поднорму диапазона', () => {
  const result = calculateTree(completeTree({ diameter: 70, residues: 'Сжигание предусмотрено проектом' }));
  assert.equal(result.subnorm, 'ГЭСН 01-02-099-06');
});

test('заключение не выводит категории с нулевым количеством', () => {
  const conclusion = buildConclusion({ total: 3, wholeCount: 3, sectionalCount: 0, unresolvedCount: 0 });
  assert.match(conclusion, /ГЭСН 01-02-099/iu);
  assert.doesNotMatch(conclusion, /ГЭСН 47-01-128/iu);
  assert.doesNotMatch(conclusion, /требуется уточнение/iu);
});

test('для пустого реестра выводится короткое сообщение без нулевых категорий', () => {
  const conclusion = buildConclusion({ total: 0, wholeCount: 0, sectionalCount: 0, unresolvedCount: 0 });
  assert.equal(conclusion, 'Реестр деревьев не заполнен. Автоматическое заключение будет сформировано после внесения исходных данных.');
  assert.doesNotMatch(conclusion, /0 дерев/iu);
});

test('итоги корректно считают три категории', () => {
  const project = createBlankProject('Тест');
  project.trees = [
    completeTree({ id: 'a', treeNumber: '1' }),
    completeTree({
      id: 'b', treeNumber: '2', group: 'Твердолиственная', species: 'Дуб', diameter: 45,
      obstacle: 'Здание', obstacleDistance: 4, freeZoneLength: 3, obstacleInSector: 'Да',
      freeZoneProvided: 'Нет', wholeFellingPossible: 'Нет', liftPossible: 'Да',
    }),
    completeTree({ id: 'c', treeNumber: '3', obstacleInSector: 'Да', wholeFellingPossible: 'Да' }),
  ];
  const summary = getProjectSummary(project);
  assert.equal(summary.total, 3);
  assert.equal(summary.wholeCount, 1);
  assert.equal(summary.sectionalCount, 1);
  assert.equal(summary.unresolvedCount, 1);
});

test('все четыре документа формируются из одного реестра', () => {
  const project = createBlankProject('Тестовый газопровод');
  project.trees = [completeTree()];
  const act = renderAct(project);
  const tech = renderTechnicalDecision(project);
  const pos = renderPos(project);
  const ppr = renderPpr(project);
  assert.match(act, /АКТ КОМИССИОННОГО ОБСЛЕДОВАНИЯ/iu);
  assert.match(tech, /ТЕХНИЧЕСКОЕ РЕШЕНИЕ/iu);
  assert.match(pos, /ПРОЕКТА ОРГАНИЗАЦИИ СТРОИТЕЛЬСТВА/iu);
  assert.match(ppr, /ПРОЕКТ ПРОИЗВОДСТВА РАБОТ/iu);
  for (const html of [act, tech, pos, ppr]) {
    assert.match(html, /ГЭСН 01-02-099/iu);
    assert.doesNotMatch(html, /Для 0 деревьев/iu);
  }
});
