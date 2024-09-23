
# GraphQL Backend - Social Media API

Backendowa aplikacja Social Media oparta na GraphQL, zbudowana z wykorzystaniem Node.js, Express, Apollo Server i MongoDB. Zapewnia funkcjonalności potrzebne do zarządzania postami, komentarzami, polubieniami i interakcjami w czasie rzeczywistym.

## Spis treści

- [Funkcjonalności](#funkcjonalności)
- [Technologie](#technologie)
- [Wymagania](#wymagania)
- [Instalacja](#instalacja)
- [Konfiguracja](#konfiguracja)
- [Przykłady zapytań GraphQL](#przykłady-zapytań-graphql)
- [Testowanie](#testowanie)
- [Dalszy rozwój](#dalszy-rozwój)
- [Autor](#autor)

## Funkcjonalności

- Rejestracja i logowanie użytkowników (z użyciem JWT)
- Tworzenie, edycja i usuwanie postów
- Komentowanie postów
- Polubienia postów i komentarzy
- Subskrypcje w czasie rzeczywistym (WebSocket/Apollo)
- Paginacja i sortowanie wyników
- Autoryzacja operacji na zasobach

## Technologie

- **Node.js** - JavaScript runtime
- **Express** - Framework do budowy API
- **Apollo Server** - Implementacja GraphQL na backendzie
- **MongoDB** - NoSQL baza danych do przechowywania danych użytkowników, postów i komentarzy
- **Redis** - Cache oraz mechanizm subskrypcji w czasie rzeczywistym
- **JWT** - Tokeny autoryzacyjne dla uwierzytelniania użytkowników

## Wymagania

- Node.js v14 lub nowszy
- MongoDB
- Redis (opcjonalnie do obsługi subskrypcji)

## Instalacja

Aby uruchomić aplikację lokalnie, wykonaj następujące kroki:

1. Sklonuj repozytorium:
   ```bash
   git clone https://github.com/MarcinPlaza1/social-media.git
   cd social-media
   ```

2. Zainstaluj zależności:
   ```bash
   npm install
   ```

## Konfiguracja

Przed uruchomieniem aplikacji, utwórz plik `.env` w katalogu głównym projektu z poniższymi zmiennymi:

```bash
DATABASE_URL=mongodb://localhost:27017/graphql_db
PORT=4000
SECRET_KEY=TwojSekretnyKlucz
REDIS_URL=redis://localhost:6379
```

## Uruchomienie aplikacji

Aby uruchomić aplikację w trybie deweloperskim, użyj komendy:

```bash
npm run dev
```

## Przykłady zapytań GraphQL

### Tworzenie użytkownika:

```graphql
mutation {
  registerUser(input: { username: "jan_kowalski", password: "haslo123" }) {
    token
    user {
      id
      username
    }
  }
}
```

### Dodanie posta:

```graphql
mutation {
  addPost(input: { title: "Pierwszy post", content: "To jest treść mojego pierwszego posta." }) {
    id
    title
    content
    createdAt
  }
}
```

### Subskrypcja nowych komentarzy:

```graphql
subscription {
  newComment(postId: "123") {
    id
    content
    author {
      username
    }
  }
}
```

## Testowanie

Aby uruchomić testy jednostkowe, użyj poniższej komendy (po zaimplementowaniu testów):

```bash
npm test
```

## Dalszy rozwój

Planowane funkcje w przyszłości:
- Resetowanie hasła
- Notyfikacje o nowych polubieniach i komentarzach
- Integracja z zewnętrznymi usługami, np. AWS S3 do przechowywania obrazów

## Autor

Projekt został stworzony przez [Marcin Plaza](https://github.com/MarcinPlaza1).
