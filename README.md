# GraphQL Backend

Aplikacja backendowa oparta na GraphQL, zbudowana z wykorzystaniem Node.js, Express, Apollo Server i MongoDB.

## Funkcjonalności

- Rejestracja i logowanie użytkowników
- Tworzenie, edycja i usuwanie postów
- Komentowanie postów
- Polubienia postów i komentarzy
- Subskrypcje w czasie rzeczywistym
- Paginacja i sortowanie wyników

## Wymagania

- Node.js v14 lub nowszy
- MongoDB

## Instalacja

```bash
npm install
```

## Uruchomienie aplikacji
```bash
npm run dev
```

## Konfiguracja
Utwórz plik .env w katalogu głównym z następującymi zmiennymi:

```bash
DATABASE_URL=mongodb://localhost:27017/graphql_db
PORT=4000
SECRET_KEY=TwojSekretnyKlucz
REDIS_URL=redis://localhost:6379
```
