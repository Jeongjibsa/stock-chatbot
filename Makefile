SHELL := /bin/zsh
COMPOSE := docker compose

.PHONY: up down ps logs stack-up stack-down build typecheck lint format format-check test test-integration test-telegram verify compose-validate dev-api dev-bot dev-worker test-up test-down harness-check

up:
	$(COMPOSE) up -d postgres redis

down:
	$(COMPOSE) down --remove-orphans

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f

stack-up:
	$(COMPOSE) --profile app up -d --build

stack-down:
	$(COMPOSE) --profile app down --remove-orphans

build:
	pnpm build

lint:
	pnpm lint

format:
	pnpm format

format-check:
	pnpm format:check

test:
	pnpm test

test-integration:
	docker compose up -d --wait postgres
	RUN_INTEGRATION_TESTS=1 COREPACK_HOME=/tmp/corepack pnpm test:integration

test-telegram:
	COREPACK_HOME=/tmp/corepack pnpm test:telegram

typecheck:
	pnpm typecheck

verify: compose-validate
	pnpm verify

harness-check:
	pnpm harness:check

compose-validate:
	docker compose config -q
	docker compose --profile app config -q

dev-api:
	pnpm dev:api

dev-bot:
	pnpm dev:bot

dev-worker:
	pnpm dev:worker

test-up:
	$(COMPOSE) up -d postgres redis

test-down:
	$(COMPOSE) down --remove-orphans
