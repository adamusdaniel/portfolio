#!/usr/bin/env python3
"""Publish trusted private repository sources. No passwords or image conversion."""
import base64
import json
import os
import pathlib
import re
import sys
import urllib.request
import urllib.parse

SITE = 'https://v2--adamusdaniel.netlify.app'
AUDIENCE = 'portfolio-private-sync'

def sources(root):
    root = pathlib.Path(root).resolve()
    result = {'cards': [], 'cases': {}, 'img': {}, 'media': {}}
    inline_images = {}
    images = {}
    for source in sorted((root / 'projects').glob('*/project.json')):
        data = json.loads(source.read_text(encoding='utf8'))
        card, case = data['card'], data['case']
        inline_images.update(data.get('inlineImages', {}))
        slug = card['slug']
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug) or slug != source.parent.name or slug in result['cases']:
            raise ValueError('Invalid or repeated project directory')
        result['cards'].append(card)
        result['cases'][slug] = case
        result['media'].update(data.get('media', {}))
        for key, filename in data.get('img', {}).items():
            image = (source.parent / filename).resolve()
            if not key.startswith('private/') or not image.is_relative_to(root) or not image.is_file():
                raise ValueError('Image must be a file inside the private repository')
            raw = image.read_bytes()
            if len(raw) > 3000000:
                raise ValueError('Image exceeds 3 MB')
            if key in images and images[key] != raw:
                raise ValueError('Conflicting image keys')
            images[key] = raw
    if not result['cards']:
        raise ValueError('No projects found; nothing was published')
    return result, images, inline_images

def request(url, data=None, token=None):
    headers = {'Authorization': 'Bearer ' + token} if token else {}
    if data is not None:
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=None if data is None else json.dumps(data).encode(), headers=headers)
    # Never send credentials to a redirected destination.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None
    with urllib.request.build_opener(NoRedirect).open(req, timeout=60) as response:
        return json.load(response)

def main():
    data, images, inline_images = sources(pathlib.Path(__file__).resolve().parent)
    if '--check' in sys.argv:
        print('Source files checked. Publication was not requested.')
        return
    if os.environ.get('GITHUB_REPOSITORY') != 'adamusdaniel/portfolio-private' or os.environ.get('GITHUB_REF') != 'refs/heads/v2':
        raise ValueError('Publish only from the configured private repository branch v2')
    identity_url = os.environ['ACTIONS_ID_TOKEN_REQUEST_URL'] + '&audience=' + urllib.parse.quote(AUDIENCE)
    token = request(identity_url, token=os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN'])['value']
    for key, raw in images.items():
        data['img'][key] = request(SITE + '/api/sync/images', {'base64': base64.b64encode(raw).decode()}, token)['url']
    def rewrite(value):
        if isinstance(value, list):
            return [rewrite(item) for item in value]
        if isinstance(value, dict):
            return {key: rewrite(item) for key, item in value.items()}
        if isinstance(value, str):
            for old, key in inline_images.items():
                value = value.replace(old, data['img'][key])
        return value
    data['cases'] = rewrite(data['cases'])
    request(SITE + '/api/sync/content', data, token)
    print('Private projects published. Existing recipient passwords are unchanged.')

if __name__ == '__main__':
    try:
        main()
    except Exception:
        # No tokens, private content or remote response bodies in Actions logs.
        print('Publication failed. Previous published content remains available. Check project format, image limits, repository visibility and branch v2.', file=sys.stderr)
        sys.exit(1)
