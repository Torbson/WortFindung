default:
    @just --list

install:
    npm install

start:
    npx expo start --web --port 8081

docker-install:
    docker compose build

docker-start:
    docker compose up

docker-dev:
    docker compose up --build

docker-stop:
    docker compose down

clean:
    rm -rf node_modules dist .expo

build-web:
    npx expo export --platform web

deploy: build-web
    @echo "Static files in ./dist — deploy to GitHub Pages"
