"""Run with: python3 -B -m unittest discover -s tools -p 'test_*.py'."""
import base64
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('private_projects', Path(__file__).with_name('private-projects.py'))
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class PrivateProjectsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.site = root/'site'
        self.site.mkdir()
        (self.site/'index.html').write_text('var CASES={};\nvar VAULT_DATA=null;\n')
        self.patch = patch.object(builder, 'ROOT', self.site)
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.source = root/'private'/'projects.json'
        self.source.parent.mkdir()
        (self.source.parent/'cover.png').write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='))
        self.data = {
            'cards': [{'slug': 'fixture', 'title': 'Private fixture', 'desc': 'Test only', 'tags': ['Web'], 'thumb': 'private/fixture.png'}],
            'cases': {'fixture': {'type': 'showcase', 'title': 'Private fixture', 'hero': 'private/fixture.png', 'gallery': ['private/fixture.png'], 'details': [], 'description': []}},
            'img': {'private/fixture.png': 'cover.png'}
        }

    def write_source(self):
        self.source.write_text(json.dumps(self.data))

    def test_embeds_private_images(self):
        self.write_source()
        result = builder.build_data(self.source)
        self.assertTrue(result['img']['private/fixture.png'].startswith('data:image/png;base64,'))

    def test_rejects_empty_list(self):
        self.data['cards'] = []
        self.write_source()
        with self.assertRaises(ValueError): builder.build_data(self.source)

    def test_rejects_missing_image(self):
        self.data['img'] = {}
        self.write_source()
        with self.assertRaises(ValueError): builder.build_data(self.source)

    def test_rejects_image_outside_source_folder(self):
        self.data['img']['private/fixture.png'] = '../outside.png'
        self.write_source()
        with self.assertRaises(ValueError): builder.build_data(self.source)

    def test_rejects_public_slug_collision(self):
        (self.site/'index.html').write_text('var CASES={"fixture":{}};\nvar VAULT_DATA=null;\n')
        self.write_source()
        with self.assertRaises(ValueError): builder.build_data(self.source)

    def test_client_side_publication_is_retired(self):
        self.write_source()
        original = (self.site/'index.html').read_text()
        with patch('sys.argv', ['builder', 'build', str(self.source)]):
            with self.assertRaises(SystemExit) as result: builder.main()
        self.assertEqual(result.exception.code, 2)
        self.assertEqual((self.site/'index.html').read_text(), original)


if __name__ == '__main__':
    unittest.main()
