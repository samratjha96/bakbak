---
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(grep:*)
description: Prime your context
---

Read README.md, THEN run git ls-files | grep -v -f (sed 's|^|^|; s|$|/|' .cursorignore | psub) to understand the context of the project
