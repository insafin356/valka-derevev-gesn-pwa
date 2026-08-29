from __future__ import annotations

from pathlib import Path
import json
import re
import struct

ROOT = Path(__file__).resolve().parents[1]


def png_size(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise AssertionError(f'{path.name}: not a PNG')
    width, height = struct.unpack('>II', data[16:24])
    return width, height


manifest = json.loads((ROOT / 'manifest.webmanifest').read_text(encoding='utf-8'))
assert manifest['display'] == 'standalone'
assert manifest['start_url'].startswith('./')
assert manifest['scope'] == './'
assert manifest['name'] and manifest['short_name']
assert manifest['theme_color'].startswith('#')

icons = manifest['icons']
assert len(icons) >= 3
for icon in icons:
    path = ROOT / icon['src']
    assert path.exists(), f'Missing manifest icon: {icon["src"]}'
    expected = tuple(map(int, icon['sizes'].split('x')))
    actual = png_size(path)
    assert actual == expected, f'{icon["src"]}: expected {expected}, got {actual}'

index = (ROOT / 'index.html').read_text(encoding='utf-8')
for ref in ['manifest.webmanifest', 'styles.css', 'js/app.js', 'icons/icon-192.png']:
    assert ref in index, f'index.html does not reference {ref}'

sw = (ROOT / 'sw.js').read_text(encoding='utf-8')
assert "self.addEventListener('install'" in sw
assert "self.addEventListener('activate'" in sw
assert "self.addEventListener('fetch'" in sw
assert 'caches.open' in sw and 'cache.addAll' in sw

match = re.search(r'const APP_SHELL = \[(.*?)\];', sw, flags=re.S)
assert match, 'APP_SHELL not found'
assets = re.findall(r"['\"](\.\/[^'\"]*)['\"]", match.group(1))
assert assets, 'No APP_SHELL assets'
for asset in assets:
    rel = asset[2:]
    path = ROOT / ('index.html' if not rel else rel)
    assert path.exists(), f'Missing service worker asset: {asset}'

for script in ['js/domain.js', 'js/storage.js', 'js/templates.js', 'js/app.js']:
    assert (ROOT / script).exists()

print(json.dumps({
    'manifest': 'ok',
    'icons': {icon['src']: png_size(ROOT / icon['src']) for icon in icons},
    'service_worker_assets': len(assets),
    'index_references': 'ok',
}, ensure_ascii=False, indent=2))
