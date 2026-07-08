.PHONY: install dev build preview start check-types typecheck db-generate db-migrate db-studio

install:
	pnpm install

dev:
	pnpm dev

build:
	pnpm build

preview:
	pnpm preview

start:
	pnpm start

check-types:
	pnpm typecheck

typecheck:
	pnpm typecheck

db-generate:
	pnpm db:generate

db-migrate:
	pnpm db:migrate

db-studio:
	pnpm db:studio
