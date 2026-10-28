---
title: 'PDFtk Cheat Sheet'
pubDate: 'Mar 18 2023'
tags: ['Cheat Sheets']
---

PDFtk is an open-source command-line tool for manipulating PDF documents, allowing users to merge, split, rotate, and encrypt PDFs, among other functions.

### Concatenate

```bash
pdftk in1.pdf in2.pdf in3.pdf cat output out_123.pdf
pdftk *.pdf cat output out.pdf
pdftk A=in1.pdf B=in2.pdf cat A B output out_12.pdf
```

### Interleave

```bash
pdftk A=odd.pdf B=even.pdf shuffle A B output collated.pdf
```

### Remove / Split

```bash
pdftk in.pdf cat 1-12 14-end output out.pdf
pdftk foo-bar.pdf cat 1-12 output foo.pdf
pdftk foo-bar.pdf cat 13-end output bar.pdf
pdftk foobar.pdf burst output foobar-%d.pdf
```

### Split Even/Odd

```bash
pdftk collated.pdf cat 1-endeven output even.pdf
pdftk collated.pdf cat 1-endodd output odd.pdf
```

### Rotate

```bash
pdftk in.pdf cat 1-endeast output out.pdf
```

### Extract

```bash
pdftk in.pdf cat 20 output out.pdf
```

### Edit Table of Contents

```bash
pdftk in.pdf dump_data > info.out
pdftk in.pdf update_info info.out output out.pdf
```

Edit info.out

```bash
...
NumberOfPages: 36
BookmarkBegin
BookmarkTitle: 01. Title
BookmarkLevel: 1
BookmarkPageNumber: 2
BookmarkBegin
BookmarkTitle: 02. Title
BookmarkLevel: 1
BookmarkPageNumber: 3
...
```

### References

- https://www.pdflabs.com/docs/pdftk-cli-examples/
- https://www.pdflabs.com/docs/pdftk-man-page/