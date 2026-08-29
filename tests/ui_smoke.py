from __future__ import annotations

from pathlib import Path
import json
import re
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / 'screenshots'
SCREENSHOTS.mkdir(exist_ok=True)


def strip_module(source: str) -> str:
    source = re.sub(
        r'^import\s*\{.*?\}\s*from\s*[\'\"].*?[\'\"];\s*',
        '', source, flags=re.S | re.M,
    )
    source = re.sub(r'^import\s+.*?;\s*', '', source, flags=re.M)
    source = re.sub(r'^export\s+', '', source, flags=re.M)
    return source


def build_inline_app() -> tuple[str, str]:
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    css = (ROOT / 'styles.css').read_text(encoding='utf-8')
    html = re.sub(r'<link rel="manifest"[^>]*>', '', html)
    html = re.sub(r'<link rel="icon"[^>]*>', '', html)
    html = re.sub(r'<link rel="apple-touch-icon"[^>]*>', '', html)
    html = html.replace('<link rel="stylesheet" href="styles.css">', f'<style>{css}</style>')
    html = re.sub(r'<script type="module" src="js/app\.js"></script>', '', html)

    bundle = '\n'.join(
        strip_module((ROOT / 'js' / name).read_text(encoding='utf-8'))
        for name in ('domain.js', 'templates.js')
    )
    # UI tests use deterministic in-memory storage because about:blank has no persistent origin.
    bundle += '''
async function loadAppState() { return null; }
async function saveAppState(value) { window.__testState = value; }
async function clearAppState() { window.__testState = null; }
async function storageEstimate() { return { usage: 0, quota: 0 }; }
'''
    bundle += strip_module((ROOT / 'js' / 'app.js').read_text(encoding='utf-8'))
    bundle = bundle.replace("params.get('demo') === '1'", 'true')
    return html, bundle


def kpi_text(page):
    return [t.strip() for t in page.locator('.kpi-card').all_inner_texts()]


def click_route(page, route: str):
    page.evaluate("route => { location.hash = '#' + route; }", route)
    page.wait_for_timeout(300)


def run_context(browser, html: str, bundle: str, name: str, viewport: dict, mobile: bool = False):
    context = browser.new_context(
        viewport=viewport,
        is_mobile=mobile,
        has_touch=mobile,
        device_scale_factor=1,
        locale='ru-RU',
        service_workers='block',
        accept_downloads=True,
    )
    page = context.new_page()
    console_errors: list[str] = []
    page_errors: list[str] = []
    page.on('console', lambda msg: console_errors.append(f'{msg.type}: {msg.text}') if msg.type == 'error' else None)
    page.on('pageerror', lambda exc: page_errors.append(str(exc)))

    page.set_content(html, wait_until='domcontentloaded')
    page.add_script_tag(content=bundle)
    page.wait_for_selector('.kpi-grid', timeout=20000)
    page.wait_for_timeout(350)

    assert 'Демонстрационный' in page.locator('body').inner_text(), 'Demo project not loaded'
    dashboard_kpis = kpi_text(page)
    assert len(dashboard_kpis) >= 4, 'KPI cards missing'
    page.screenshot(path=str(SCREENSHOTS / f'dashboard-{name}.png'), full_page=True)

    # Registry route and cards.
    click_route(page, 'registry')
    page.wait_for_selector('.tree-card', timeout=10000)
    cards_before = page.locator('.tree-card').count()
    assert cards_before >= 5, f'Expected demo trees, got {cards_before}'
    page.screenshot(path=str(SCREENSHOTS / f'registry-{name}.png'), full_page=True)
    if mobile:
        first_action_icon = page.locator('.tree-card').first.locator('.tree-card-actions .action-icon').first
        assert first_action_icon.is_visible(), 'Tree edit icon is not visible on mobile'
        assert first_action_icon.evaluate("el => getComputedStyle(el).color !== 'rgba(0, 0, 0, 0)'"), 'Tree edit icon is transparent on mobile'

    # Open existing tree and verify live automatic calculation.
    page.locator('.tree-card').first.locator('[data-action="edit-tree"]').click()
    page.wait_for_selector('.modal-panel', timeout=10000)
    calc_text = page.locator('#treeResultPanel').inner_text()
    assert 'ГЭСН' in calc_text, 'Live calculation missing'
    page.locator('.modal-close').click()
    page.wait_for_selector('.modal-panel', state='detached', timeout=10000)

    # Create a new unambiguous whole-felling tree and save.
    page.locator('[data-action="add-tree"]').first.click()
    page.wait_for_selector('.modal-panel', timeout=10000)
    page.locator('[data-tree-field="treeNumber"]').fill('ТЕСТ-01')
    page.locator('[data-tree-field="location"]').fill('ПК 99+99')
    page.locator('[data-tree-field="species"]').fill('Сосна')
    page.locator('[data-tree-field="group"]').select_option(label='Мягколиственная')
    page.locator('[data-tree-field="diameter"]').fill('30')
    page.locator('[data-tree-field="height"]').fill('12')
    page.locator('[data-tree-field="freeZoneLength"]').fill('15')
    page.locator('[data-tree-field="condition"]').select_option(label='Жизнеспособное')
    page.locator('[data-tree-field="obstacle"]').select_option(label='Нет препятствий')
    page.locator('[data-tree-field="obstacleInSector"]').select_option(label='Нет')
    page.locator('[data-tree-field="freeZoneProvided"]').select_option(label='Да')
    page.locator('[data-tree-field="wholeFellingPossible"]').select_option(label='Да')
    page.locator('[data-tree-field="liftPossible"]').select_option(label='Не определено')
    page.locator('[data-tree-field="residues"]').select_option(label='Без сжигания — вывоз')
    page.wait_for_timeout(250)
    live = page.locator('#treeResultPanel').inner_text()
    assert '01-02-099' in live, f'Expected GESN01 live result, got: {live}'
    page.locator('[data-action="save-tree"]').click()
    page.wait_for_selector('.modal-panel', state='detached', timeout=10000)
    page.wait_for_timeout(350)
    cards_after = page.locator('.tree-card').count()
    assert cards_after == cards_before + 1, f'Tree not saved: before={cards_before}, after={cards_after}'

    # Search and filter should isolate the newly added tree.
    page.locator('#registrySearch').fill('ТЕСТ-01')
    page.wait_for_timeout(350)
    assert page.locator('.tree-card').count() == 1, 'Registry search did not filter cards'
    page.locator('#registrySearch').fill('')
    page.wait_for_timeout(350)

    # Document generation: all four tabs and content.
    click_route(page, 'documents')
    page.wait_for_selector('#paperScaleWrapper', timeout=10000)
    expected_docs = {
        'act': 'АКТ',
        'technical': 'ТЕХНИЧЕСКОЕ РЕШЕНИЕ',
        'pos': 'ПРОЕКТ ОРГАНИЗАЦИИ СТРОИТЕЛЬСТВА',
        'ppr': 'ПРОЕКТ ПРОИЗВОДСТВА РАБОТ',
    }
    for tab, expected in expected_docs.items():
        page.locator(f'[data-action="select-document"][data-document="{tab}"]').click()
        page.wait_for_timeout(180)
        body = page.locator('#paperScaleWrapper').inner_text().upper()
        assert expected in body, f'{tab} document title missing'
        assert 'ГЭСН 01-02-099' in body or 'ГЭСН 47-01-128' in body, f'{tab} has no norm output'
    page.screenshot(path=str(SCREENSHOTS / f'documents-{name}.png'), full_page=True)

    # Requirements page.
    click_route(page, 'requirements')
    page.wait_for_selector('.requirements-grid', timeout=10000)
    assert 'проектировщик' in page.locator('.requirements-grid').inner_text().lower()

    # Settings page and export buttons.
    click_route(page, 'settings')
    page.wait_for_selector('[data-action="export-active-json"]', timeout=10000)
    assert page.locator('[data-action="export-active-json"]').is_visible()

    # Project route checks form renders and is editable.
    click_route(page, 'project')
    page.wait_for_selector('[data-bind="meta.objectName"]', timeout=10000)
    title = page.locator('[data-bind="meta.objectName"]')
    old_title = title.input_value()
    assert old_title
    title.fill(old_title + ' — тест')
    page.wait_for_timeout(400)
    assert page.locator('#projectSwitcher').input_value(), 'Active project disappeared after edit'

    result = {
        'name': name,
        'dashboard_kpis': dashboard_kpis,
        'cards_before': cards_before,
        'cards_after': cards_after,
        'console_errors': console_errors,
        'page_errors': page_errors,
    }
    context.close()
    return result


def main():
    html, bundle = build_inline_app()
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path='/usr/bin/chromium',
            headless=True,
            args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        )
        try:
            results.append(run_context(browser, html, bundle, 'desktop', {'width': 1440, 'height': 1000}, mobile=False))
            results.append(run_context(browser, html, bundle, 'mobile', {'width': 390, 'height': 844}, mobile=True))
        finally:
            browser.close()

    print(json.dumps(results, ensure_ascii=False, indent=2))
    bad = [r for r in results if r['console_errors'] or r['page_errors']]
    if bad:
        print('UI smoke found browser errors', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
