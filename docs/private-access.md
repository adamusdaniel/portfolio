# Czasowy dostęp do More projects — instrukcja właściciela

## Co jest gotowe

Stały adres dla wszystkich odbiorców: **https://v2--adamusdaniel.netlify.app/#more-projects**.
Panel właściciela: **https://v2--adamusdaniel.netlify.app/owner/**.

Każdy dostęp ma własne, automatycznie losowane hasło, etykietę osoby/firmy i datę ważności (domyślnie 7 dni od utworzenia). Rekruter nie zakłada konta. Panel pokazuje „Użyte / Nieużyte” i datę pierwszego poprawnego użycia hasła. Nie jest to potwierdzenie tożsamości: ktoś mógł przekazać hasło dalej. Nie ma licznika wizyt ani historii oglądanych projektów.

TAURON pozostaje publiczny. Dwa przyszłe projekty nie są zastąpione fikcyjną zawartością: po zalogowaniu sekcja jest pusta, dopóki nie wgrasz prawdziwych materiałów.

## Jednorazowa aktywacja w Netlify

Nie wpisuj żadnych sekretów do czatu, plików repozytorium ani adresów URL.

1. Na swoim komputerze, w katalogu pobranego repozytorium z branchem `v2`, uruchom `python3 tools/access-secrets.py`. Wpisz dwukrotnie nowe, osobne hasło właściciela (minimum 16 znaków). Wpisywanie jest niewidoczne. Zapisz hasło w menedżerze haseł. Narzędzie wyświetli trzy ustawienia — nie zapisuje ich do pliku. Wartości hasha i klucza sesji również traktuj jako poufne.
2. W Netlify wybierz projekt portfolio → **Project configuration → Environment variables → Add a variable**. Dodaj dokładnie:
   - `ACCESS_OWNER_PASSWORD_HASH`: wartość po `=` z narzędzia (zaczyna się od `scrypt:`).
   - `ACCESS_SESSION_SECRET`: wartość po `=` z narzędzia (losowy klucz, co najmniej 43 znaki).
   - `ACCESS_STORE`: `portfolio-private-v2`.
   Ustaw wartości dla **konkretnego brancha `v2`** (opcja kontekstów / Specific branches). Jeżeli możesz wybrać zakres, wybierz **Functions**; na planie bez wyboru zakresów pozostaw wszystkie. Dla sekretów zaznacz **Contains secret values**, jeśli ta opcja jest dostępna. Nie dodawaj prefiksu typu `PUBLIC_`. Nie potrzebujesz ręcznego tokenu dostępu do Blobs.
3. W **Project configuration → Build & deploy → Continuous deployment** sprawdź: branch deploys obejmują `v2`, base directory jest katalogiem repozytorium, polecenie budowania to `npm run build`, publish directory to `dist`, functions directory to `netlify/functions`. Te wartości są też w prawidłowym pliku `netlify.toml`. Dawny plik `.netlify.toml` z kropką nie jest nową konfiguracją.
4. W **Deploys** ponów budowanie brancha `v2` po dodaniu zmiennych. Nie zmieniaj production branch ani `main`. W logu ma być `Built public site in dist/`. Nie publikuj ręcznie całego katalogu repozytorium metodą drag-and-drop: taki deploy nie przygotuje funkcji i bezpiecznego katalogu publicznego.
5. Otwórz `/owner/`, zaloguj się osobnym hasłem i utwórz testowy dostęp. W prywatnym oknie przeglądarki sprawdź jego hasło pod stałym adresem More projects. Zresetuj hasło, sprawdź stare i nowe, następnie wyłącz testowy dostęp. Sprawdź również zwykłe publiczne projekty i TAURON.

Brak konfiguracji lub niedostępny magazyn kończy się odmową dostępu (503), nie publicznym udostępnieniem treści. Implementacja działa wyłącznie dla buildów `v2` o kontekście `branch-deploy`; Deploy Previews i pozostałe branche mają wyłączone API. Nie zmieniaj nazwy `ACCESS_STORE` po rozpoczęciu używania — inna nazwa oznacza nowy pusty magazyn. Nigdy nie używaj tego samego magazynu do eksperymentów w innych projektach.

## Codzienna obsługa

1. Otwórz panel i zaloguj się hasłem właściciela.
2. Wpisz nazwę osoby lub firmy. To Twoja etykieta, nie zweryfikowane dane odbiorcy.
3. Pozostaw 7 dni lub wpisz inną wartość (od 1 godziny, czyli 0,0416667 dnia, do 365 dni). Kliknij **Utwórz dostęp**.
4. Kliknij **Kopiuj hasło**. Nowe hasło jest dostępne tylko w tym momencie — zapisz je, zanim zamkniesz lub odświeżysz panel. Nie da się go później odczytać; można je zresetować.
5. Wyślij odbiorcy stały adres sekcji More projects i jego hasło. Nie dopisuj hasła do linku.
6. **Resetuj hasło** unieważnia poprzednie hasło i sesje tylko tego wpisu. Pozostawia termin i datę pierwszego użycia. **Wyłącz dostęp** odcina go przed terminem. Wygasły/wyłączony wpis zastąp nowym dostępem. Panel poprosi o potwierdzenie tych działań.
7. Kliknij **Odśwież**, aby zobaczyć aktualny stan użycia. Czasy są wyświetlane w lokalnej strefie przeglądarki. **Wyloguj** kończy sesję panelu (maksymalnie trwa ona godzinę).

Pierwsze użycie oznacza pierwsze poprawne logowanie do sekcji, również jeśli projekty są jeszcze w przygotowaniu. Nie zmienia się po ponownym logowaniu ani resecie hasła. Dostęp rekrutera ma sesję do 24 godzin, maksymalnie do końca ważności hasła; potem może ponownie wpisać nadal aktywne hasło. Serwer sprawdza cofnięcie, termin i wersję dostępu przy każdym żądaniu treści i obrazu. Otwarta strona sprawdza sesję co 30 sekund oraz po powrocie do okna. Już pobranych przez odbiorcę kopii i zrzutów ekranu nie można wycofać.

## Dodawanie dwóch prawdziwych projektów

Prywatne źródła i grafiki trzymaj **poza repozytorium i katalogiem serwera**. Zrób ich prywatną kopię zapasową. Nie dodawaj ich do publicznych `content/`, `images/`, GitHub ani Netlify deploy assets.

Format wejściowy jest zgodny z dotychczasowym `tools/private-projects.py`: obiekt `cards`, `cases` i `img`. Schemat struktury (nazwy i teksty poniżej są wyłącznie instrukcją, nie zawartością portfolio):

```json
{
  "cards": [{"slug":"twoj-projekt", "title":"Rzeczywisty tytuł", "desc":"Rzeczywisty opis", "tags":["Product design","Web"], "thumb":"private/twoj-projekt/cover.webp"}],
  "cases": {
    "twoj-projekt": {
      "type":"showcase", "title":"Rzeczywisty tytuł", "subtitle":"Rzeczywisty podtytuł", "tags":["Product design","Web"],
      "hero":"private/twoj-projekt/cover.webp", "gallery":["private/twoj-projekt/cover.webp"],
      "details":[["Role","Product Designer"]],
      "description":[{"t":"p","v":"Twój prawdziwy opis projektu."}]
    }
  },
  "img":{"private/twoj-projekt/cover.webp":"images/cover.webp"}
}
```

W prywatnym folderze umieść `projects.json` i podfolder `images/` z obrazami. Każdy obraz musi być PNG, JPEG lub WebP do 3 MB. Każda karta ma własny slug, inny niż publiczne projekty; każda grafika ma klucz zaczynający się od `private/`. `img` mapuje te klucze na pliki względem `projects.json`. W treści używaj własnego, zaufanego tekstu i prostego formatowania HTML; obrazy umieszczaj przez strukturę danych, bez `<img>`, skryptów i zewnętrznych mediów w HTML.

Na swoim komputerze uruchom (ścieżki zastąp własnymi):

```bash
python3 tools/prepare-private.py /sciezka/prywatne/projects.json /sciezka/prywatne/pakiet.json
```

Narzędzie odmawia zapisu wewnątrz repozytorium. Nie publikuje, nie szyfruje hasłem odbiorcy i nie zmienia strony. W panelu rozwiń **Wgraj prawdziwe prywatne projekty**, wybierz `pakiet.json` i kliknij **Wgraj projekty**. Obrazy trafiają do niepublicznego Netlify Blobs, a treść jest podmieniana dopiero po pomyślnym wgraniu wszystkich grafik. Pakiet zawiera całą sekcję, więc przy aktualizacji uwzględnij oba projekty. Maksimum pakietu w panelu: 60 MB; tekstu i struktury po odłączeniu obrazów: 2 MB. Wgrywanie nie zmienia istniejących dostępów. Wyloguj i odblokuj sekcję ponownie, aby sprawdzić nową wersję.

Stary tryb `private-projects.py build` jest celowo zablokowany: przeglądarkowe szyfrowanie jednym hasłem nie zapewnia czasowego dostępu ani cofania sesji. Historyczna zaszyfrowana kopia pozostaje w Git, ale nie jest kopiowana do publikowanego `dist/`.

## Darmowy plan i koszty

Stan oficjalnej dokumentacji sprawdzony 12 listopada 2026: obecny Free obejmuje Functions i Blobs oraz **300 kredytów miesięcznie**, wspólnych dla rozliczanego użycia. Konta sprzed 4 września 2025 mogą pozostać na planie **Legacy**. Rzeczywisty typ planu i pozostały limit sprawdź w **Usage & billing** swojego zespołu — kod nie potrafi tego ustalić. Wyczerpanie limitu Free może wstrzymać stronę do odnowienia puli. Nie ma tutaj zakupu dodatkowej usługi ani automatycznej zmiany planu. Logowanie korzysta z jednej reguły ograniczania prób: 10 żądań na minutę na domenę i IP (Free dopuszcza 2 reguły kodowe).

Źródła: [cennik](https://www.netlify.com/pricing/), [plany kredytowe](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/), [Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/), [limity prób](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/).

## Dla osoby utrzymującej kod

- `server/access.mjs`: API i autoryzacja. Losowe 256-bitowe sekrety odbiorców są przechowywane wyłącznie jako SHA-256; nie są to hasła wymyślane przez człowieka. Hasło właściciela: scrypt z losową solą. Sesje: podpis HMAC, oddzielne ciasteczka `__Host-`, Secure, HttpOnly, SameSite=Strict. Zmiana hasha właściciela unieważnia jego sesje; zmiana klucza sesji unieważnia wszystkie sesje, ale nie hasła odbiorców.
- `server/runtime.mjs`: magazyn site-scoped Blobs z `consistency: strong`. Build generuje ignorowane `server/deployment.mjs` z identyfikatorem brancha i kontekstem, bo zmienne `BRANCH`/`CONTEXT` nie muszą być dostępne w runtime Functions. Build i bundle funkcji muszą powstawać razem.
- Każdy odbiorca ma osobny obiekt `grants-<id>`. Reset/wyłączenie zastępują jeden obiekt pod warunkiem zgodności ETag i wersji; równoczesna zmiana zwraca 409. Pierwsze użycie jest osobnym `used-<id>` zapisanym z `onlyIfNew`. Brak liczników i wieloobiektowych transakcji. Treść i obrazy są dostępne wyłącznie przez autoryzowane Functions, bez publicznych/signed URL ani Image CDN.
- Wszystkie odpowiedzi API mają `no-store`; brak CORS, POST wymaga zgodnego Origin i JSON. Używaj HTTPS. Nie loguj treści żądań, haseł, ciasteczek ani danych magazynu.
- Netlify Blobs i Functions używają uprawnień konta Netlify. Administratorzy konta mogą odczytywać magazyn. Kopie prywatnych źródeł trzeba utrzymywać osobno; nie usuwać store w panelu Netlify.
- Statyczny szkielet `/owner/` jest publiczny, ale jego dane i wszystkie operacje wymagają sesji właściciela. Sam adres panelu nie jest zabezpieczeniem.
- Publikacja kopiuje tylko publiczne pliki do `dist/`; `.htpasswd`, backend, `.env`, narzędzia i backupy nie trafiają do CDN. Publiczne case studies nie zostały przeniesione do prywatnej sekcji ani przepisane.

Testy lokalne:

```bash
npm ci
npm run build
npm test
python3 -B -m unittest discover -s tools -p 'test_*.py'
node tools/test-access-browser.mjs
# osobno uruchom serwer publicznego dist/ na porcie 8000:
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
# w drugim terminalu:
node tools/test-portfolio-browser.cjs
```

Testy przeglądarkowe wymagają Chromium (`/usr/bin/chromium`) i Playwright; test HTTPS również OpenSSL. Testy API uruchamiają lokalny emulator oficjalnego SDK Blobs oraz magazyn testowy w pamięci. Emulator SDK 10.7.13 pomija ETag w GET: wyłącznie transport testowy uzupełnia go wartością z LIST; warunki zapisu nadal sprawdza emulator. Kod produkcyjny odmawia aktualizacji bez ETag. Nie używają prawdziwego konta Netlify ani materiałów portfolio jako prywatnych fixtures. Limit prób jest wykonywany przez platformę Netlify i wymaga osobnej kontroli po deployu. Przejście lokalnych testów nie potwierdza działającego wdrożenia ani konfiguracji sekretów w Netlify.
