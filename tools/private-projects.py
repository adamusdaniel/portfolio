#!/usr/bin/env python3
"""Validate private sources; browser-encryption publication is retired."""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]



def build_data(source):
    import base64
    data = json.loads(source.read_text())
    if not isinstance(data, dict) or any(not isinstance(data.get(k), t) for k, t in [('cases', dict), ('cards', list), ('img', dict)]):
        raise ValueError('Source must contain cases (object), cards (list), and img (object).')
    if not data['cards']:
        raise ValueError('Add at least one project before replacing the current encrypted section.')
    if len({c.get('slug') for c in data['cards']}) != len(data['cards']):
        raise ValueError('Project slugs must be unique.')
    for card in data['cards']:
        slug = card.get('slug', '')
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug) or slug not in data['cases']:
            raise ValueError('Each card needs a valid slug and a matching case.')
        if not all(isinstance(card.get(k), str) and card[k] for k in ['title', 'desc', 'thumb']):
            raise ValueError('Every card needs title, desc and thumb.')
        if not isinstance(card.get('tags'), list) or not all(isinstance(t, str) for t in card['tags']):
            raise ValueError('Card tags must be a list of strings.')
    project_file = ROOT/'content'/'projects.js'
    if project_file.exists():
        public = json.loads(project_file.read_text().split('=', 1)[1].rstrip(';\n'))['cases']
        tauron = ROOT/'content'/'tauron'/'case.js'
        if tauron.exists():
            project = json.loads(tauron.read_text().split('=', 1)[1].rstrip(';\n'))['case']
            public[project['slug']] = project
    else:
        public = json.JSONDecoder().raw_decode(re.search(r'var CASES\s*=\s*(.*)', (ROOT/'index.html').read_text()).group(1))[0]
    if set(public) & set(data['cases']):
        raise ValueError('Private project slugs must differ from public project slugs.')
    refs = set()
    def walk(value):
        if isinstance(value, dict):
            for v in value.values(): walk(v)
        elif isinstance(value, list):
            for v in value: walk(v)
        elif isinstance(value, str) and value.startswith('private/'):
            refs.add(value)
    walk(data['cards']); walk(data['cases'])
    for slug, case in data['cases'].items():
        if not isinstance(case, dict) or not isinstance(case.get('title'), str) or not isinstance(case.get('details'), list):
            raise ValueError('Every case needs title and details.')
        if case.get('type') == 'showcase':
            if not case.get('hero') or not isinstance(case.get('gallery'), list) or not case['gallery'] or not isinstance(case.get('description'), list):
                raise ValueError('Showcase cases need hero, gallery and description.')
        elif case.get('type') == 'long':
            if not isinstance(case.get('blocks'), list): raise ValueError('Long cases need blocks.')
        else:
            raise ValueError('Case type must be showcase or long.')
    missing = refs - data['img'].keys()
    if missing: raise ValueError('Some private images are missing from img.')
    for key, filename in list(data['img'].items()):
        if not key.startswith('private/'):
            raise ValueError('Private image keys must start with private/.')
        image = (source.parent / filename).resolve()
        if not image.is_relative_to(source.parent.resolve()):
            raise ValueError('Image files must stay inside the private source directory.')
        mime = {'.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg'}.get(image.suffix.lower())
        if not mime: raise ValueError('Use WebP, PNG or JPEG images.')
        data['img'][key] = 'data:' + mime + ';base64,' + base64.b64encode(image.read_bytes()).decode()
    return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['init', 'build'])
    parser.add_argument('source', type=Path, help='JSON file OUTSIDE the repository')
    args = parser.parse_args()
    source = args.source.resolve()
    if source.is_relative_to(ROOT):
        parser.error('Keep plaintext sources outside the repository and its web server.')
    if args.command == 'init':
        source.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        with source.open('x', encoding='utf8') as f:
            json.dump({'cases': {}, 'cards': [], 'img': {}}, f, indent=2)
        source.chmod(0o600)
        print('Created an empty private source. Add projects using tools/PRIVATE-PROJECTS.md.')
        return
    parser.error('Client-side password publication is retired. Use tools/prepare-private.py and the owner panel; see docs/private-access.md.')


if __name__ == '__main__':
    try: main()
    except (ValueError, OSError) as error:
        raise SystemExit(str(error))
