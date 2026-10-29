---
title: 'git Cheat Sheet'
pubDate: 'Apr 22 2023'
tags: ['Cheat Sheets']
---

Git is a free, open-source distributed version control system designed to track changes in source code during software development.

### Setup

```bash
git config --global user.name "Christian M. Schmid"
git config --global user.email "xxxx@xxx.xxx"
git config --global color.ui auto`
```

### Initial Creation

```bash
git init
git remote add origin git@git.vs56.net:christian/NAME.git
...
git push --set-upstream origin main # First push of commits
```
```bash
git clone git@git.vs56.net:christian/NAME.git
```
<!--more-->
# Working Solo with One Branch

```bash
git add -A # Stage all files
git add FILENAME # Stage a file
git checkout FILENAME # Revert a file
git commit -m "MESSAGE" # Commit all staged changes
git push # push to main branch to origin
git push REMOTE BRANCH # push BRANCH to REMOTE
git pull
```

# Branching

```bash
git branch # Show branches
git branch new-branch # Create branch
git branch -m OLD_NAME NEW_NAME # Rename branch
git checkout -b NAME # Create and switch branch
```

# LFS

```bash
git lfs install
git lfs track "*.psd" "*.zip" # Track filetypes
git lfs track "path/to/dir/**" # Track directory
git lfs track "path/to/file.bin" # Track specific file
git add .gitattributes
```

```bash
# Migrate files already committed
git lfs migrate import --include="*.psd,*.zip" --everything
git lfs migrate import --include="path/to/dir/**" --everything
git lfs migrate import --include="path/to/file.bin" --everything
git push --force-with-lease
```

```bash
git lfs ls-files # Status
```

# Handcarry old Git to Forgejo

If you have a clone of the repo on the computer already:

```bash
git remote set-url me "git@git.vs56.net:/mnt/Vault/oldgit/NAME.git"
git pull me
git remote remove me
git branch -m master main
git remote add origin git@git.vs56.net:christian/NAME.git
git push --set-upstream origin main
```

If you want to carry it over

```bash
git clone "git@me.vs56.net:/mnt/Vault/oldgit/2019_09_18_Oma_Briefe.git"
git remote remove origin
git branch -m master main
git remote add "origin" ssh://git@home.vs56.net/christian/Omas-Briefe.git
git push --set-upstream origin main
```

### References

- https://education.github.com/git-cheat-sheet-education.pdf