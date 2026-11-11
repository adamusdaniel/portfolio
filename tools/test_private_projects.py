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

    def test_build_uses_extracted_project_data_and_app(self):
        (self.site/'index.html').write_text('<script src="js/portfolio-v2.js"></script>')
        (self.site/'content').mkdir()
        (self.site/'content/projects.js').write_text('window.PORTFOLIO_PROJECTS={"cases":{}};')
        (self.site/'js').mkdir()
        app = self.site/'js/portfolio-v2.js'
        app.write_text('var VAULT_DATA=null;')
        self.write_source()
        with patch('sys.argv', ['builder', 'build', str(self.source)]), patch.object(builder.getpass, 'getpass', return_value='temporary-test-password'):
            builder.main()
        self.assertNotIn('VAULT_DATA', (self.site/'index.html').read_text())
        self.assertNotIn('VAULT_DATA=null', app.read_text())
        self.assertNotIn('Private fixture', app.read_text())

    def test_build_preserves_backup_without_exposing_plaintext(self):
        self.write_source()
        with patch('sys.argv', ['builder', 'build', str(self.source)]), patch.object(builder.getpass, 'getpass', return_value='temporary-test-password'):
            builder.main()
        result = (self.site/'index.html').read_text()
        self.assertNotIn('Private fixture', result)
        self.assertNotIn('temporary-test-password', result)
        encrypted = json.JSONDecoder().raw_decode(result.split('var VAULT_DATA=')[1])[0]
        self.assertEqual(encrypted['iter'], 600000)
        self.assertTrue(encrypted['ct'])
        backups = list((self.site/'tools'/'vault-backups').glob('*.json'))
        self.assertEqual(len(backups), 1)
        self.assertEqual(json.loads(backups[0].read_text()), None)


if __name__ == '__main__':
    unittest.main()
