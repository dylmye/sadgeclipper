# Changelog

## Version 1.1.1

### Notes
* Now following semantic versioning

### Bugfixes
* Token revocation / logout fixed - renamed variable that was named after a reserved keyword
* Use one CDN to simplify CSP
* Move logout scripts to a file for CSP
* Annotate logout scripts
* Added a meta description
* Updated license copyright line format
* Force reverify only if showDebug is true
* dayjs 1.9.5 -> 1.9.8

## Version 1.1.0

### Features
* Use LocalForage shim instead of localStorage for better browser support

### Bugfixes
* Fix logout page errors
