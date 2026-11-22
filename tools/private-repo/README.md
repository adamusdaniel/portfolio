# Prywatne projekty portfolio

To repozytorium MUSI mieć widoczność **Private**. Publikuj wyłącznie branch **v2**. Nie przechowuj tutaj haseł odbiorców, hasła właściciela ani tokenów. Nie dodawaj płatnych minut Actions.

## Codzienna edycja

1. W GitHub Desktop wybierz `portfolio-private` i branch `v2`, kliknij Fetch/Pull.
2. Otwórz `projects/nazwa-projektu/project.json` w edytorze tekstu. Plik ma osobno `card` (karta na liście), `case` (treść projektu), `img` (odwołania do grafik) i opcjonalnie `media` (podpisy i rozmiary).
3. Zmień tekst lub podmień plik w folderze `images` danego projektu. Nie zmieniaj nazw technicznych `slug` i kluczy grafik bez potrzeby. Miniaturę wskazuje `card.thumb`, duży nagłówek `case.hero`; mogą używać tej samej grafiki. Przy przejściu z tekstowej okładki usuń `card.cover` i `card.coverLabel`, ustaw `card.thumb`.
4. W GitHub Desktop zapisz commit, a potem kliknij Push origin. Każdy push do v2 aktualizuje prywatne projekty.
5. Na GitHubie w zakładce Actions sprawdź zielone zakończenie „Publish private portfolio”. Odśwież portfolio i odblokuj All projects dotychczasowym hasłem.

Grafiki PNG/JPG/WebP do 3 MB są przesyłane bajt w bajt, bez zmiany jakości. Tekst i struktura wszystkich projektów po odłączeniu grafik mają limit 2 MB. Przykładowych projektów nie dodajemy do portfolio.

## Ważne

Git jest źródłem treści. Zmiana w panelu właściciela może zostać zastąpiona kolejnym pushem — po uruchomieniu tej synchronizacji edytuj projekty w repozytorium. Panel nadal zarządza hasłami niezależnie. Usunięcie folderu nie usuwa opublikowanego projektu (ochrona przed przypadkowym usunięciem); usuwanie projektów wymaga osobnej operacji. Nie publikuj prywatnego repozytorium jako GitHub Pages ani publicznego folderu Netlify.

Pierwsza synchronizacja może trwać dłużej: przesyła wszystkie grafiki. Nie wymaga uruchomionego komputera po zakończeniu push. Błąd publikacji pozostawia poprzednią treść. Przerwane wgrywanie może pozostawić niepodpięte grafiki w magazynie. Nie włączamy płatnych usług: Actions korzysta z limitu Twojego planu GitHub; po wyczerpaniu bez płatnego budżetu synchronizacja nie zadziała. Netlify nadal korzysta z limitu istniejącego planu.
