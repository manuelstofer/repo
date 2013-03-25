
all: install build

install:
	@echo install
	@npm install
	@./node_modules/.bin/component-install

build:
	@echo build
	@./node_modules/.bin/component-build


test: build
	@echo test in browser
	@./node_modules/mocha-phantomjs/bin/mocha-phantomjs http://localhost:2014/test/test-runner.html

.PHONY: test build
