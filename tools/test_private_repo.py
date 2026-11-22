import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('publisher', Path(__file__).parent/'private-repo'/'publish.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)

class PrivateRepositoryTests(unittest.TestCase):
    def test_sources_preserve_bytes_and_reject_missing_conflicting_or_outside_images(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root/'projects'/'fixture'
            source.mkdir(parents=True)
            raw = b'original-test-image-bytes'
            (source/'cover.png').write_bytes(raw)
            data = {'card': {'slug':'fixture'}, 'case': {'title':'Fixture'}, 'img': {'private/fixture/cover':'cover.png'}}
            manifest = source/'project.json'
            manifest.write_text(json.dumps(data))
            result, images, inline = publisher.sources(root)
            self.assertEqual(images['private/fixture/cover'], raw)
            self.assertEqual(result['cases']['fixture']['title'], 'Fixture')
            data['img']['private/fixture/cover'] = '../../../../outside.png'
            manifest.write_text(json.dumps(data))
            with self.assertRaises(ValueError): publisher.sources(root)
            data['img']['private/fixture/cover'] = 'cover.png'
            data['card']['slug'] = 'wrong-folder'
            manifest.write_text(json.dumps(data))
            with self.assertRaises(ValueError): publisher.sources(root)
    def test_empty_repository_does_not_publish(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(ValueError): publisher.sources(folder)
