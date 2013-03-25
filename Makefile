
all: install build

install:
	@echo install
	@npm install
	@./node_modules/.bin/component-install

build:
	@echo build
	@./node_modules/.bin/component-build


test: build
	./test/test-runner.sh

.PHONY: test build
