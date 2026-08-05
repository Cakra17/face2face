BUILD_DIR=.build/

.PHONY: run build clean

run:
	go run .

test:
	go test -v .

build:
	go build -o $(BUILD_DIR) .

clean:
	rm -rf $(BUILD_DIR)
