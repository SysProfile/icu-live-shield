"""Arma los paquetes para publicar: dist/icu-live-shield-chromium-<versión>.zip (Chrome, Edge, Opera) y
dist/icu-live-shield-firefox-<versión>.zip (Firefox, con manifest.firefox.json como manifest.json).
Uso: python build.py"""
import json, os, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
FILES = ['bg.js', 'bridge.js', 'inject.js', 'link-page.js', 'popup.html', 'popup.js', 'LICENSE', 'README.md']
version = json.load(open(os.path.join(HERE, 'manifest.json'), encoding='utf-8'))['version']
os.makedirs(os.path.join(HERE, 'dist'), exist_ok=True)
for target, manifest in (('chromium', 'manifest.json'), ('firefox', 'manifest.firefox.json')):
    out = os.path.join(HERE, 'dist', f'icu-live-shield-{target}-{version}.zip')
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        z.write(os.path.join(HERE, manifest), 'manifest.json')
        for f in FILES:
            z.write(os.path.join(HERE, f), f)
        for f in sorted(os.listdir(os.path.join(HERE, 'icons'))):
            z.write(os.path.join(HERE, 'icons', f), 'icons/' + f)
    print(out)
