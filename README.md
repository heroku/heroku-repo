# Heroku Repo plugin

This plugin adds some commands to the heroku gem to interact with the app's repo

## Installation

To install:

    $ heroku plugins:install https://github.com/heroku/heroku-repo.git

## Commands

### clone

    $ heroku repo:clone -a appname

This will clone the applications repo to your local filesystem. No collaboration necessary!

### download

    $ heroku repo:download -a appname

This will download the applications repo as a tarball.

### gc

    $ heroku repo:gc -a appname

This will run a `git gc --agressive` against the applications repo. This is done inside a run process on the application.

### purge_cache

    $ heroku repo:purge_cache -a appname

This will delete the contents of the build cache stored in the repository. This is done inside a run process on the application.

### rebuild

    $ heroku repo:rebuild -a appname

This will empty the remote repository and push the repository up again, effectively triggering an app rebuild.

### reset

    $ heroku repo:reset -a appname

This will empty the remote repository.
