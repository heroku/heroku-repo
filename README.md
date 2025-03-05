@heroku-cli/plugin-heroku-repo
==============================

Heroku Repo CLI Plugin

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage
```sh-session
$ heroku plugins:install @heroku-cli/plugin-heroku-repo
$ heroku repo:COMMAND
running command...
$ heroku repo --help [COMMAND]
USAGE
  $ heroku repo:COMMAND
...
```

# Commands
<!-- commands -->
* [`heroku repo:clone`](#heroku-repoclone)
* [`heroku repo:download [FILENAME]`](#heroku-repodownload-filename)
* [`heroku repo:gc`](#heroku-repogc)
* [`heroku repo:purge_cache`](#heroku-repopurge_cache)
* [`heroku repo:purge-cache`](#heroku-repopurge-cache)
* [`heroku repo:reset`](#heroku-reporeset)

## `heroku repo:clone`

clone the application repo to your local filesystem

```
USAGE
  $ heroku repo:clone -a <value> [-r <value>]

FLAGS
  -a, --app=<value>     (required) app to run command against
  -r, --remote=<value>  the git remote to use

DESCRIPTION
  clone the application repo to your local filesystem
```

_See code: [src/commands/repo/clone.ts](https://github.com/heroku/heroku-repo/blob/v1.0.14/src/commands/repo/clone.ts)_

## `heroku repo:download [FILENAME]`

download the application repo as a tarball

```
USAGE
  $ heroku repo:download [FILENAME] -a <value> [-r <value>]

ARGUMENTS
  FILENAME  a filename for the tarball

FLAGS
  -a, --app=<value>     (required) app to run command against
  -r, --remote=<value>  the git remote to use

DESCRIPTION
  download the application repo as a tarball
```

_See code: [src/commands/repo/download.ts](https://github.com/heroku/heroku-repo/blob/v1.0.14/src/commands/repo/download.ts)_

## `heroku repo:gc`

run a git gc --aggressive on an application's repository

```
USAGE
  $ heroku repo:gc -a <value> [-r <value>]

FLAGS
  -a, --app=<value>     (required) app to run command against
  -r, --remote=<value>  the git remote to use

DESCRIPTION
  run a git gc --aggressive on an application's repository
```

_See code: [src/commands/repo/gc.ts](https://github.com/heroku/heroku-repo/blob/v1.0.14/src/commands/repo/gc.ts)_

## `heroku repo:purge_cache`

delete the contents of the build cache in the repository

```
USAGE
  $ heroku repo:purge_cache -a <value> [-r <value>]

FLAGS
  -a, --app=<value>     (required) app to run command against
  -r, --remote=<value>  the git remote to use

DESCRIPTION
  delete the contents of the build cache in the repository

ALIASES
  $ heroku repo:purge_cache
```

## `heroku repo:purge-cache`

delete the contents of the build cache in the repository

```
USAGE
  $ heroku repo:purge-cache -a <value> [-r <value>]

FLAGS
  -a, --app=<value>     (required) app to run command against
  -r, --remote=<value>  the git remote to use

DESCRIPTION
  delete the contents of the build cache in the repository

ALIASES
  $ heroku repo:purge_cache
```

_See code: [src/commands/repo/purge-cache.ts](https://github.com/heroku/heroku-repo/blob/v1.0.14/src/commands/repo/purge-cache.ts)_

## `heroku repo:reset`

reset the repo

```
USAGE
  $ heroku repo:reset -a <value> [-r <value>]

FLAGS
  -a, --app=<value>     (required) app to run command against
  -r, --remote=<value>  the git remote to use

DESCRIPTION
  reset the repo
```

_See code: [src/commands/repo/reset.ts](https://github.com/heroku/heroku-repo/blob/v1.0.14/src/commands/repo/reset.ts)_
<!-- commandsstop -->
