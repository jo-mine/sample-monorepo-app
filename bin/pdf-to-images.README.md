## usage
```bash
pdf-to-images {pdf-file-path} {dist-path}
```
### parameters
- pdf-file-path
  - required
  - file path to PDF to convert to images
- dist-path
  - optional (default: {cwd}/dist)
  - output folder path

### outputs
- {dist-path}/{file-name}_page{page-num}.png

## example
```
pwd # /app/bin
pdf-to-images /app/tmp/Book.pdf
# outputs /app/bin/dist/Book_page1.png, /app/bin/dist/Book_page2.png
```
