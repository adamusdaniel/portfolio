#!/usr/bin/env python3
"""Prepare an external private JSON bundle for the owner panel. Never publishes."""
import importlib.util
import json
from pathlib import Path
import argparse
spec = importlib.util.spec_from_file_location('private_projects',Path(__file__).with_name('private-projects.py'))
legacy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(legacy)
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('source',type=Path)
p.add_argument('output',type=Path)
a=p.parse_args()
source,out=a.source.resolve(),a.output.resolve()
if source.is_relative_to(legacy.ROOT) or out.is_relative_to(legacy.ROOT):
    p.error('Keep private sources and the output bundle outside the repository.')
try:
    data=legacy.build_data(source)
    for value in data['img'].values():
        if len(value.split(',',1)[1])*3//4>3000000: p.error('Each image must be at most 3 MB.')
    with out.open('x',encoding='utf8') as f: json.dump(data,f,ensure_ascii=False)
    out.chmod(0o600)
except (ValueError,OSError) as e: p.error(str(e))
print('Private bundle prepared outside the repository. Upload it in /owner/. Do not commit it.')
