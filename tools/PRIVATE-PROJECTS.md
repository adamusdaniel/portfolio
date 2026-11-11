# Prywatne projekty — v2

Przycisk **More projects** otwiera ekran z hasłem. Po odblokowaniu pojawiają się te same karty, filtry i widoki case study jak w publicznej części portfolio. Na razie sekcja zapowiada dwa nowe projekty; odblokowanie jest wyłączone do dodania treści i ustawienia nowego hasła. Stary pakiet został wyłączony, a jego zaszyfrowana kopia jest w `tools/vault-backups/original-v2.json`.

## Źródła poza stroną

Wymagane: Python 3 i Node.js, bez instalowania pakietów. Źródła trzymaj poza repozytorium i katalogiem serwera. Zrób ich prywatną kopię zapasową. Hasło zachowaj w menedżerze haseł, nie w Git ani w czacie.

```bash
cd /workspace/portfolio
python3 tools/private-projects.py init /workspace/portfolio-private/projects.json
```

Wypełnij powstały plik według wzoru poniżej. To przykład struktury, nie gotowy projekt. Dodawaj kolejne elementy do `cards` i odpowiadające im wpisy w `cases`. Kolejność `cards` ustala kolejność na stronie. Nazwy techniczne muszą różnić się od nazw publicznych projektów.

```json
{
  "cards": [{
    "slug": "nazwa-projektu",
    "title": "Tytuł projektu",
    "desc": "Krótki opis karty",
    "tags": ["Product design", "Web"],
    "thumb": "private/nazwa-projektu/cover.webp"
  }],
  "cases": {
    "nazwa-projektu": {
      "type": "showcase",
      "title": "Tytuł projektu",
      "subtitle": "Podtytuł",
      "hero": "private/nazwa-projektu/cover.webp",
      "gallery": ["private/nazwa-projektu/cover.webp"],
      "details": [["Role", "Product Designer"], ["Keywords", "UX, UI, Web"]],
      "description": [
        {"t": "p", "v": "Wprowadzenie do projektu."},
        {"t": "h", "lvl": 3, "v": "Problem"},
        {"t": "p", "v": "Opis problemu i Twojego wkładu."}
      ]
    }
  },
  "img": {"private/nazwa-projektu/cover.webp": "images/cover.webp"}
}
```

Obraz umieść pod `/workspace/portfolio-private/images/cover.webp`. Wszystkie prywatne obrazy muszą być wewnątrz folderu źródeł; zostaną zaszyfrowane razem z tekstem. Nie kopiuj ich do publicznego `content/`. Filtry rozpoznają tagi `Mobile app`, `Web`, `UI`, `Product design`. Teksty mogą zawierać HTML — używaj wyłącznie własnej, zaufanej treści.

## Nowe hasło i publikacja

```bash
python3 tools/private-projects.py build /workspace/portfolio-private/projects.json
```

Narzędzie pyta dwukrotnie o nowe hasło (minimum 12 znaków, bez wyświetlania). Zmienia wyłącznie zaszyfrowany pakiet w `index.html`, zachowując poprzedni pakiet w kopii. Pusta lista projektów nie zastąpi starej sekcji. Nie wykonuje commita, push ani publikacji.

Uruchom stronę przez `python3 -m http.server 8000 --bind 127.0.0.1` i sprawdź:

1. Błędne hasło nie otwiera projektów; nowe hasło otwiera karty.
2. Filtry, case studies, powrót do listy i obrazy działają na telefonie i desktopie.
3. Odświeżenie zachowuje odblokowanie w tej karcie przeglądarki.
4. Lock again usuwa odszyfrowaną zawartość; odświeżenie nie otwiera jej ponownie.
5. Publiczne projekty nadal działają; źródła i hasło nie znalazły się w zmianach Git.

Na hostingu wymagane jest HTTPS. Zmiana hasła wymaga ponownego szyfrowania ze źródeł. Zachowaj źródła i hasło — sam pakiet nie daje możliwości resetowania dostępu. Starsze wdrożenia mogą zawierać poprzedni pakiet; nowe hasło nie wycofuje dostępu do wcześniej pobranych danych. Starsze publiczne kopie materiałów wymagają osobnego sprawdzenia.
