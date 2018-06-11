all: prod.zip

prod.zip: index.js LICENSE manifest.json
	zip prod.zip index.js LICENSE manifest.json
