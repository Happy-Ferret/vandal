DOMAIN=$(shell cat DOMAIN)
DEBUG=$(shell cat DEBUG)

dir_guard=@mkdir -p $(@D)  # create the folder of the target if it doesn't exist
CLOSURECOMPILER=compiler.jar
ifeq ($(wildcard $(CLOSURECOMPILER)),)
	DEBUG=true
endif
BUILD=build
GOOUT=$(BUILD)/vandal
GOFILES=eventtype.go location.go main.go user.go messageslog.go utils.go
JSOUT=$(BUILD)/static/script.js
JSFILES=js/jscolor.js js/msgpack.js js/script.js
HTMLOUT=$(BUILD)/templates/index.html
HTMLFILES=templates/index.html

all: $(GOOUT) $(JSOUT) $(HTMLOUT) staticfiles

$(GOOUT): $(GOFILES)
	$(dir_guard)
	go build -o $(GOOUT) $(GOFILES)

$(HTMLOUT): $(HTMLFILES) DOMAIN
	$(dir_guard)
	sed 's/DOMAIN_PLACEHOLDER/'$(DOMAIN)'/g' $(HTMLFILES) > $(HTMLOUT)

$(JSOUT): $(JSFILES) DOMAIN DEBUG
	$(dir_guard)
ifeq ($(DEBUG),true)
	@echo "You sould get google closure-compiler from http://code.google.com/p/closure-compiler/"
	@echo "and put compiler.jar in this folder."
	@echo "I will only concatenate script files (no minifying)."
	cat $(JSFILES) > $(JSOUT)
else
	java -jar $(CLOSURECOMPILER) --js $(JSFILES) --compilation_level SIMPLE_OPTIMIZATIONS --js_output_file $(JSOUT)
endif
	sed -i 's/DOMAIN_PLACEHOLDER/'$(DOMAIN)'/g' $(JSOUT)

.PHONY: staticfiles

staticfiles:
	rsync -r static $(BUILD)/

mrproper:
	rm -rf $(BUILD)
